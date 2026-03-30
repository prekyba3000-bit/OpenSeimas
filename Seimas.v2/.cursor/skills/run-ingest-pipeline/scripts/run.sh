#!/usr/bin/env bash
set -e

if [ -z "${DB_DSN}" ]; then
  echo "ERROR: DB_DSN is not set."
  exit 1
fi

echo "Running ingest pipeline..."
python3 ingest_seimas.py
python3 ingest_speeches.py
python3 ingest_authored_bills.py
echo "Ingest pipeline completed successfully."
