#!/bin/bash
# Graphiti Maintenance and Backup Script
# This script handles FalkorDB backups and pruning of redundant memory nodes.

PROJECT_DIR="/home/julio/Documents/OpenSeimas"
BACKUP_DIR="${PROJECT_DIR}/backups/memory"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"

echo "--- Starting Graphiti Maintenance: ${TIMESTAMP} ---"

# 1. Backup FalkorDB (Assuming docker container named openseimas-falkordb)
if docker ps | grep -q "openseimas-falkordb"; then
    echo "Backing up FalkorDB dump to ${BACKUP_DIR}/dump_${TIMESTAMP}.rdb..."
    docker exec openseimas-falkordb redis-cli save > /dev/null
    docker cp openseimas-falkordb:/data/dump.rdb "${BACKUP_DIR}/dump_${TIMESTAMP}.rdb"
else
    echo "Warning: openseimas-falkordb container not found. Skipping backup."
fi

# 2. Prune redundant nodes (Optional logic to be implemented via graphiti-core)
# For now, we just ensure the indices are healthy.
echo "Rebuilding Graphiti indices..."
cd "${PROJECT_DIR}/.graphiti-mcp/mcp_server"
uv run --env-file .env python3 -c "import asyncio; from graphiti_core import Graphiti; from services.factories import DatabaseDriverFactory, LLMClientFactory, EmbedderFactory; from config.schema import GraphitiConfig; import os; async def main(): cfg=GraphitiConfig(); driver=DatabaseDriverFactory.create(cfg.database); await driver.build_indices_and_constraints(); print('Indices verified.'); await driver.close(); asyncio.run(main())"

# 3. Cleanup old backups (keep last 7 days)
find "${BACKUP_DIR}" -name "dump_*.rdb" -mtime +7 -delete

echo "--- Maintenance Complete ---"
