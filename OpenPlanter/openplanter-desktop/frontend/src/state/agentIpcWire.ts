/** Subscribe to Tauri investigation events and forward into agentStore. */
import { listen } from "@tauri-apps/api/event";
import { agentStore } from "./agentStore";

export interface AgentStreamChunkPayload {
  runId: string;
  token: string;
}

export interface AgentPhaseChangePayload {
  runId: string;
  newPhase: string;
}

/** Returns a disposer that unregisters all listeners. */
export async function wireAgentIpcListeners(): Promise<() => void> {
  const unlistenChunk = await listen<AgentStreamChunkPayload>(
    "agent:stream-chunk",
    (event) => {
      const { runId, token } = event.payload;
      const state = agentStore.getState();
      if (state.activeRunId !== runId) return;
      state.appendStream(token);
    }
  );

  const unlistenPhase = await listen<AgentPhaseChangePayload>(
    "agent:phase-change",
    (event) => {
      const { runId, newPhase } = event.payload;
      const state = agentStore.getState();
      if (state.activeRunId !== runId) return;
      state.setPhase(newPhase);
    }
  );

  return () => {
    void unlistenChunk();
    void unlistenPhase();
  };
}
