# Security Review: Seimas v.2 Ingestion Pipeline

## Overview
This document summarizes the security posture of the Python-based data ingestion scripts for the Skaidrus Seimas project.

## Findings

### 1. SQL Injection Mitigation
- **Status**: ✅ PASS
- **Detail**: All database interactions in `ingest_seimas.py`, `ingest_votes_v2.py`, and `ingest_legislation.py` use parameterized queries (via `psycopg2`'s `%s` and `execute_values`). Direct string formatting in SQL is not present.

### 2. External Data Handling
- **Status**: ⚠️ IMPROVE
- **Detail**: Data from external XML APIs (Seimas, LRS) is parsed using `xml.etree.ElementTree`. While generally safe, the scripts should be validated against "XXE" (XML External Entity) attacks if the source can be tampered with.
- **Recommendation**: Use `defusedxml` to parse XML from external sources.

### 3. Error Handling & Robustness
- **Status**: ⚠️ IMPROVE
- **Detail**: The scripts use high-level `try-except` blocks. Specific exceptions (e.g. `requests.Timeout`, `psycopg2.OperationalError`) should be handled separately to allow for retries or graceful failures.
- **Recommendation**: Implement a retry decorator for network and database calls.

### 4. Credential Management
- **Status**: ⚠️ IMPROVE
- **Detail**: `DB_DSN` fallbacks currently contain hardcoded passwords in the code.
- **Recommendation**: **MUST** remove hardcoded defaults and strictly enforce the use of environment variables or `.env` files.

## Summary of Action Items
- [ ] Implement `defusedxml` for XML parsing.
- [ ] Remove hardcoded DSN defaults with passwords.
- [ ] Add granular error handling and retries.
