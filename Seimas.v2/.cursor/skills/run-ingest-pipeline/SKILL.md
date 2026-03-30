---
name: run-ingest-pipeline
description: Runs the full Seimas ingestion pipeline in the required order with safe failure handling. Use when refreshing parliamentary source data, validating ingest health, or after schema changes touching ingestion outputs.
---

# Run Ingest Pipeline

Use this skill to execute the data ingestion pipeline end-to-end.

## Preconditions

- Run from repository root.
- Ensure `DB_DSN` is set and points to the target PostgreSQL instance.
- Confirm migration state is up to date before ingesting.

## Execution Order

1. `ingest_seimas.py` (MP identities, party data, committee duties)
2. `ingest_speeches.py` (speech records per active MP)
3. `ingest_authored_bills.py` (initiated bill counts per MP)

## Command

```bash
bash .cursor/skills/run-ingest-pipeline/scripts/run.sh
```

## Post-Run Checks

- Verify row counts in `committee_memberships` and `speeches`.
- Spot-check `politicians.bills_authored_count`.
- If any step fails, stop and fix upstream issues before rerunning.
