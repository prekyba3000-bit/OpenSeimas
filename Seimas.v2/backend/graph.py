"""Cytoscape graph payload construction for /api/v2/openplanter/graph."""
from typing import List, Dict, Optional, Any
import hashlib
import datetime

from backend import core
from backend.core import (
    OPENPLANTER_GRAPH_MAX_VOTE_NODES,
    OPENPLANTER_GRAPH_MAX_WEALTH_ROWS,
    OPENPLANTER_GRAPH_MAX_INTEREST_ROWS,
)


# Call-time proxies so monkeypatching backend.graph.* or backend.core.* both work.
def fetch_graph_mp_summaries(**kwargs):
    return core.fetch_graph_mp_summaries(**kwargs)


def _table_exists(cur, table_name):
    return core._table_exists(cur, table_name)


def _openplanter_graph_slug(prefix: str, key: str) -> str:
    """Stable cytoscape id from human-readable text (party name, committee title, …)."""
    text = (key or "").strip()
    if not text:
        return f"{prefix}:unknown"
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"{prefix}:{digest}"


def _openplanter_graph_node_element(
    node_id: str,
    label: str,
    category: str,
    **extra: Any,
) -> Dict[str, Any]:
    """Single Cytoscape node element with Seimas/OpenPlanter shared fields."""
    data: Dict[str, Any] = {
        "id": node_id,
        "label": (label or node_id)[:220],
        "category": category,
        "party": "",
    }
    for k, v in extra.items():
        if v is not None:
            data[k] = v
    return {"data": data}


