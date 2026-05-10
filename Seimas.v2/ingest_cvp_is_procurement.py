"""
Ingest CVP IS procurement (OCDS) and persist contracts whose supplier
organization_code matches one declared by an MP in interests.

Source: https://data.open-contracting.org/en/publication/68/ — yearly
OCDS-1.1 jsonl.gz files for the Lithuanian Central Procurement Information
System (CVP IS). The OCP Data Registry mirrors this from
atviriduomenys.vpt.lt (which is unreachable from outside Lithuania for some
network paths). One release per line, schema 'compiled'.

Match strategy:
  - Build the set of MP-declared organization_codes from interests
    (organization_code IS NOT NULL).
  - For each release, walk awards[].suppliers[]; resolve each supplier's
    EU_body id back through parties[] to get additionalIdentifiers[scheme=
    ORGANIZATION_ID].id (the 9-digit juridinis asmens kodas).
  - If the supplier code is in the MP-declared set, INSERT a row.

Idempotent via UNIQUE (release_id, supplier_code) + ON CONFLICT DO NOTHING.
Re-running is safe; new contracts in a refreshed download are added.

Default scope is the most recent two years (term-overlap for 2024-2028 MPs).
Override with --years 2024 (single) or --years 2024,2023,2022 (list).
"""

import argparse
import gzip
import io
import json
import os
import sys
from urllib.request import Request, urlopen

import psycopg2
import psycopg2.extras

DB_DSN = os.getenv("DB_DSN") or os.getenv("DATABASE_URL")
OCP_BASE = "https://data.open-contracting.org/en/publication/68/download"
USER_AGENT = "OpenSeimas/1.0 (transparency project)"


def fetch_year(year):
    url = f"{OCP_BASE}?name={year}.jsonl.gz"
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=300) as resp:
        return resp.read()


def parse_releases(blob):
    """Yield decoded release dicts from a jsonl.gz blob."""
    with gzip.GzipFile(fileobj=io.BytesIO(blob)) as gz:
        for line in gz:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


def org_code_from_party(party):
    """Return the 9-digit juridinis kodas for a party, or None."""
    for ident in party.get("additionalIdentifiers") or []:
        if ident.get("scheme") == "ORGANIZATION_ID":
            code = ident.get("id")
            if code and code.isdigit() and len(code) == 9:
                return code
    return None


def iso_to_date(value):
    if not value:
        return None
    return value[:10]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--years", default="2024,2023",
        help="Comma-separated years to ingest (default 2024,2023)",
    )
    args = ap.parse_args()
    years = [int(y) for y in args.years.split(",") if y.strip()]

    if not DB_DSN:
        print("ERROR: DB_DSN not set")
        sys.exit(1)

    conn = psycopg2.connect(DB_DSN)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT organization_code FROM interests "
                "WHERE organization_code IS NOT NULL"
            )
            mp_codes = {row[0] for row in cur.fetchall()}
            print(f"MP-declared org codes: {len(mp_codes)}")

            total_releases = 0
            total_matches = 0
            distinct_suppliers = set()
            inserted = 0

            for year in years:
                print(f"\nFetching {year}.jsonl.gz…")
                blob = fetch_year(year)
                print(f"  {len(blob)} bytes")

                for release in parse_releases(blob):
                    total_releases += 1
                    parties = {p["id"]: p for p in release.get("parties", [])}
                    awards = release.get("awards") or []
                    if not awards:
                        continue

                    ocid = release.get("ocid")
                    release_id = release.get("id")
                    release_date = iso_to_date(release.get("date"))
                    tender = release.get("tender") or {}
                    tender_title = tender.get("title")

                    # buyer (first party with role=buyer; OCDS allows
                    # multiple but in practice there's one)
                    buyer_name = None
                    buyer_code = None
                    for p in parties.values():
                        if "buyer" in (p.get("roles") or []):
                            buyer_name = p.get("name")
                            buyer_code = org_code_from_party(p)
                            break

                    for award in awards:
                        award_date = iso_to_date(award.get("date"))
                        value = award.get("value") or {}
                        amount = value.get("amount")
                        currency = value.get("currency")
                        for sup in award.get("suppliers") or []:
                            sup_id = sup.get("id")
                            party = parties.get(sup_id)
                            if not party:
                                continue
                            sup_code = org_code_from_party(party)
                            if not sup_code or sup_code not in mp_codes:
                                continue

                            total_matches += 1
                            distinct_suppliers.add(sup_code)
                            cur.execute(
                                """
                                INSERT INTO procurement_contracts (
                                    ocid, release_id, release_date, award_date,
                                    buyer_name, buyer_code,
                                    supplier_name, supplier_code,
                                    tender_title, value_amount, value_currency
                                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                                ON CONFLICT (release_id, supplier_code) DO NOTHING
                                """,
                                (
                                    ocid, release_id, release_date, award_date,
                                    buyer_name, buyer_code,
                                    party.get("name"), sup_code,
                                    tender_title, amount, currency,
                                ),
                            )
                            if cur.rowcount:
                                inserted += 1

            conn.commit()
    finally:
        conn.close()

    print(f"\n  releases scanned:        {total_releases}")
    print(f"  matched supplier-awards: {total_matches}")
    print(f"  distinct matched orgs:   {len(distinct_suppliers)}")
    print(f"  rows inserted (new):     {inserted}")


if __name__ == "__main__":
    main()
