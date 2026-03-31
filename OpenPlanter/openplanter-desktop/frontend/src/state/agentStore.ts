/** Zustand (vanilla) projection of investigation IPC — works without React (see ADR 0005). */
import { createStore } from "zustand/vanilla";

export type AgentIpcPhase =
  | "idle"
  | "initializing"
  | "planning"
  | "crawling"
  | "synthesizing"
  | "completed"
  | "cancelled"
  | "failed";

const PHASES: readonly AgentIpcPhase[] = [
  "idle",
  "initializing",
  "planning",
  "crawling",
  "synthesizing",
  "completed",
  "cancelled",
  "failed",
] as const;

function coercePhase(p: string): AgentIpcPhase {
  return PHASES.includes(p as AgentIpcPhase) ? (p as AgentIpcPhase) : "idle";
}

export interface AgentIpcState {
  activeRunId: string | null;
  phase: AgentIpcPhase;
  streamBuffer: string;
  lastError: string | null;
  startRun: (runId: string) => void;
  setPhase: (phase: string) => void;
  appendStream: (token: string) => void;
  reset: () => void;
}

export const agentStore = createStore<AgentIpcState>((set) => ({
  activeRunId: null,
  phase: "idle",
  streamBuffer: "",
  lastError: null,
  startRun: (runId) =>
    set({
      activeRunId: runId,
      phase: "initializing",
      streamBuffer: "",
      lastError: null,
    }),
  setPhase: (newPhase) => set({ phase: coercePhase(newPhase) }),
  appendStream: (token) => set((s) => ({ streamBuffer: s.streamBuffer + token })),
  reset: () =>
    set({
      activeRunId: null,
      phase: "idle",
      streamBuffer: "",
      lastError: null,
    }),
}));
