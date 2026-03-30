"""
analysis/benford_engine.py

Engine 02: Benford's Law Financial Declaration Forensics

Tests whether the leading-digit distribution of an MP's self-reported
wealth declaration values conforms to the expected Benford distribution.
Non-conforming distributions indicate fabricated/rounded values.
"""

import math
from datetime import datetime
from collections import Counter

import numpy as np
from scipy import stats as sp_stats
from loguru import logger

from storage.db import get_session, MP, WealthDeclaration, BenfordAnalysis


BENFORD_EXPECTED = {
    1: 0.30103,
    2: 0.17609,
    3: 0.12494,
    4: 0.09691,
    5: 0.07918,
    6: 0.06695,
    7: 0.05799,
    8: 0.05115,
    9: 0.04576,
}

MIN_SAMPLE_SIZE = 15

# Nigrini's MAD thresholds for first-digit tests
MAD_CONFORMING = 0.006
MAD_ACCEPTABLE = 0.012
MAD_MARGINAL = 0.015

NUMERIC_FIELDS = [
    "real_estate_value",
    "vehicles_value",
    "financial_assets",
    "business_stakes_value",
    "declared_income",
    "total_declared_assets",
    "salary_from_seimas",
]


def _leading_digit(value: float) -> int | None:
    """Extract the first non-zero digit of a number."""
    if value is None or value == 0:
        return None
    abs_val = abs(value)
    digit = int(str(abs_val).lstrip("0").lstrip(".").lstrip("0")[:1] or "0")
    return digit if 1 <= digit <= 9 else None


def _compute_mad(observed: dict[int, float]) -> float:
    """Mean Absolute Deviation from Benford expected distribution."""
    deviations = []
    for d in range(1, 10):
        deviations.append(abs(observed.get(d, 0.0) - BENFORD_EXPECTED[d]))
    return sum(deviations) / 9


def run_benford_analysis() -> int:
    """
    For each MP with sufficient declaration data, extract all numeric
    values, compute first-digit distribution, chi-squared test, and MAD.

    Returns number of MPs analyzed.
    """
    analyzed = 0

    with get_session() as db:
        mps = db.query(MP).all()

        for mp in mps:
            declarations = db.query(WealthDeclaration).filter(
                WealthDeclaration.mp_id == mp.id
            ).all()

            values = []
            per_field_values: dict[str, list[float]] = {f: [] for f in NUMERIC_FIELDS}

            for decl in declarations:
                for field in NUMERIC_FIELDS:
                    val = getattr(decl, field, None)
                    if val is not None and val != 0:
                        values.append(val)
                        per_field_values[field].append(val)

            if len(values) < MIN_SAMPLE_SIZE:
                continue

            digits = [_leading_digit(v) for v in values]
            digits = [d for d in digits if d is not None]

            if len(digits) < MIN_SAMPLE_SIZE:
                continue

            digit_counts = Counter(digits)
            total = len(digits)

            observed_freq = np.array([digit_counts.get(d, 0) for d in range(1, 10)], dtype=float)
            expected_freq = np.array([BENFORD_EXPECTED[d] * total for d in range(1, 10)])

            chi2, p_value = sp_stats.chisquare(observed_freq, f_exp=expected_freq)

            observed_pct = {d: digit_counts.get(d, 0) / total for d in range(1, 10)}
            mad = _compute_mad(observed_pct)

            if mad <= MAD_CONFORMING:
                label = "conforming"
            elif mad <= MAD_ACCEPTABLE:
                label = "acceptable"
            elif mad <= MAD_MARGINAL:
                label = "marginal"
            else:
                label = "non-conforming"

            # Identify which fields deviate most
            flagged = []
            for field, field_vals in per_field_values.items():
                if len(field_vals) < 3:
                    continue
                field_digits = [_leading_digit(v) for v in field_vals]
                field_digits = [d for d in field_digits if d is not None]
                if not field_digits:
                    continue
                field_counts = Counter(field_digits)
                field_total = len(field_digits)
                field_pct = {d: field_counts.get(d, 0) / field_total for d in range(1, 10)}
                field_mad = _compute_mad(field_pct)
                if field_mad > MAD_MARGINAL:
                    flagged.append({"field": field, "mad": round(field_mad, 4)})

            digit_dist = {str(d): round(observed_pct.get(d, 0), 4) for d in range(1, 10)}

            existing = db.query(BenfordAnalysis).filter_by(mp_id=mp.id).first()
            if existing:
                existing.sample_size = total
                existing.chi_squared = round(float(chi2), 4)
                existing.p_value = round(float(p_value), 6)
                existing.mad = round(mad, 5)
                existing.digit_distribution = digit_dist
                existing.conformity_label = label
                existing.flagged_fields = flagged
                existing.computed_at = datetime.utcnow()
            else:
                analysis = BenfordAnalysis(
                    mp_id=mp.id,
                    sample_size=total,
                    chi_squared=round(float(chi2), 4),
                    p_value=round(float(p_value), 6),
                    mad=round(mad, 5),
                    digit_distribution=digit_dist,
                    conformity_label=label,
                    flagged_fields=flagged,
                    computed_at=datetime.utcnow(),
                )
                db.add(analysis)

            analyzed += 1

        db.commit()

    logger.info(f"Benford analysis: {analyzed} MPs tested")
    return analyzed
