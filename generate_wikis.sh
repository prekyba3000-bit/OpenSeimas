#!/bin/bash

# ==========================================================
# OpenSeimas Autonomous MP Wiki Generator
# ==========================================================

cd /home/julio/Documents/OpenSeimas/Seimas.v2 || exit 1

set -a
source ../.env
set +a

LOG_FILE="../logs/wiki_generation_$(date +%Y%m%d).log"
AGENT_BIN="../OpenPlanter/.venv/bin/openplanter-agent"
PROMPT_FILE=".openplanter/prompts/generate_mp_wikis.md"

echo "Starting Autonomous Wiki Generation at $(date)" > "$LOG_FILE"

# Execute the Agent with the ungated Qwen model
$AGENT_BIN \
  --provider openai \
  --base-url "https://router.huggingface.co/v1" \
  --openai-api-key "$HF_TOKEN" \
  --model "Qwen/Qwen2.5-72B-Instruct" \
  --task "$(cat $PROMPT_FILE)" \
  --workspace . \
  --headless >> "$LOG_FILE" 2>&1

echo "Generation process completed at $(date)" >> "$LOG_FILE"
