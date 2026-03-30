#!/bin/bash
# OpenPlanter Textual UI — run from a real terminal (or use open_openplanter_gui.sh for a new window).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/Seimas.v2" || exit 1
set -a
source "$ROOT/.env"
set +a
exec "$ROOT/OpenPlanter/.venv/bin/openplanter-agent" \
  --provider openai \
  --base-url "https://router.huggingface.co/v1" \
  --openai-api-key "$HF_TOKEN" \
  --model "Qwen/Qwen2.5-72B-Instruct" \
  --reasoning-effort none \
  --textual \
  --workspace .
