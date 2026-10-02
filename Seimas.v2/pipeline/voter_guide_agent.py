"""VoterGuideAgent: Non-partisan, evidence-backed voter guidance engine (AGENTS.md).

Helps Lithuanian citizens evaluate how Seimas MP voting records, party positions,
and legislative bill activity align with personal policy priorities.
"""

from typing import Dict, Any, List, Optional
import os
import sys
import logging
import psycopg2
import psycopg2.extras

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("openseimas.pipeline.voter_guide")

TOPIC_LABELS_LT = {
    "bustas": "Būstas",
    "pajamos": "Pajamos ir mokesčiai",
    "sveikata": "Sveikata",
    "svietimas": "Švietimas ir kultūra",
    "aplinka": "Aplinka ir energetika",
    "saugumas": "Gynyba ir saugumas",
    "valdymas": "Teisė ir valstybė",
    "transportas": "Susisiekimas ir infrastruktūra",
}


class VoterGuideAgent:
    """Core non-partisan recommendation & guidance agent."""

    def __init__(self, dsn: Optional[str] = None):
        self.dsn = dsn or os.getenv("DB_DSN")

    def get_connection(self):
        if not self.dsn:
            raise ValueError("DB_DSN environment variable is not set")
        return psycopg2.connect(self.dsn)

    def evaluate_mp_alignment(
        self,
        mp_id: int,
        priority_topics: List[str],
        preferred_stances: Optional[Dict[str, str]] = None,
        limit_votes: int = 50,
    ) -> Dict[str, Any]:
        """
        Evaluate an MP's recorded voting history against user priority topics.

        Returns descriptive, factual evidence coverage breakdown (Charter §0, §1.3):
          - category: 'more_aligned' | 'mixed_record' | 'insufficient_data'
          - headline_lt: descriptive status string disclosing sample size and denominator
          - vote_breakdown: aligned, opposed, abstained, absent, total counts
          - evidence_coverage: directional_coverage_pct vs recorded_status_coverage_pct
          - bullet_reasons: 2–3 factual evidence snippets with embedded source URLs
          - sources: stable Seimas links to exact voting records
          - disclaimer_lt: explicit notice that this is a factual comparison, not voting advice
        """
        preferred_stances = preferred_stances or {}
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Get MP info
                cur.execute(
                    "SELECT id, display_name, current_party, seimas_mp_id FROM politicians WHERE seimas_mp_id = %s",
                    (mp_id,),
                )
                mp = cur.fetchone()
                if not mp:
                    return {
                        "error": f"Seimas MP ID {mp_id} not found",
                        "category": "insufficient_data",
                        "headline_lt": "Duomenų nerasta",
                        "vote_breakdown": {"aligned": 0, "opposed": 0, "abstained": 0, "absent": 0, "total_eligible": 0},
                        "evidence_coverage": {
                            "eligible_votes": 0,
                            "directional_classifiable_votes": 0,
                            "recorded_status_votes": 0,
                            "directional_coverage_pct": 0.0,
                            "recorded_status_coverage_pct": 0.0,
                        },
                        "bullet_reasons": ["Seimo narys nerastas duomenų bazėje."],
                        "explanation_lt": "Nepavyko rasti nurodyto Seimo nario įrašų.",
                        "sources": [],
                        "disclaimer_lt": "Tai yra ribotas faktinių balsavimų sulyginimas, o ne balsavimo rekomendacija.",
                        "suggested_next_step": "Pasirinkti kitą Seimo narį",
                    }

                politician_uuid = mp["id"]
                mp_name = mp["display_name"]
                party_name = mp["current_party"] or "Nefrakcinis"

                # Fetch votes matching priority topics
                cur.execute(
                    """
                    SELECT v.id as vote_id, v.seimas_vote_id, v.sitting_date, v.title,
                           mv.vote_choice, vt.topic
                    FROM mp_votes mv
                    JOIN votes v ON (mv.vote_id = v.id OR mv.vote_id = v.seimas_vote_id)
                    JOIN vote_topics vt ON vt.vote_id = v.seimas_vote_id
                    WHERE mv.politician_id = %s::uuid
                      AND vt.topic = ANY(%s)
                    ORDER BY v.sitting_date DESC NULLS LAST
                    LIMIT %s
                    """,
                    (politician_uuid, priority_topics, limit_votes),
                )
                votes = cur.fetchall()

                if not votes:
                    return {
                        "mp_id": mp_id,
                        "mp_name": mp_name,
                        "party": party_name,
                        "category": "insufficient_data",
                        "headline_lt": f"{mp_name}: Nepakanka duomenų išvadoms (0 galimų balsavimų)",
                        "vote_breakdown": {"aligned": 0, "opposed": 0, "abstained": 0, "absent": 0, "total_eligible": 0},
                        "evidence_coverage": {
                            "eligible_votes": 0,
                            "directional_classifiable_votes": 0,
                            "recorded_status_votes": 0,
                            "directional_coverage_pct": 0.0,
                            "recorded_status_coverage_pct": 0.0,
                        },
                        "bullet_reasons": [
                            "Pasirinktomis temomis nerasta užfiksuotų vardinių balsavimų įrašų.",
                        ],
                        "explanation_lt": "Šioje temų srityje nėra pakankamai užfiksuotų vardinių balsavimų duomenų.",
                        "sources": [],
                        "disclaimer_lt": "Tai yra ribotas faktinių balsavimų sulyginimas, o ne balsavimo rekomendacija.",
                        "suggested_next_step": "Skaityti bendrą politiko profilio apžvalgą",
                    }

                # Evaluate alignment with explicit breakdown
                aligned_count = 0
                opposed_count = 0
                abstained_count = 0
                absent_count = 0
                unverified_count = 0

                aligned_bullets = []
                opposed_bullets = []
                neutral_bullets = []
                sources = []

                for row in votes:
                    topic = row["topic"]
                    topic_label = TOPIC_LABELS_LT.get(topic, topic)
                    user_pref = preferred_stances.get(topic, "for")
                    mp_choice = row["vote_choice"]
                    title = row["title"]
                    date_str = str(row["sitting_date"]) if row["sitting_date"] else "Nenurodyta data"
                    seimas_vote_id = row["seimas_vote_id"]

                    # Construct stable Seimas link
                    source_url = f"https://www.lrs.lt/sip/portal.show?p_r=35381&p_k=1&p_bals_id={seimas_vote_id}" if seimas_vote_id else "https://www.lrs.lt"

                    # Explicit breakdown: abstentions and absences tracked separately
                    choice_desc = f"balsavo „{mp_choice}“" if mp_choice else "nedalyvavo balsavime"
                    bullet_item = f"Balsavimas dėl „{title}“ ({date_str}): {choice_desc}. [Šaltinis: {source_url}]"

                    if mp_choice == "Už":
                        if user_pref == "for":
                            aligned_count += 1
                            aligned_bullets.append(bullet_item)
                        else:
                            opposed_count += 1
                            opposed_bullets.append(bullet_item)
                    elif mp_choice == "Prieš":
                        if user_pref == "against":
                            aligned_count += 1
                            aligned_bullets.append(bullet_item)
                        else:
                            opposed_count += 1
                            opposed_bullets.append(bullet_item)
                    elif mp_choice == "Susilaikė":
                        abstained_count += 1
                        neutral_bullets.append(bullet_item)
                    elif mp_choice is None or mp_choice == "" or mp_choice == "Nedalyvavo":
                        absent_count += 1
                        neutral_bullets.append(bullet_item)
                    else:
                        unverified_count += 1
                        neutral_bullets.append(bullet_item)

                    sources.append(
                        {
                            "vote_id": str(row["vote_id"]),
                            "seimas_vote_id": seimas_vote_id,
                            "title": title,
                            "date": date_str,
                            "choice": mp_choice or "Nedalyvavo",
                            "topic": topic_label,
                            "source_url": source_url,
                        }
                    )

                # Balanced evidence selection (no cherry-picking):
                evidence_bullets = []
                if aligned_bullets:
                    evidence_bullets.append(aligned_bullets.pop(0))
                if opposed_bullets:
                    evidence_bullets.append(opposed_bullets.pop(0))
                if neutral_bullets:
                    evidence_bullets.append(neutral_bullets.pop(0))
                # Fill remaining slots up to 3 from any pool
                remaining_pool = aligned_bullets + opposed_bullets + neutral_bullets
                while len(evidence_bullets) < 3 and remaining_pool:
                    evidence_bullets.append(remaining_pool.pop(0))

                total_eligible = len(votes)
                directional_classifiable = aligned_count + opposed_count
                recorded_status = aligned_count + opposed_count + abstained_count

                alignment_pct = round((aligned_count / directional_classifiable * 100.0), 1) if directional_classifiable > 0 else 0.0
                directional_coverage_pct = round((directional_classifiable / total_eligible * 100.0), 1) if total_eligible > 0 else 0.0
                recorded_coverage_pct = round((recorded_status / total_eligible * 100.0), 1) if total_eligible > 0 else 0.0

                # Determine descriptive category and headline with complete sample size disclosure
                if directional_classifiable < 3:
                    category = "insufficient_data"
                    headline = f"{mp_name}: Nepakanka duomenų išvadoms (palyginti buvo galima tik {directional_classifiable} iš {total_eligible} galimų balsavimų)"
                    explanation = f"Iš {total_eligible} galimų balsavimų tik {directional_classifiable} turėjo aiškią „Už“ / „Prieš“ poziciją pasirinktais klausimais."
                    next_step = "Skaityti įstatymų projektų tekstus ir komiteto ataskaitas"
                elif aligned_count > opposed_count:
                    category = "more_aligned"
                    headline = f"{mp_name}: {aligned_count} iš {directional_classifiable} palyginamų balsavimų sutapo (palyginti buvo galima {directional_classifiable} iš {total_eligible} galimų balsavimų)"
                    explanation = f"Pasirinktomis temomis Seimo nario {mp_name} užfiksuoti balsavimai „Už“ / „Prieš“ dažniau sutapo su jūsų pasirinkta kryptimi ({aligned_count} iš {directional_classifiable} palyginamų balsavimų)."
                    next_step = "Skaityti išsamią komiteto kalbų ir stenogramų ataskaitą"
                else:
                    category = "mixed_record"
                    headline = f"{mp_name}: Nevienareikšmiai balsavimo duomenys ({aligned_count} iš {directional_classifiable} palyginamų balsavimų sutapo; palyginti buvo galima {directional_classifiable} iš {total_eligible} galimų balsavimų)"
                    explanation = f"Seimo nario {mp_name} balsavimai pasirinktomis temomis yra nevienalytiniai arba turėjo daug susilaikymo / nedalyvavimo atvejų."
                    next_step = "Palyginti su kitų Seimo narių užfiksuotais balsavimais"

                return {
                    "mp_id": mp_id,
                    "mp_name": mp_name,
                    "party": party_name,
                    "category": category,
                    "alignment_pct": alignment_pct,
                    "scope_note_lt": "Vertinami tik individualūs užfiksuoti Seimo nario balsavimai, o ne visos frakcijos ar partijos programa.",
                    "methodology_note_lt": "Temos ir balsavimai susieti pagal oficialią Seimo teisėkūros klasifikaciją (vote_topics), o vartotojo pasirinkimai lyginami su faktiniais „Už“ / „Prieš“ balsavimais.",
                    "vote_breakdown": {
                        "aligned": aligned_count,
                        "opposed": opposed_count,
                        "abstained": abstained_count,
                        "absent": absent_count,
                        "unverified": unverified_count,
                        "total_eligible": total_eligible,
                    },
                    "evidence_coverage": {
                        "eligible_votes": total_eligible,
                        "directional_classifiable_votes": directional_classifiable,
                        "recorded_status_votes": recorded_status,
                        "directional_coverage_pct": directional_coverage_pct,
                        "recorded_status_coverage_pct": recorded_coverage_pct,
                    },
                    "headline_lt": headline,
                    "bullet_reasons": evidence_bullets,
                    "explanation_lt": explanation,
                    "sources": sources[:5],
                    "disclaimer_lt": "Tai yra ribotas faktinių balsavimų sulyginimas, o ne balsavimo rekomendacija.",
                    "suggested_next_step": next_step,
                }
        finally:
            conn.close()


