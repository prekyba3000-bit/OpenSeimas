#!/usr/bin/env python3
"""
Idempotent migration runner.

Usage:
    DB_DSN=postgresql://... python3 apply_migrations.py

What it does:
  1. Creates schema_migrations(filename PK, applied_at) if absent.
  2. If the `politicians` table doesn't exist yet, applies schema.sql first
     (bootstrap path for a fresh Render DB).
  3. Walks migrations/*.sql in filename order, applying any not yet recorded.
     Each migration runs in its own transaction; on failure it rolls back
     and exits non-zero with the SQL state and the offending file.

Re-running is safe: already-applied files are skipped. Adding a new
migration file is the normal way to evolve the schema.
"""
import glob
import os
import sys
import psycopg2

DB_DSN = os.getenv("DB_DSN")
if not DB_DSN:
    print("ERROR: DB_DSN not set", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
SCHEMA_FILE = os.path.join(REPO_ROOT, "schema.sql")
MIGRATIONS_DIR = os.path.join(REPO_ROOT, "migrations")


def ensure_tracking_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )


def politicians_exists(cur) -> bool:
    cur.execute("SELECT to_regclass('public.politicians') IS NOT NULL;")
    return cur.fetchone()[0]


def already_applied(cur, name: str) -> bool:
    cur.execute("SELECT 1 FROM schema_migrations WHERE filename = %s;", (name,))
    return cur.fetchone() is not None


def apply_file(conn, path: str, label: str):
    """Run a single .sql file in its own transaction, then record it."""
    name = os.path.basename(path)
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    print(f"  → applying {label}: {name} ({len(sql):,} bytes)")
    try:
        with conn:  # opens a transaction; commits on success, rolls back on exception
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    "INSERT INTO schema_migrations (filename) VALUES (%s) "
                    "ON CONFLICT (filename) DO NOTHING;",
                    (name,),
                )
    except psycopg2.Error as e:
        print(f"\n!! FAILED on {name}", file=sys.stderr)
        print(f"   pgcode={e.pgcode} pgerror={e.pgerror}", file=sys.stderr)
        sys.exit(1)


def main():
    print(f"connecting to {DB_DSN.split('@')[-1]} ...")
    conn = psycopg2.connect(DB_DSN)
    # we want explicit transaction control via `with conn`
    conn.autocommit = False

    with conn.cursor() as cur:
        ensure_tracking_table(cur)
        conn.commit()

        bootstrap_needed = not politicians_exists(cur)

    if bootstrap_needed:
        if not os.path.exists(SCHEMA_FILE):
            print(f"ERROR: politicians table missing and {SCHEMA_FILE} not found",
                  file=sys.stderr)
            sys.exit(1)
        print("politicians table missing → bootstrapping from schema.sql")
        apply_file(conn, SCHEMA_FILE, "bootstrap")
    else:
        print("politicians table present → skipping schema.sql bootstrap")

    files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    if not files:
        print(f"WARNING: no migration files in {MIGRATIONS_DIR}", file=sys.stderr)

    applied = skipped = 0
    for path in files:
        name = os.path.basename(path)
        with conn.cursor() as cur:
            done = already_applied(cur, name)
        if done:
            print(f"  ✓ {name} (already applied)")
            skipped += 1
            continue
        apply_file(conn, path, "migration")
        applied += 1

    conn.close()
    print(f"\ndone: {applied} applied, {skipped} already up-to-date")


if __name__ == "__main__":
    main()
