#!/usr/bin/env bash
# Prove a dump restores: load it into a throwaway Postgres 18 container and
# compare what arrived with what the dump lists.
#
# "The dump is a valid pg_restore archive" was the only check until
# 2026-11-14, when the first real restore lost four tables. Neon writes a
# per-column option (`pg_attver`) on tables it creates; pg_dump carries it as
# `ALTER COLUMN ... SET (pg_attver=...)` inside the CREATE TABLE entry, stock
# Postgres rejects the option, and the whole entry — table and data — is
# skipped. The restore below drops those lines. Use the same pipeline for a
# real restore to anything that is not Neon (see README, "Restore").
#
#   ./db_restore_test.sh            test the newest dump
#   ./db_restore_test.sh <dump>     test that dump
#
# Exit 0: every table and materialized view the dump lists exists after the
# restore, and politicians and votes hold rows. Anything else exits non-zero.
set -euo pipefail

BACKUP_DIR="$HOME/backups/openseimas"
DUMP="${1:-$(ls -t "$BACKUP_DIR"/seimas-*.dump 2>/dev/null | head -1)}"
[ -n "$DUMP" ] && [ -s "$DUMP" ] || { echo "restore test: no dump to test" >&2; exit 1; }
DUMP_DIR="$(cd "$(dirname "$DUMP")" && pwd)"
DUMP_FILE="$(basename "$DUMP")"

NAME="openseimas-restore-test-$$"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=restore -e POSTGRES_DB=restore \
  -v "$DUMP_DIR":/backups:ro postgres:18-alpine >/dev/null

# The image starts a temporary server to initialise, then restarts: wait for
# the database we asked for to answer, not merely for a server.
ready=0
for _ in $(seq 1 60); do
  if docker exec "$NAME" psql -U postgres -d restore -Atc 'select 1' >/dev/null 2>&1; then
    sleep 2
    docker exec "$NAME" psql -U postgres -d restore -Atc 'select 1' >/dev/null 2>&1 && { ready=1; break; }
  fi
  sleep 1
done
[ "$ready" = 1 ] || { echo "restore test: container did not become ready" >&2; exit 1; }

docker exec "$NAME" sh -c "
  set -e
  pg_restore -f - --no-owner --no-privileges /backups/$DUMP_FILE \
    | sed '/ SET (pg_attver=/d' \
    | psql -U postgres -d restore -q -v ON_ERROR_STOP=1 >/dev/null
"

listed_tables=$(docker exec "$NAME" pg_restore -l "/backups/$DUMP_FILE" | grep -c -E '^[0-9]+; [0-9]+ [0-9]+ TABLE public ')
listed_views=$(docker exec "$NAME" pg_restore -l "/backups/$DUMP_FILE" | grep -c -E '^[0-9]+; [0-9]+ [0-9]+ MATERIALIZED VIEW public ' || true)
q() { docker exec "$NAME" psql -U postgres -d restore -Atc "$1"; }
got_tables=$(q "select count(*) from pg_tables where schemaname='public'")
got_views=$(q "select count(*) from pg_matviews where schemaname='public'")
politicians=$(q "select count(*) from politicians")
votes=$(q "select count(*) from votes")

echo "restore test: $DUMP_FILE — tables $got_tables/$listed_tables, materialized views $got_views/$listed_views, politicians $politicians, votes $votes"

[ "$got_tables" = "$listed_tables" ] || { echo "restore test: table count differs" >&2; exit 1; }
[ "$got_views" = "$listed_views" ] || { echo "restore test: materialized view count differs" >&2; exit 1; }
[ "$politicians" -gt 0 ] && [ "$votes" -gt 0 ] || { echo "restore test: core tables are empty" >&2; exit 1; }
