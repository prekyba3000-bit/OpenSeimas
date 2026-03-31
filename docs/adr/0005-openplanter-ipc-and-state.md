# ADR 0005: OpenPlanter IPC and client state projection

## Status

Accepted

## Context

OpenPlanter is a Tauri desktop app: the Rust side owns the investigation lifecycle (sessions, model calls, tools). The frontend must not invent server truth; it should reflect IPC events. The web dashboard uses TanStack Query; the desktop shell uses a small client store.

The UI stack today is **vanilla TypeScript** (not React). **Zustand `createStore` from `zustand/vanilla`** provides the same state patterns as React hooks without requiring a React migration for this slice.

## Decision

1. **Define IPC first**, then map it to client state (see ADR 0003 for the general rule).
2. **Commands (invoke)** return immediate acknowledgements (e.g. `runId`); **streaming and phase changes** use **Tauri events** with stable names and camelCase JSON payloads (`serde(rename_all = "camelCase")` on the Rust side).
3. **Client store** holds: `activeRunId`, `phase`, `streamBuffer` (tokens appended here; flushed to permanent `messages[]` only on phase boundaries such as tool calls when that pipeline exists), `lastError`.
4. **Listeners** are registered once at app shell startup (`wireAgentIpcListeners`), updating the store only when `event.payload.runId === activeRunId`.

## IPC catalog (initial)

| IPC | Payload (TS) | Store action |
|-----|----------------|--------------|
| `invoke('start_investigation')` | Req: `{ caseId, query }` Res: `{ status, runId }` | `startRun(runId)` → `activeRunId`, `phase = 'initializing'`, clear `streamBuffer` |
| `listen('agent:phase-change')` | `{ runId, newPhase }` | `setPhase(newPhase)` |
| `listen('agent:stream-chunk')` | `{ runId, token }` | `appendStream(token)` |
| _(planned)_ `invoke('cancel_investigation')` | `{ runId }` | `cancelRun()` |
| _(planned)_ `listen('agent:tool-call')` | `{ runId, tool, args, result? }` | flush buffer → `messages[]`, append tool log |
| _(planned)_ `listen('agent:error')` | `{ runId, code, message, fatal }` | inline vs global failure per `fatal` |

Event names use **`agent:`** prefix to match existing engine events (`agent:delta`, `agent:error`, …).

## Thin vertical slice (implemented)

- Rust: `start_investigation` spawns a Tokio task that after a short delay emits `agent:phase-change` (`planning`), five `agent:stream-chunk` events (~500 ms apart), then `agent:phase-change` (`completed`).
- Frontend: `startInvestigation()` + `wireAgentIpcListeners()` + `agentStore` + sidebar **Investigation IPC (dev)** button and buffer readout.

## Consequences

- Real LLM/tooling replaces the dummy loop without changing the IPC names expected by the store.
- If the UI moves to React later, the same store can be consumed via `useStore` from `zustand` while keeping identical IPC wiring.

## References

- `OpenPlanter/openplanter-desktop/crates/op-tauri/src/commands/agent.rs` — `start_investigation`
- `OpenPlanter/openplanter-desktop/frontend/src/state/agentStore.ts`, `agentIpcWire.ts`
