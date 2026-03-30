"""
analysis/phantom_network.py

Engine 04: Corporate Shell Detection

Builds a directed graph from ownership_edges, then BFS-traverses
2-3 hops from each MP's known business links to discover indirect
corporate chains that connect to procurement awards or tax debtors.
"""

from datetime import datetime, date, timedelta
from collections import defaultdict, deque

import networkx as nx
from rapidfuzz import fuzz
from loguru import logger
from sqlalchemy import and_, or_

from storage.db import (
    get_session, MP, BusinessLink, LegalEntity, ProcurementAward,
    TaxDebtor, CampaignDonation, OwnershipEdge, IndirectLink,
)


MAX_HOPS = 3
NAME_MATCH_THRESHOLD = 85


def build_ownership_graph(db) -> nx.DiGraph:
    """
    Construct a DiGraph from ownership_edges.
    Nodes are entity codes; edges carry person_name and edge_type.
    """
    G = nx.DiGraph()
    edges = db.query(OwnershipEdge).all()
    for e in edges:
        G.add_edge(
            e.source_entity_code,
            e.target_entity_code,
            person=e.person_name,
            edge_type=e.edge_type,
        )
    logger.info(f"Ownership graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    return G


def _bfs_reachable(G: nx.DiGraph, start: str, max_depth: int = MAX_HOPS) -> list[dict]:
    """
    BFS from start node up to max_depth hops.
    Returns list of {"entity_code": str, "hop_count": int, "path": list}.
    """
    visited = {start}
    queue = deque([(start, 0, [start])])
    results = []

    while queue:
        node, depth, path = queue.popleft()
        if depth >= max_depth:
            continue

        for neighbor in G.successors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                new_path = path + [
                    G[node][neighbor].get("person", "?"),
                    neighbor,
                ]
                results.append({
                    "entity_code": neighbor,
                    "hop_count": depth + 1,
                    "path": new_path,
                })
                queue.append((neighbor, depth + 1, new_path))

    return results


def run_phantom_network_analysis() -> int:
    """
    For each MP:
    1. Get their direct business_links
    2. BFS to depth 3 through the ownership graph
    3. Check terminal nodes against procurement_awards and tax_debtors
    4. Store IndirectLink records for hits

    Returns total indirect links discovered.
    """
    discovered = 0

    with get_session() as db:
        G = build_ownership_graph(db)
        if G.number_of_nodes() == 0:
            logger.info("Phantom network: no ownership edges to traverse")
            return 0

        procurement_codes = set()
        for pa in db.query(ProcurementAward.supplier_code).distinct():
            if pa.supplier_code:
                procurement_codes.add(pa.supplier_code)

        debtor_codes = set()
        for td in db.query(TaxDebtor.entity_code).filter(
            TaxDebtor.present_in_snapshot == True
        ).distinct():
            if td.entity_code:
                debtor_codes.add(td.entity_code)

        donor_names = set()
        for cd in db.query(CampaignDonation.donor_name).distinct():
            if cd.donor_name:
                donor_names.add(cd.donor_name.lower())

        mps = db.query(MP).all()

        for mp in mps:
            direct_links = db.query(BusinessLink).filter(
                BusinessLink.mp_id == mp.id
            ).all()

            for link in direct_links:
                if not link.entity_code or link.entity_code not in G:
                    continue

                reachable = _bfs_reachable(G, link.entity_code, MAX_HOPS)

                for reach in reachable:
                    code = reach["entity_code"]
                    has_procurement = code in procurement_codes
                    has_debtor = code in debtor_codes

                    if not has_procurement and not has_debtor:
                        continue

                    entity = db.query(LegalEntity).filter(
                        LegalEntity.entity_code == code
                    ).order_by(LegalEntity.snapshot_date.desc()).first()

                    entity_name = entity.entity_name if entity else code

                    existing = db.query(IndirectLink).filter(
                        and_(
                            IndirectLink.mp_id == mp.id,
                            IndirectLink.target_entity_code == code,
                        )
                    ).first()

                    if existing:
                        existing.hop_count = reach["hop_count"]
                        existing.path = reach["path"]
                        existing.has_procurement_hit = has_procurement
                        existing.has_debtor_hit = has_debtor
                        existing.detected_at = datetime.utcnow()
                    else:
                        indirect = IndirectLink(
                            mp_id=mp.id,
                            target_entity_code=code,
                            target_entity_name=entity_name,
                            hop_count=reach["hop_count"],
                            path=reach["path"],
                            has_procurement_hit=has_procurement,
                            has_debtor_hit=has_debtor,
                        )
                        db.add(indirect)
                    discovered += 1

        db.commit()

    logger.info(f"Phantom network: {discovered} indirect links discovered")
    return discovered


def get_mp_indirect_links(mp_id: int) -> list[dict]:
    """Retrieve all indirect links for a given MP."""
    with get_session() as db:
        links = db.query(IndirectLink).filter(
            IndirectLink.mp_id == mp_id
        ).order_by(IndirectLink.hop_count, IndirectLink.detected_at.desc()).all()

        return [
            {
                "target_code": l.target_entity_code,
                "target_name": l.target_entity_name,
                "hops": l.hop_count,
                "path": l.path,
                "procurement_hit": l.has_procurement_hit,
                "debtor_hit": l.has_debtor_hit,
                "detected_at": l.detected_at.isoformat() if l.detected_at else None,
            }
            for l in links
        ]
