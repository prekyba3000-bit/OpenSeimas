#!/usr/bin/env python3
"""Diary freshness clock: baseline now, compare later.

The question the MP-diary design note left open is not "does the diary grow" —
of course it does — but "are settled entries rewritten upstream". Those need
different tests, so this hashes them separately:

  full_sha256     every event. Changes whenever anything is added. Uninformative
                  on its own.
  settled_sha256  only events that ended more than SETTLED_DAYS ago. Appending
                  tomorrow's meeting cannot change it. If it moves between two
                  runs, the past was edited, and that is the finding.

Read-only against LRS and against our database. Writes one JSON baseline file;
nothing touches a table. Run again later with --compare <file>.

    ./scripts/diary_baseline.py                       # write a baseline
    ./scripts/diary_baseline.py --compare docs/reviews/diary-baseline-*.json
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2  # noqa: E402
import psycopg2.extras  # noqa: E402

from utils import fetch_with_retry  # noqa: E402

BASE = "https://apps.lrs.lt/sip/p2b.ad_sn_darbotvarkes"
# Do not append kadencijos_id: these endpoints answer an unsupported parameter
# with a path-level 404, which reads as a dead feed. See the source-map review.
SETTLED_DAYS = 7
EVENT_RE = re.compile(r'<SeimoNarioDarbotvarkėsĮvykis\s([^>]*?)/?>')
ATTR_RE = re.compile(r'([\wĀ-ſ_]+)="([^"]*)"')


def parse_events(payload: bytes):
    text = payload.decode("utf-8", "replace")
    out = []
    for raw in EVENT_RE.findall(text):
        attrs = dict(ATTR_RE.findall(raw))
        out.append({
            "pradzia": attrs.get("pradžia", ""),
            "pabaiga": attrs.get("pabaiga", ""),
            "vieta": attrs.get("vieta", ""),
            "pavadinimas": attrs.get("pavadinimas", ""),
        })
    return out


def fingerprint(events):
    """Order-independent hash: the feed's row order is not a promise."""
    lines = sorted(
        f"{e['pradzia']}|{e['pabaiga']}|{e['vieta']}|{e['pavadinimas']}" for e in events
    )
    return hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()


def settled(events, cutoff: datetime.date):
    keep = []
    for e in events:
        stamp = (e["pabaiga"] or e["pradzia"] or "")[:10]
        try:
            if datetime.date.fromisoformat(stamp) < cutoff:
                keep.append(e)
        except ValueError:
            continue
    return keep


def collect(members, cutoff=None):
    """Read every diary and hash it.

    `cutoff` must be supplied when comparing against a baseline: the settled
    window moves with the calendar, so hashing today's events at today's cutoff
    and comparing to a baseline hashed at an older one compares two different
    sets of events. Every diary would then look rewritten simply because time
    passed — which is exactly what the first comparison run reported.
    """
    if cutoff is None:
        cutoff = datetime.date.today() - datetime.timedelta(days=SETTLED_DAYS)
    rows = {}
    for i, m in enumerate(members):
        mp = str(m["seimas_mp_id"])
        try:
            payload = fetch_with_retry(f"{BASE}?asmens_id={mp}", timeout=30).content
        except Exception as exc:  # noqa: BLE001 — an unreachable member is unknown, not empty
            rows[mp] = {"name": m["display_name"], "error": f"{type(exc).__name__}"}
            continue
        events = parse_events(payload)
        past = settled(events, cutoff)
        rows[mp] = {
            "name": m["display_name"],
            "events": len(events),
            "settled_events": len(past),
            "full_sha256": fingerprint(events),
            "settled_sha256": fingerprint(past),
        }
        if (i + 1) % 40 == 0:
            print(f"    {i+1}/{len(members)}…")
        time.sleep(0.12)
    return {
        "captured_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "settled_days": SETTLED_DAYS,
        "settled_cutoff": cutoff.isoformat(),
        "members": rows,
    }


def compare(old, new):
    o, n = old["members"], new["members"]
    rewritten, grew, unchanged, vanished, errored = [], [], [], [], []
    for mp, before in o.items():
        after = n.get(mp)
        if after is None:
            vanished.append(mp); continue
        if "error" in before or "error" in after:
            errored.append(mp); continue
        if before["settled_sha256"] != after["settled_sha256"]:
            rewritten.append((mp, before, after))
        elif before["full_sha256"] != after["full_sha256"]:
            grew.append(mp)
        else:
            unchanged.append(mp)
    print(f"  baseline {old['captured_at'][:19]}  ->  now {new['captured_at'][:19]}")
    print(f"    settled past REWRITTEN : {len(rewritten)}")
    print(f"    grew (new events only) : {len(grew)}")
    print(f"    unchanged              : {len(unchanged)}")
    print(f"    unreadable either side : {len(errored)}")
    print(f"    absent now             : {len(vanished)}")
    for mp, b, a in rewritten[:10]:
        print(f"      {b['name'][:30]:32} settled {b['settled_events']} -> {a['settled_events']}")
    if rewritten:
        print("\n  Settled entries changed. The diary is not append-only, so any ingest"
              "\n  needs re-fetch and reconcile, not insert-once.")
    else:
        print("\n  No settled entry changed. Append-only holds so far on this evidence.")
    return 1 if rewritten else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--compare", metavar="BASELINE_JSON")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    dsn = os.getenv("DB_DSN")
    if not dsn:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2
    # Validated before the 140 fetches, not after. The first comparison run
    # spent four minutes reading every diary and then died on a missing file,
    # which is a waste of our time and of lrs.lt's.
    if args.compare and not os.path.exists(args.compare):
        print(f"ERROR: baseline not found: {args.compare}", file=sys.stderr)
        return 2
    conn = psycopg2.connect(dsn)
    conn.set_session(readonly=True)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT seimas_mp_id, display_name FROM politicians "
                    "WHERE is_active AND seimas_mp_id IS NOT NULL ORDER BY seimas_mp_id")
        members = cur.fetchall()
    conn.close()

    baseline = None
    compare_cutoff = None
    if args.compare:
        with open(args.compare, encoding="utf-8") as fh:
            baseline = json.load(fh)
        # Hash today's events against the cutoff the baseline used, so the two
        # sides describe the same window.
        compare_cutoff = datetime.date.fromisoformat(baseline["settled_cutoff"])
        print(f"  comparing at the baseline's cutoff {compare_cutoff} "
              f"(not today's), so both sides cover the same events")

    print(f"  reading diaries for {len(members)} active members…")
    snapshot = collect(members, compare_cutoff)
    ok = [r for r in snapshot["members"].values() if "error" not in r]
    print(f"  read {len(ok)}/{len(members)}; "
          f"{sum(r['events'] for r in ok)} events, "
          f"{sum(r['settled_events'] for r in ok)} settled")

    if args.compare:
        return compare(baseline, snapshot)

    out = args.out or ("docs/reviews/diary-baseline-"
                       f"{datetime.date.today().isoformat()}.json")
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", out)
    path = os.path.normpath(path)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"  baseline written: {out}")
    print(f"  re-run later:  ./scripts/diary_baseline.py --compare {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
