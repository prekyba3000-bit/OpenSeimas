---
name: update-memory-bank
description: Updates project memory-bank files after significant changes. Use when features, architecture, scoring logic, ingestion behavior, or deployment workflows change and project memory must stay current.
---

# Update Memory Bank

Use this skill after substantial implementation work.

## Workflow

1. Run `git diff --name-only` to identify changed files.
2. Summarize what changed and why.
3. Update `memory-bank/activeContext.md`:
   - current focus
   - recent changes
   - current state
   - next steps
4. Append an entry to `memory-bank/progress.md` with:
   - date
   - summary
   - key decisions
   - files changed

## Rules

- Keep entries concise and factual.
- Capture decisions that affect future implementation.
- Reflect operational reality (what is implemented vs. pending validation).