def _build_openplanter_graph_payload(cur) -> Dict:
    """Build Cytoscape-style nodes/edges: MPs, phantom links, parties, committees, wealth, interests, votes."""
    summaries = fetch_graph_mp_summaries(db_cursor=cur, active_only=True)

    nodes: List[Dict] = []
    mp_ids: set = set()
    for summary in summaries:
        mp_id = summary["mp_id"]
        if not mp_id:
            continue
        mp_ids.add(mp_id)
        nodes.append(
            {
                "data": {
                    "id": mp_id,
                    "label": summary["display_name"] or "Unknown",
                    "category": "politician",
                    "party": summary["current_party"] or "Unknown",
                }
            }
        )

    edges: List[Dict] = []
    known_node_ids: set = set(mp_ids)

    if _table_exists(cur, "indirect_links"):
        # indirect_links.mp_id is typically Seimas numeric id → politicians.seimas_mp_id
        cur.execute(
            """
            SELECT il.id, il.mp_id, il.target_entity_code, il.target_entity_name,
                   il.hop_count, il.has_procurement_hit, p.id AS politician_uuid
            FROM indirect_links il
            LEFT JOIN politicians p
              ON p.seimas_mp_id IS NOT NULL AND p.seimas_mp_id = il.mp_id
            """
        )
        seen_entity_nodes: set = set()
        for row in cur.fetchall():
            puuid = row.get("politician_uuid")
            if puuid is None:
                continue
            src = str(puuid)
            if src not in mp_ids:
                continue
            code = row.get("target_entity_code") or ""
            if not code:
                continue
            ent_id = f"entity:{code}"
            if ent_id not in seen_entity_nodes:
                seen_entity_nodes.add(ent_id)
                label = row.get("target_entity_name") or code
                nodes.append(
                    {
                        "data": {
                            "id": ent_id,
                            "label": str(label)[:120],
                            "category": "phantom_entity",
                            "party": "",
                        }
                    }
                )
                known_node_ids.add(ent_id)
            il_id = row.get("id")
            hop = row.get("hop_count")
            proc = bool(row.get("has_procurement_hit"))
            edges.append(
                {
                    "data": {
                        "id": f"phantom_{il_id}",
                        "source": src,
                        "target": ent_id,
                        "label": "phantom_network",
                        "hop_count": int(hop) if hop is not None else 0,
                        "has_procurement_hit": proc,
                    }
                }
            )

    uuid_list: List[str] = list(mp_ids)
    if uuid_list and _table_exists(cur, "politicians"):
        # --- Political parties (distinct among active MPs in this graph) ---
        cur.execute(
            """
            SELECT DISTINCT TRIM(current_party) AS party
            FROM politicians
            WHERE is_active = TRUE
              AND id = ANY(%s::uuid[])
              AND current_party IS NOT NULL
              AND TRIM(current_party) <> ''
            """,
            (uuid_list,),
        )
        for row in cur.fetchall():
            pname = (row.get("party") or "").strip()
            if not pname:
                continue
            pid = _openplanter_graph_slug("party", pname)
            if pid not in known_node_ids:
                known_node_ids.add(pid)
                nodes.append(_openplanter_graph_node_element(pid, pname, "party"))

        cur.execute(
            """
            SELECT id::text AS mp_id, TRIM(current_party) AS party
            FROM politicians
            WHERE is_active = TRUE
              AND id = ANY(%s::uuid[])
              AND current_party IS NOT NULL
              AND TRIM(current_party) <> ''
            """,
            (uuid_list,),
        )
        for row in cur.fetchall():
            mp = row["mp_id"]
            pname = (row.get("party") or "").strip()
            if not pname:
                continue
            pid = _openplanter_graph_slug("party", pname)
            edges.append(
                {
                    "data": {
                        "id": f"belongs_{mp}_{pid}",
                        "source": mp,
                        "target": pid,
                        "label": "belongs_to",
                    }
                }
            )

    if uuid_list and _table_exists(cur, "committee_memberships"):
        cur.execute(
            """
            SELECT DISTINCT TRIM(cm.committee_name) AS committee_name
            FROM committee_memberships cm
            INNER JOIN politicians p ON p.id = cm.mp_id AND p.is_active = TRUE
            WHERE cm.mp_id = ANY(%s::uuid[])
              AND cm.committee_name IS NOT NULL
              AND TRIM(cm.committee_name) <> ''
            """,
            (uuid_list,),
        )
        for row in cur.fetchall():
            cname = (row.get("committee_name") or "").strip()
            if not cname:
                continue
            cid = _openplanter_graph_slug("committee", cname)
            if cid not in known_node_ids:
                known_node_ids.add(cid)
                nodes.append(_openplanter_graph_node_element(cid, cname, "committee"))

        cur.execute(
            """
            SELECT cm.id::text AS cm_id, cm.mp_id::text AS mp_id,
                   TRIM(cm.committee_name) AS committee_name, cm.role
            FROM committee_memberships cm
            INNER JOIN politicians p ON p.id = cm.mp_id AND p.is_active = TRUE
            WHERE cm.mp_id = ANY(%s::uuid[])
            """,
            (uuid_list,),
        )
        for row in cur.fetchall():
            cname = (row.get("committee_name") or "").strip()
            if not cname:
                continue
            cid = _openplanter_graph_slug("committee", cname)
            role = (row.get("role") or "").strip()
            edges.append(
                {
                    "data": {
                        "id": f"serves_{row['cm_id']}",
                        "source": row["mp_id"],
                        "target": cid,
                        "label": "serves_on",
                        "role": role[:120] if role else "",
                    }
                }
            )

    if uuid_list and _table_exists(cur, "mp_assets"):
        cur.execute(
            """
            SELECT id::text AS wid, politician_id::text AS mp_id, year,
                   COALESCE(total_income_eur, 0) AS income_eur
            FROM mp_assets
            WHERE politician_id = ANY(%s::uuid[])
            ORDER BY year DESC
            LIMIT %s
            """,
            (uuid_list, OPENPLANTER_GRAPH_MAX_WEALTH_ROWS),
        )
        for row in cur.fetchall():
            wid = f"wealth:{row['wid']}"
            if wid not in known_node_ids:
                known_node_ids.add(wid)
                yr = row.get("year")
                income = row.get("income_eur")
                label = f"Wealth declaration {yr}" if yr is not None else "Wealth declaration"
                sub = f"Income declared: {income} EUR" if income is not None else ""
                nodes.append(
                    _openplanter_graph_node_element(
                        wid,
                        label,
                        "wealth_declaration",
                        detail=sub[:160],
                    )
                )
            edges.append(
                {
                    "data": {
                        "id": f"has_wealth_{row['wid']}",
                        "source": row["mp_id"],
                        "target": wid,
                        "label": "filed_wealth_declaration",
                    }
                }
            )
    elif uuid_list and _table_exists(cur, "assets"):
        cur.execute(
            """
            SELECT id::text AS wid, politician_id::text AS mp_id, year,
                   COALESCE(total_value, 0) AS total_value
            FROM assets
            WHERE politician_id = ANY(%s::uuid[])
            ORDER BY year DESC
            LIMIT %s
            """,
            (uuid_list, OPENPLANTER_GRAPH_MAX_WEALTH_ROWS),
        )
        for row in cur.fetchall():
            wid = f"wealth:{row['wid']}"
            if wid not in known_node_ids:
                known_node_ids.add(wid)
                yr = row.get("year")
                val = row.get("total_value")
                label = f"Asset declaration {yr}" if yr is not None else "Asset declaration"
                sub = f"Total value: {val} EUR" if val is not None else ""
                nodes.append(
                    _openplanter_graph_node_element(
                        wid,
                        label,
                        "wealth_declaration",
                        detail=sub[:160],
                    )
                )
            edges.append(
                {
                    "data": {
                        "id": f"has_wealth_{row['wid']}",
                        "source": row["mp_id"],
                        "target": wid,
                        "label": "filed_wealth_declaration",
                    }
                }
            )

    if uuid_list and _table_exists(cur, "interests"):
        cur.execute(
            """
            SELECT id::text AS iid, politician_id::text AS mp_id,
                   COALESCE(interest_type, 'Interest') AS interest_type,
                   COALESCE(NULLIF(TRIM(organization_name), ''), '') AS org,
                   LEFT(COALESCE(description, ''), 100) AS descr
            FROM interests
            WHERE politician_id = ANY(%s::uuid[])
            LIMIT %s
            """,
            (uuid_list, OPENPLANTER_GRAPH_MAX_INTEREST_ROWS),
        )
        for row in cur.fetchall():
            iid = f"interest:{row['iid']}"
            if iid not in known_node_ids:
                known_node_ids.add(iid)
                itype = (row.get("interest_type") or "Interest").strip()
                org = (row.get("org") or "").strip()
                label = f"{itype}: {org}" if org else itype
                label = label[:200]
                descr = (row.get("descr") or "").strip()
                nodes.append(
                    _openplanter_graph_node_element(
                        iid,
                        label,
                        "interest",
                        detail=descr[:200] if descr else "",
                    )
                )
            edges.append(
                {
                    "data": {
                        "id": f"interest_link_{row['iid']}",
                        "source": row["mp_id"],
                        "target": iid,
                        "label": "declared_interest",
                    }
                }
            )

    if uuid_list and _table_exists(cur, "votes") and _table_exists(cur, "mp_votes"):
        cur.execute(
            """
            SELECT v.id, v.seimas_vote_id, v.sitting_date, v.title, v.project_id
            FROM votes v
            WHERE EXISTS (
                SELECT 1
                FROM mp_votes mv
                INNER JOIN politicians p ON p.id = mv.politician_id AND p.is_active = TRUE
                WHERE mv.vote_id = v.seimas_vote_id
                  AND mv.politician_id = ANY(%s::uuid[])
            )
            ORDER BY v.sitting_date DESC NULLS LAST, v.id DESC
            LIMIT %s
            """,
            (uuid_list, OPENPLANTER_GRAPH_MAX_VOTE_NODES),
        )
        vote_rows = cur.fetchall()
        vote_pks = [int(r["id"]) for r in vote_rows if r.get("id") is not None]
        for vr in vote_rows:
            pk = vr.get("id")
            if pk is None:
                continue
            vid = f"vote:{int(pk)}"
            if vid not in known_node_ids:
                known_node_ids.add(vid)
                title = (vr.get("title") or "Vote")[:90]
                ds = vr.get("sitting_date")
                date_s = str(ds)[:10] if ds is not None else ""
                proj = (vr.get("project_id") or "").strip()
                label = f"{date_s} · {title}" if date_s else title
                label = label[:200]
                detail = f"Project {proj}"[:120] if proj else ""
                nodes.append(
                    _openplanter_graph_node_element(
                        vid,
                        label,
                        "legislation",
                        detail=detail,
                    )
                )
        if vote_pks:
            cur.execute(
                """
                SELECT mv.id::text AS mvid, mv.politician_id::text AS mp_id,
                       mv.vote_choice, v.id AS vote_pk
                FROM mp_votes mv
                INNER JOIN votes v ON v.seimas_vote_id = mv.vote_id
                WHERE v.id = ANY(%s)
                  AND mv.politician_id = ANY(%s::uuid[])
                """,
                (vote_pks, uuid_list),
            )
            for row in cur.fetchall():
                vpk = row.get("vote_pk")
                if vpk is None:
                    continue
                vid = f"vote:{int(vpk)}"
                choice = (row.get("vote_choice") or "").strip()
                edges.append(
                    {
                        "data": {
                            "id": f"voted_{row['mvid']}",
                            "source": row["mp_id"],
                            "target": vid,
                            "label": "voted_on",
                            "vote_choice": choice[:40],
                        }
                    }
                )

    generated = (
        datetime.datetime.now(datetime.timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )
    return {"nodes": nodes, "edges": edges, "generated_at": generated}

