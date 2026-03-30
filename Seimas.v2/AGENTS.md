# Agent Instructions

This project uses **bd** (beads) for task and memory management. It is mandatory for tracking progress, managing dependencies, and ensuring context recovery between sessions.

## 🛠 Features
- **Git as Database**: Issues are stored as JSONL in `.beads/`, versioned and merged like code.
- **Agent-Optimized**: Provides auto-ready task detection and dependency tracking.
- **Zero Conflict**: Hash-based IDs prevent merge collisions.
- **Compaction**: Semantic "memory decay" summarizes old tasks to save context window.

## 📖 Essential Commands

| Command | Action |
| --- | --- |
| `bd ready` | List tasks with no open blockers. |
| `bd create "Title" -p 0` | Create a P0 task. |
| `bd show <id>` | View task details and audit trail. |
| `bd update <id> --status in_progress` | Claim work. |
| `bd close <id>` | Complete work. |
| `bd dep add <child> <parent>` | Link tasks (blocks, related, parent-child). |
| `bd sync` | Sync issues with git. |

## 🔗 Hierarchy & Workflow
Beads supports hierarchical IDs for epics:
- `bd-a3f8` (Epic)
- `bd-a3f8.1` (Task)
- `bd-a3f8.1.1` (Sub-task)

## 🏗 Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Use `bd create` for anything that needs follow-up.
2. **Update issue status** - Use `bd close` or `bd update` for finished/in-progress items.
3. **PUSH TO REMOTE**:
   ```bash
   git add .
   git commit -m "commit message"
   git pull --rebase
   bd sync
   git push
   ```
4. **Clean up** - Ensure `git status` shows "up to date with origin".

---
*Use 'bd' for task tracking.*