def main(args: Optional[List[str]] = None) -> int:
    """CLI runner entrypoint for VoterGuideAgent."""
    import argparse

    parser = argparse.ArgumentParser(description="VoterGuideAgent Non-Partisan Evidence Comparison")
    parser.add_argument("--topics", default="pajamos,saugumas", help="Comma-separated topic slugs")
    parser.add_argument("--mp", type=int, default=79145, help="Seimas MP ID to evaluate")
    parser.add_argument("--stance", default="for", choices=["for", "against"], help="Preferred stance for topics")

    parsed_args = parser.parse_args(args)
    topics = [t.strip() for t in parsed_args.topics.split(",") if t.strip()]
    stances = {t: parsed_args.stance for t in topics}

    agent = VoterGuideAgent()
    result = agent.evaluate_mp_alignment(mp_id=parsed_args.mp, priority_topics=topics, preferred_stances=stances)

    print("=== OpenSeimas Non-Partisan Evidence Comparison ===")
    print(f"MP Name: {result.get('mp_name')} ({result.get('party')})")
    print(f"Status Category: {result.get('category')}")
    print(f"Headline: {result.get('headline_lt')}")
    print(f"Explanation: {result.get('explanation_lt')}")
    bd = result.get("vote_breakdown", {})
    ec = result.get("evidence_coverage", {})
    print(f"Vote Breakdown: {bd.get('aligned')} aligned, {bd.get('opposed')} opposed, {bd.get('abstained')} abstained, {bd.get('absent')} absent, {bd.get('unverified', 0)} unverified (Total: {bd.get('total_eligible')})")
    print(f"Coverage: {ec.get('directional_classifiable_votes')}/{ec.get('eligible_votes')} directional ({ec.get('directional_coverage_pct')}%), {ec.get('recorded_status_votes')}/{ec.get('eligible_votes')} status recorded ({ec.get('recorded_status_coverage_pct')}%)")
    print(f"Scope Note: {result.get('scope_note_lt')}")
    print(f"Methodology: {result.get('methodology_note_lt')}")
    print(f"Disclaimer: {result.get('disclaimer_lt')}")
    print("\nEvidence Bullet Snippets:")
    for b in result.get("bullet_reasons", []):
        print(f"  • {b}")
    print(f"\nNext Step: {result.get('suggested_next_step')}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

