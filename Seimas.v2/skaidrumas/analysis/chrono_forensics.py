"""
analysis/chrono_forensics.py

Engine 01: Amendment Temporal Fingerprinting

Detects pre-drafted amendments by computing the drafting window
(time between bill tabling and amendment submission) and comparing it
to each MP's baseline. Uses z-score normalization and DBSCAN to detect
coordinated multi-MP bursts from external drafting sources.
"""

import re
from datetime import datetime
from collections import defaultdict

import numpy as np
from scipy import stats as sp_stats
from sklearn.cluster import DBSCAN
from loguru import logger
from sqlalchemy import and_

from storage.db import get_session, Amendment, AmendmentProfile, MP


_CITATION_PATTERN = re.compile(
    r'\b(?:straipsn|įstatym|direktyv|nutarim|Nr\.\s*\w+)', re.IGNORECASE
)


def _compute_complexity(word_count: int, citation_count: int) -> float:
    """Weighted complexity: words contribute linearly, citations amplify."""
    return word_count + citation_count * 15.0


def run_chrono_analysis() -> int:
    """
    For each amendment with text, compute its temporal profile,
    z-score against the proposer's own baseline, and run DBSCAN
    on same-bill clusters.

    Returns the number of profiles written.
    """
    written = 0

    with get_session() as db:
        amendments = db.query(Amendment).filter(
            Amendment.amendment_text.isnot(None),
            Amendment.proposed_at.isnot(None),
        ).all()

        if not amendments:
            logger.info("Chrono-forensics: no amendments to analyze")
            return 0

        mp_amendments: dict[int, list] = defaultdict(list)
        for a in amendments:
            if a.proposer_mp_id is not None:
                mp_amendments[a.proposer_mp_id].append(a)

        for mp_id, mp_amends in mp_amendments.items():
            windows = []
            profiles_data = []

            for a in mp_amends:
                text = a.amendment_text or ""
                word_count = len(text.split())
                citation_count = len(_CITATION_PATTERN.findall(text))
                complexity = _compute_complexity(word_count, citation_count)
                drafting_window = a.lead_time_minutes

                profiles_data.append({
                    "amendment": a,
                    "word_count": word_count,
                    "citation_count": citation_count,
                    "complexity": complexity,
                    "drafting_window": drafting_window,
                })

                if drafting_window is not None and drafting_window > 0:
                    windows.append(drafting_window)

            if len(windows) < 3:
                continue

            window_arr = np.array(windows, dtype=float)
            median_window = float(np.median(window_arr))
            std_window = float(np.std(window_arr))
            if std_window < 1.0:
                std_window = 1.0

            for pd_item in profiles_data:
                a = pd_item["amendment"]
                dw = pd_item["drafting_window"]

                zscore = None
                if dw is not None and dw > 0:
                    zscore = (dw - median_window) / std_window

                existing = db.query(AmendmentProfile).filter_by(
                    amendment_id=a.amendment_id
                ).first()

                if existing:
                    existing.word_count = pd_item["word_count"]
                    existing.legal_citation_count = pd_item["citation_count"]
                    existing.complexity_score = pd_item["complexity"]
                    existing.drafting_window_minutes = dw
                    existing.speed_anomaly_zscore = zscore
                    existing.computed_at = datetime.utcnow()
                else:
                    profile = AmendmentProfile(
                        amendment_id=a.amendment_id,
                        word_count=pd_item["word_count"],
                        legal_citation_count=pd_item["citation_count"],
                        complexity_score=pd_item["complexity"],
                        drafting_window_minutes=dw,
                        speed_anomaly_zscore=zscore,
                        computed_at=datetime.utcnow(),
                    )
                    db.add(profile)
                written += 1

        db.commit()

        # DBSCAN clustering: group amendments by (bill_id, proposed_at_epoch)
        # to detect coordinated bursts across MPs on the same bill
        bill_groups: dict[str, list] = defaultdict(list)
        all_profiles = db.query(AmendmentProfile).join(Amendment).all()

        for profile in all_profiles:
            amend = db.query(Amendment).filter_by(
                amendment_id=profile.amendment_id
            ).first()
            if amend and amend.proposed_at and amend.bill_id:
                bill_groups[amend.bill_id].append({
                    "profile": profile,
                    "epoch": amend.proposed_at.timestamp(),
                    "mp_id": amend.proposer_mp_id,
                })

        cluster_id_counter = 1
        for bill_id, items in bill_groups.items():
            if len(items) < 2:
                continue

            epochs = np.array([[item["epoch"]] for item in items])
            # eps=5400 = 90 minutes in seconds
            clustering = DBSCAN(eps=5400, min_samples=2).fit(epochs)

            for i, label in enumerate(clustering.labels_):
                if label >= 0:
                    items[i]["profile"].cluster_id = cluster_id_counter + label

            if any(l >= 0 for l in clustering.labels_):
                cluster_id_counter += max(clustering.labels_) + 1

        db.commit()

    logger.info(f"Chrono-forensics: {written} amendment profiles computed")
    return written
