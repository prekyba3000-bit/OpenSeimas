"""The President's decree register, from lrp.lt/lt/dekretai/YYYY-MM.

Evidence only. Each listed decree becomes one row: number, list date, title,
link to the signed PDF, and a `kind` derived from the title by `classify`.
Nothing is scored and nothing about a person is computed.

First run (empty table) reads every month since the Seimas term began; later
runs re-read the current month and the one before, because lrp.lt publishes
some decrees days after they are signed. `--from YYYY-MM` forces a start.

Polite by construction: one request at a time, a pause between requests, and
robots.txt on www.lrp.lt disallows none of these paths (checked 2026-11-13).
"""
import datetime
import html
import os
import re
import sys
import time

import psycopg2
from psycopg2.extras import execute_values

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.common import record_fetch, setup_logging  # noqa: E402
from utils import fetch_with_retry  # noqa: E402

BASE_URL = "https://www.lrp.lt/lt/dekretai"
SITE = "https://www.lrp.lt"
SOURCE_NAME = "lrp_decrees"
TERM_START = (2024, 11)  # the 2024–2028 Seimas first sat on 2024-11-14
PAGE_STEP = 8            # lrp.lt paginates as /p8, /p16, ...
PAUSE_SECONDS = 0.7

MONTHS_GENITIVE = {
    "sausio": 1, "vasario": 2, "kovo": 3, "balandžio": 4, "gegužės": 5, "birželio": 6,
    "liepos": 7, "rugpjūčio": 8, "rugsėjo": 9, "spalio": 10, "lapkričio": 11, "gruodžio": 12,
}

ROW_RE = re.compile(r'<tr class="dekretai__item.*?</tr>', re.S)
YEAR_RE = re.compile(r"class=['\"]year['\"]>(.*?)</span>", re.S)
MONTH_RE = re.compile(r"class=['\"]month['\"]>(.*?)</span>", re.S)
DAY_RE = re.compile(r"class=['\"]day['\"]>(.*?)</span>", re.S)
LINK_RE = re.compile(r'<a class="title-link" href="([^"]*)".*?class="title">(.*?)</span>', re.S)
NUMBER_RE = re.compile(r"(\d)k-(\d+)", re.I)


def _text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def parse_lt_date(year_text: str, month_text: str, day_text: str):
    """'2026 m.', 'liepos', '07 d.' -> date(2026, 7, 7). None if unreadable."""
    year = re.search(r"\d{4}", year_text or "")
    day = re.search(r"\d{1,2}", day_text or "")
    month = MONTHS_GENITIVE.get((month_text or "").strip().lower())
    if not (year and day and month):
        return None
    try:
        return datetime.date(int(year.group()), month, int(day.group()))
    except ValueError:
        return None


def decree_no_from_href(href: str):
    """'/data/.../2026-07-07-nr.-1k-737.pdf' -> '1K-737'. None if there is no file."""
    match = NUMBER_RE.search((href or "").rsplit("/", 1)[-1])
    return f"{match.group(1)}K-{match.group(2)}" if match else None


def classify(title: str) -> str:
    """Kind from the title alone. Order matters: the first rule that fits wins."""
    t = re.sub(r"\s+", " ", title or "").upper()
    if "GRĄŽINIMO LIETUVOS RESPUBLIKOS SEIMUI PAKARTOTINAI SVARSTYTI" in t:
        return "veto"
    if re.search(r"PROJEKT(O|Ų) PATEIKIMO", t):
        return "bill"
    if re.search(r"TEIKIMO LIETUVOS RESPUBLIKOS SEIMUI (RATIFIKUOTI|DENONSUOTI)", t):
        return "treaty"
    if re.search(r"TEIKIMO LIETUVOS RESPUBLIKOS SEIMUI (SKIRTI|ATLEISTI|PRITARTI)", t):
        return "nomination"
    if "ĮGALIOTOJO MINISTRO" in t:  # a diplomatic rank, not a member of the Government
        return "other"
    if re.search(
        r"VYRIAUSYBĖS SUDĖTIES|VYRIAUSYBĖS ATSISTATYDINIMO|VYRIAUSYBĖS GRĄŽINAMŲ ĮGALIOJIMŲ"
        r"|MINISTR(U|E) PIRMININK(U|E)$|MINISTRO PIRMININKO KANDIDATŪROS"
        r"|MINISTR(O|ĖS|Ų)\b.*(SKYRIMO|ATLEIDIMO|ATSISTATYDINIMO)",
        t,
    ):
        return "cabinet"
    return "other"


