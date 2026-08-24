"""Public meta endpoints: data freshness per domain."""
from fastapi import APIRouter, HTTPException
import datetime

from backend import core


# Call-time proxies — keep bare names in route bodies patchable via backend.core.
def get_db_conn():
    return core.get_db_conn()


def check_rate_limit(ip):
    return core.check_rate_limit(ip)


router = APIRouter()

# (table, timestamp column) — columns verified against schema.sql and migrations
# (003 politicians.last_synced_at; 008 speeches.speech_date). mp_votes has no
# timestamp column at all, so only a row count is reported for it.
_FRESHNESS_SOURCES = {
    "politicians": ("politicians", "last_synced_at"),
    "votes": ("votes", "sitting_date"),
    "mp_votes": ("mp_votes", None),
    "assets": ("assets", "created_at"),
    "interests": ("interests", "created_at"),
    "speeches": ("speeches", "created_at"),
}


def _iso(value):
    return value.isoformat() if value is not None else None


# Refreshes are performed by scripts/local-ops/refresh_stats.sh, a separate
# process on a 30-minute timer, and recorded in source_fetches under this
# prefix. The endpoint previously reported core._refresh_state — a dict living
# in the API server's own memory, which that timer never touches. It published
# "refresh_count: 0" while refreshes had been running every half hour: the
# endpoint was reporting its own uptime and calling it the data's age.
_MATVIEW_PREFIX = "matview:"


def _matview_freshness(cur):
    """Per-view last refresh, from the database rather than from this process."""
    cur.execute("SELECT to_regclass('public.source_fetches') AS t")
    if cur.fetchone()["t"] is None:
        return {"last_refresh": None, "last_error": None, "refreshes_24h": 0, "views": {}}

    cur.execute(
        """
        SELECT DISTINCT ON (source_name)
               source_name, status, error, finished_at
        FROM source_fetches
        WHERE source_name LIKE %s
        ORDER BY source_name, finished_at DESC NULLS LAST
        """,
        (_MATVIEW_PREFIX + "%",),
    )
    views = {}
    for row in cur.fetchall():
        views[row["source_name"][len(_MATVIEW_PREFIX):]] = {
            "last_refresh": _iso(row["finished_at"]),
            "status": row["status"],
            "error": row["error"],
        }

    cur.execute(
        """
        SELECT COUNT(*) AS n FROM source_fetches
        WHERE source_name LIKE %s AND finished_at > now() - interval '24 hours'
        """,
        (_MATVIEW_PREFIX + "%",),
    )
    refreshes_24h = cur.fetchone()["n"]

    stamps = [v["last_refresh"] for v in views.values() if v["last_refresh"]]
    errors = [v["error"] for v in views.values() if v["error"]]
    return {
        # The oldest view governs: one stale view makes the set stale, and
        # reporting the newest would hide exactly the case this exists to catch.
        "last_refresh": min(stamps) if stamps else None,
        "last_error": errors[0] if errors else None,
        "refreshes_24h": refreshes_24h,
        "views": views,
    }


# Four states, and `unknown` is not a flavour of `stale`.
#
#   fresh    a successful fetch inside the window
#   stale    a successful fetch, too long ago
#   broken   the last attempt failed
#   unknown  no record at all — we have never observed this source
#
# Collapsing unknown into stale would claim we once had this data and it aged.
# For a source that has never been fetched, that is a statement about a fetch
# that never happened.
FRESH_WINDOW_HOURS = 26
STALE_LIMIT_HOURS = 50


def _source_states(cur):
    cur.execute("SELECT to_regclass('public.source_fetches') AS t")
    if cur.fetchone()["t"] is None:
        return {}
    cur.execute(
        """
        SELECT DISTINCT ON (source_name)
               source_name, status, finished_at, error,
               EXTRACT(EPOCH FROM (now() - finished_at)) / 3600.0 AS age_hours
        FROM source_fetches
        WHERE source_name NOT LIKE 'matview:%'
        ORDER BY source_name, finished_at DESC NULLS LAST
        """
    )
    out = {}
    for row in cur.fetchall():
        age = row["age_hours"]
        if row["status"] == "error":
            state = "broken"
        elif age is None:
            state = "unknown"
        elif age <= FRESH_WINDOW_HOURS:
            state = "fresh"
        else:
            state = "stale"
        out[row["source_name"]] = {
            "state": state,
            "last_success": _iso(row["finished_at"]),
            "age_hours": round(age, 1) if age is not None else None,
            "error": row["error"],
            "beyond_stale_limit": bool(age is not None and age > STALE_LIMIT_HOURS),
        }
    return out


@router.get("/api/meta/freshness")
def get_freshness():
    """Per-domain data freshness: row counts and latest available timestamps."""
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            domains = {}
            for name, (table, ts_col) in _FRESHNESS_SOURCES.items():
                ts_expr = f"MAX({ts_col})" if ts_col else "NULL"
                cur.execute(
                    f"SELECT COUNT(*) AS row_count, {ts_expr} AS latest FROM {table}"
                )
                row = cur.fetchone()
                domains[name] = {
                    "row_count": row["row_count"],
                    "latest": _iso(row["latest"]),
                    "source_field": ts_col,
                }

            matviews = _matview_freshness(cur)
            sources = _source_states(cur)

    return {
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        **domains,
        "materialized_views": matviews,
        "sources": sources,
    }


