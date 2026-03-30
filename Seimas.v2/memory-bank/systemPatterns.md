## Orchestration and Task Management
The system follows a sequential pipeline pattern managed by an orchestrator, while development tasks are managed via **Beads (bd)**.

### Development Workflow (Beads)
- **Task Tracking**: All issues are versioned in `.beads/` as JSONL.
- **Context Recovery**: Claude uses `bd setup claude` hooks to recover context before compaction.
- **Ready State**: Tasks are filtered by `bd ready` to ensure dependencies are met.

### Pipeline Flow
1. **Ingest MPs** (`ingest_seimas.py`): Fetch core identities.
2. **Identity Linking** (`link_vrk.py`): Match Seimas identities with VRK candidates.
3. **Voting Ingestion** (`ingest_votes_v2.py`): Fetch and store voting records.
4. **Metadata Sync** (`ingest_legislation.py`): Update law metadata.
5. **Repair/Cleanup** (`repair_project_ids.py`): Fix data inconsistencies.

## Data Normalization
- MP names are normalized to lowercase without special characters for matching.
- UUIDs are used for politician identities to allow linking across disparate source IDs.

## Error Handling
- The orchestrator distinguishes between "Critical" and "Non-critical" steps.
- Critical failures halt the pipeline; non-critical ones log warnings but allow progress.
