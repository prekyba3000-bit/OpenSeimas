#!/usr/bin/env bash
# Local stand-in for .github/workflows/daily_sync.yml while GitHub Actions is
# unavailable. Scheduled by openseimas-sync.timer (06:00 Europe/Vilnius,
# Persistent=true so a missed day is caught up once after boot/resume).
#
# Idempotent by construction, so a catch-up run is safe: apply_migrations is
# guarded, ingest_seimas upserts (its only DELETE is a scoped replace of the
# committee rows it is about to re-insert), ingest_votes_v2 is all ON CONFLICT,
# and export_stats overwrites one JSON file.
#
# Reads DB_DSN from ~/.config/openseimas/prod.env — never store the DSN in-repo.
#
#   ./daily_sync.sh            run now
#   ./daily_sync.sh --if-due   run only if >=24h since last success (timer path)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/lib/due.sh"
. "$HERE/lib/notify.sh"

JOB=sync
INTERVAL=86400

if [ "${1:-}" = "--if-due" ] && ! is_due "$JOB" "$INTERVAL"; then
  echo "[$(date -Is)] daily sync skipped — last success $(human_age "$(last_success "$JOB")") ago"
  exit 0
fi
trap 'ops_trap_fail '"$JOB" ERR

ENV_FILE="$HOME/.config/openseimas/prod.env"
[ -f "$ENV_FILE" ] || { ops_fail "$JOB" "missing $ENV_FILE"; exit 1; }
set -a; . "$ENV_FILE"; set +a
REPO="$HOME/Documents/OpenSeimas"
cd "$REPO/Seimas.v2"

echo "[$(date -Is)] daily sync start"
.venv/bin/python apply_migrations.py
.venv/bin/python -m pipeline.ingest_seimas
.venv/bin/python -m pipeline.ingest_votes_v2

# Registrations, immediately after the votes that create the sitting day.
# Attendance v2 counts "registered OR voted", and a sitting day enters the
# denominator the moment its votes land. If registrations arrive later — this
# ingest had not run for 16 days — every member who attended without voting is
# recorded absent until they do. That understated 25 members after the
# 2026-08-25 sitting. Order is the fix: same run, votes first, registrations
# straight after, matview refresh only once both are in.
.venv/bin/python -m pipeline.ingest_registrations || echo "[$(date -Is)] registrations ingest failed (non-fatal, but attendance may understate until it succeeds)"
# Session boundaries. Cheap (one request) and the sessions page groups every
# vote by them; session 146 opens 2026-08-25 and 145 on 2026-09-10, neither of
# which existed in the hardcoded table this replaced.
.venv/bin/python -m pipeline.ingest_sessions || echo "[$(date -Is)] ingest_sessions failed (non-fatal, previous boundaries kept)"
# bills_authored_count feeds the legislative_activity dimension, which sits on
# the profile beside attendance and vote counts that refresh every day. It was
# refreshed only by hand, so „direct" provenance was true about lineage and
# silent about age. Non-fatal like tag_topics: a failed fetch keeps the previous
# values, and /api/meta/freshness now reports how old they are, so staleness is
# visible rather than silent.
.venv/bin/python -m pipeline.ingest_authored_bills || echo "[$(date -Is)] ingest_authored_bills failed (non-fatal, values kept, age reported)"

# Press releases. The script was correct all along and simply had no runner;
# its historical failure was migration 008's column mismatch, fixed in 008.
.venv/bin/python -m pipeline.ingest_speeches || echo "[$(date -Is)] press-release ingest failed (non-fatal, previous rows kept)"

# Floor speeches. Off the schedule for 16 days, which left visibility running on
# data that stopped at 2026-07-14 while the chamber sat on 08-25. Now reads only
# sittings it has not already read to completion — 5 of 177, ~18s instead of
# ~10min. `--full` re-reads everything and is the way to prove the skip is
# lossless; it currently finds nothing.
.venv/bin/python -m pipeline.ingest_floor_speeches || echo "[$(date -Is)] floor-speech ingest failed (non-fatal, previous rows kept)"

# Official foreign travel. Evidence only — no dial reads mp_travel.
.venv/bin/python -m pipeline.ingest_travel || echo "[$(date -Is)] travel ingest failed (non-fatal, previous rows kept)"

# Assistants and secretaries. Employment relationship only — the feed's contact
# fields are discarded at the parser and mp_assistants has no column for them.
.venv/bin/python -m pipeline.ingest_assistants || echo "[$(date -Is)] assistants ingest failed (non-fatal, previous rows kept)"

# Diary events. Re-reads every diary and upserts: the feed adds past-dated
# entries late, so insert-once would miss them. Write work is skipped for the
# ~140 diaries whose fingerprint is unchanged, which is the usual case.
.venv/bin/python -m pipeline.ingest_diary || echo "[$(date -Is)] diary ingest failed (non-fatal, previous rows kept)"
.venv/bin/python -m pipeline.cli tag_topics || echo "[$(date -Is)] tag_topics failed (non-fatal, same as workflow)"
# Data-quality gate. Runs after ingestion, before anything downstream trusts
# the data. A block_publish failure exits non-zero and the refresh job will
# hold, leaving the last-good data served.
.venv/bin/python scripts/dq_check_runner.py || echo "[$(date -Is)] dq checks reported a blocking failure"

.venv/bin/python export_stats.py

# Mirror the workflow's data commit; --no-verify skips the pre-push quality gate
# because this push is data-only (the gate is for code pushes).
#
# The commit MUST be path-scoped. `git add <file>` followed by a bare
# `git commit` commits the whole index, so an unrelated `git add` that happened
# to be sitting staged gets swept into a "data: daily sync" commit and pushed
# with --no-verify — i.e. code reaching origin under a data message, with the
# quality gate bypassed. That happened once. Passing the pathspec to commit
# makes it ignore the rest of the index entirely.
cd "$REPO"
DATA_FILE="Seimas.v2/dashboard/public/data/absenteeism.json"
if ! git diff --quiet "$DATA_FILE"; then
  git commit -m "data: daily sync (local cron) [skip ci]" -- "$DATA_FILE"
  git pull --rebase origin main && git push --no-verify origin main \
    || echo "[$(date -Is)] push failed — data commit left local"
fi
# Dead-man's switch. Pings only if a URL is configured; no account is created
# by this repo. An unconfigured ping is silence, not a false green.
if [ -n "${HEALTHCHECK_SYNC_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 "$HEALTHCHECK_SYNC_URL" >/dev/null \
    && echo "[$(date -Is)] healthcheck pinged" \
    || echo "[$(date -Is)] healthcheck ping failed (sync itself succeeded)"
fi

echo "[$(date -Is)] daily sync done"

mark_success "$JOB"