# A sitting day older than this reads as a recess rather than "the Seimas has
# not voted since Tuesday". Two weeks is longer than any ordinary gap between
# sittings and shorter than the summer and winter breaks, so the strip flips
# only when something structural is happening.
RECESS_AFTER_DAYS = 14


@router.get("/api/meta/last-sitting-day")
def get_last_sitting_day():
    """The most recent day the Seimas voted, and what happened on it.

    Serves the landing page's primacy strip. Everything here is counted from
    rows that exist:

      * ``vote_count``  — votes recorded on that date.
      * ``mps_present`` — distinct members with a recorded choice. A member who
        did not vote has either no row or a NULL ``vote_choice``, so presence
        is the count of members who actually registered one.
      * ``mps_present_ids`` — the same members, by id, so the seat map can
        colour the chamber by who was actually there. Absence is derived by
        the client as "not in this list", which is the only direction that is
        safe: the source records choices, not absences.

    There is deliberately no outcome breakdown. ``votes.result_type`` is NULL
    on every row because the LRS results feed publishes tallies and no
    pass/fail field, so "5 priimta · 2 atmesta" would be invented. When the
    column is populated the counts can be added here; until then the strip
    states the things that are known.
    """
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")

        with conn.cursor() as cur:
            cur.execute("SELECT MAX(sitting_date) AS d FROM votes")
            row = cur.fetchone()
            sitting_date = row["d"] if row else None

            if sitting_date is None:
                return {
                    "sitting_date": None,
                    "vote_count": 0,
                    "mps_present": 0,
                    "mps_present_ids": [],
                    "days_since": None,
                    "is_recess": False,
                    "outcomes": None,
                }

            cur.execute(
                "SELECT COUNT(*) AS n FROM votes WHERE sitting_date = %s",
                (sitting_date,),
            )
            vote_count = cur.fetchone()["n"]

            cur.execute(
                """
                SELECT DISTINCT mv.politician_id AS id
                FROM mp_votes mv
                JOIN votes v ON v.seimas_vote_id = mv.vote_id
                WHERE v.sitting_date = %s
                  AND mv.vote_choice IS NOT NULL
                """,
                (sitting_date,),
            )
            present_ids = [str(r["id"]) for r in cur.fetchall()]
            mps_present = len(present_ids)

            # Counted rather than assumed absent: a member is only "not
            # present" if the source recorded no choice for them all day.
            cur.execute(
                """
                SELECT COUNT(*) FILTER (WHERE result_type IS NOT NULL) AS decided
                FROM votes WHERE sitting_date = %s
                """,
                (sitting_date,),
            )
            decided = cur.fetchone()["decided"]

    days_since = (datetime.date.today() - sitting_date).days

    return {
        "sitting_date": sitting_date.isoformat(),
        "vote_count": vote_count,
        "mps_present": mps_present,
        "mps_present_ids": present_ids,
        "days_since": days_since,
        "is_recess": days_since > RECESS_AFTER_DAYS,
        # None, not zeroes: the source publishes no outcome field, so the
        # client renders no outcome line at all rather than "0 priimta".
        "outcomes": None if decided == 0 else {"decided": decided},
    }


@router.get("/api/meta/sessions")
def get_sessions():
    """Session boundaries as LRS publishes them.

    `date_to` is null for a session that has not ended. It stays null across the
    wire. The surface that consumed this previously carried its own hardcoded
    table in which an unfinished session ended in 2099, which is how a spring
    session that closed on 2026-07-14 went on collecting votes under the label
    „dabar" through the summer recess.

    `status` is derived from the dates and today, not from whether the chamber
    happens to be voting: `sitting` means LRS records the session as begun and
    not ended, which is a different claim from "the Seimas met today".
    """
    with get_db_conn() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.sessions') AS t")
            if cur.fetchone()["t"] is None:
                return {"sessions": [], "source": None}
            cur.execute(
                """
                SELECT seimas_session_id, number, name, date_from, date_to,
                       MAX(last_synced_at) OVER () AS synced_at
                FROM sessions
                ORDER BY date_from DESC
                """
            )
            rows = cur.fetchall()

    today = datetime.date.today()
    sessions = []
    synced_at = None
    for row in rows:
        synced_at = row["synced_at"]
        if row["date_from"] > today:
            status = "upcoming"
        elif row["date_to"] is None or row["date_to"] >= today:
            status = "sitting"
        else:
            status = "ended"
        sessions.append(
            {
                "id": row["seimas_session_id"],
                "number": row["number"],
                "name": row["name"],
                "date_from": _iso(row["date_from"]),
                "date_to": _iso(row["date_to"]),
                "status": status,
            }
        )

    return {
        "sessions": sessions,
        "source": "p2b.ad_seimo_sesijos",
        "synced_at": _iso(synced_at),
    }