def parse_month_page(page: str):
    """Rows of (decree_no, listed_on, title, url, kind) from one list page."""
    out = []
    for row in ROW_RE.findall(page):
        year, month, day = YEAR_RE.search(row), MONTH_RE.search(row), DAY_RE.search(row)
        link = LINK_RE.search(row)
        if not (year and month and day and link):
            continue
        listed_on = parse_lt_date(_text(year.group(1)), _text(month.group(1)), _text(day.group(1)))
        title = _text(link.group(2))
        if not listed_on or not title:
            continue
        href = link.group(1).strip()
        url = (SITE + href if href.startswith("/") else href) or None
        out.append((decree_no_from_href(href), listed_on, title, url, classify(title)))
    return out


def months_from(start, today):
    """(year, month) pairs from `start` to today's month, inclusive."""
    year, month = start
    while (year, month) <= (today.year, today.month):
        yield year, month
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)


def read_month(year: int, month: int, fetch=fetch_with_retry, pause=PAUSE_SECONDS):
    """Every row lrp.lt lists for one month, following its pagination to the end."""
    rows, seen, offset = [], set(), 0
    while True:
        url = f"{BASE_URL}/{year}-{month:02d}" + (f"/p{offset}" if offset else "")
        page = fetch(url, timeout=30, allow_fortress_fallback=False).text
        fresh = [r for r in parse_month_page(page) if (r[0], r[1], r[2]) not in seen]
        if not fresh:
            return rows
        seen.update((r[0], r[1], r[2]) for r in fresh)
        rows.extend(fresh)
        offset += PAGE_STEP
        time.sleep(pause)


def reconciliation_note(parsed: int, inserted: int):
    """Say why fewer rows were stored than listed, or None when none were.

    Every run after the first lists decrees it already holds, and the insert
    skips them. Without a note that reads as rows lost between parse and
    store, and `three_way_reconciliation` holds publication for it.
    """
    already = parsed - inserted
    if not already:
        return None
    return f"{already} listed decrees already stored (idempotent re-run)"


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    setup_logging()
    dsn = os.getenv("DB_DSN")
    if not dsn:
        print("ERROR: DB_DSN not set", file=sys.stderr)
        return 2
    today = datetime.date.today()

    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.presidential_decrees')")
            if cur.fetchone()[0] is None:
                print("presidential_decrees missing — apply migration 051 first", file=sys.stderr)
                return 2
            cur.execute("SELECT COUNT(*) FROM presidential_decrees")
            empty = cur.fetchone()[0] == 0

        if "--from" in argv:
            y, m = argv[argv.index("--from") + 1].split("-")
            start = (int(y), int(m))
        elif empty:
            start = TERM_START
        else:
            start = (today.year - 1, 12) if today.month == 1 else (today.year, today.month - 1)

        parsed = inserted = 0
        with record_fetch(conn, SOURCE_NAME, BASE_URL) as fetch:
            for year, month in months_from(start, today):
                rows = read_month(year, month)
                parsed += len(rows)
                if not rows:
                    continue
                with conn.cursor() as cur:
                    written = execute_values(
                        cur,
                        """
                        INSERT INTO presidential_decrees (decree_no, listed_on, title_lt, url, kind)
                        VALUES %s
                        ON CONFLICT DO NOTHING
                        RETURNING 1
                        """,
                        rows,
                        fetch=True,
                    )
                    inserted += len(written)
                conn.commit()
                print(f"  {year}-{month:02d}: {len(rows)} listed, {len(written)} new")
            fetch["rows"] = inserted
            fetch["parsed"] = parsed
            fetch["inserted"] = inserted
            fetch["note"] = reconciliation_note(parsed, inserted)
        print(f"decrees: {parsed} listed, {inserted} new")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
