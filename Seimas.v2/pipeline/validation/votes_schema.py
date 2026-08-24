"""Boundary validation for the votes payload.

Validation happens where parsed records become rows, not deeper. A record that
fails is quarantined with the original intact — the thing that broke the parser
is the only evidence of how the feed changed, and dropping it destroys that.

Drift is classified, not merely detected:

    added column                 -> warn, batch proceeds
    missing or renamed column    -> block the batch
    type failure on a column     -> block the batch

The asymmetry is deliberate. A new column the parser ignores costs nothing. A
column that vanished means every downstream value derived from it is now absent
or wrong, and continuing would write that silence into the database.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pandas as pd
import pandera.pandas as pa
from pandera.typing import Series

PARSER_VERSION = "votes-1"

# The stored domain. 'Nedalyvavo' is deliberately absent: absence is how a
# non-vote is represented, and 54.9% of production rows carry a null choice
# for the 1,653 votes LRS publishes without per-member results.
VOTE_CHOICES = ("Už", "Prieš", "Susilaikė")


class VotesPayloadSchema(pa.DataFrameModel):
    seimas_vote_id: Series[int] = pa.Field(nullable=False, ge=1)
    politician_seimas_id: Series[int] = pa.Field(nullable=False, ge=1)
    # Nullable on purpose. This is the unpublished state, not a defect.
    vote_choice: Series[str] = pa.Field(nullable=True, isin=VOTE_CHOICES)
    sitting_date: Series[pd.Timestamp] = pa.Field(nullable=False)

    class Config:
        # strict rejects unexpected columns, which is what surfaces a rename:
        # the new name arrives as unexpected while the old one goes missing.
        strict = True
        coerce = True


def classify_drift(payload_columns: List[str]) -> Tuple[str, List[str]]:
    """Compare incoming columns to the model. Returns (verdict, notes)."""
    expected = set(VotesPayloadSchema.to_schema().columns)
    actual = set(payload_columns)
    missing = sorted(expected - actual)
    added = sorted(actual - expected)

    notes = []
    if missing:
        notes.append(f"missing or renamed: {', '.join(missing)}")
    if added:
        notes.append(f"added: {', '.join(added)}")

    # A rename shows up as both sides at once; either half alone is enough to
    # block, because a missing column cannot be compensated for downstream.
    if missing:
        return "block", notes
    if added:
        return "warn", notes
    return "ok", notes


def validate(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Partition records into clean and quarantined.

    Never raises on bad data — a payload that fails validation is an outcome to
    record, not an exception to crash the ingest.
    """
    frame = pd.DataFrame(records)
    verdict, notes = classify_drift(list(frame.columns))
    result: Dict[str, Any] = {
        "drift": verdict, "drift_notes": notes,
        "clean": [], "quarantine": [], "parser_version": PARSER_VERSION,
    }
    if verdict == "block":
        # The whole batch is held. Partitioning row-by-row against a schema the
        # payload no longer matches would quarantine every row and call a
        # structural change a data problem.
        result["quarantine"] = [
            {"record": rec, "reason": "; ".join(notes),
             "column": None, "check": "schema_drift"}
            for rec in records
        ]
        return result

    try:
        VotesPayloadSchema.validate(frame, lazy=True)
        result["clean"] = records
        return result
    except pa.errors.SchemaErrors as exc:
        cases = exc.failure_cases
        bad_index = set()
        reasons: Dict[int, Dict[str, Any]] = {}
        for _, row in cases.iterrows():
            idx = row.get("index")
            if idx is None or (isinstance(idx, float) and pd.isna(idx)):
                continue
            idx = int(idx)
            bad_index.add(idx)
            reasons.setdefault(idx, {
                "column": row.get("column"),
                "check": str(row.get("check")),
                "reason": f"{row.get('column')}: {row.get('check')} "
                          f"(got {row.get('failure_case')!r})",
            })
        result["clean"] = [r for i, r in enumerate(records) if i not in bad_index]
        result["quarantine"] = [
            {"record": records[i], "reason": reasons[i]["reason"],
             "column": reasons[i]["column"], "check": reasons[i]["check"]}
            for i in sorted(bad_index)
        ]
        return result


def persist_quarantine(conn, source: str, rows: List[Dict[str, Any]],
                       batch_id: str = None, manifest_id=None) -> int:
    """Append quarantined records. Returns how many were stored."""
    import json
    if not rows:
        return 0
    with conn.cursor() as cur:
        for row in rows:
            cur.execute(
                """
                INSERT INTO quarantine_rows
                    (source, batch_id, original_record, failure_reason,
                     failure_column, failure_check, parser_version, manifest_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (source, batch_id, json.dumps(row["record"], default=str, ensure_ascii=False),
                 row["reason"], row.get("column"), row.get("check"),
                 PARSER_VERSION, manifest_id),
            )
    conn.commit()
    return len(rows)
