/**
 * Fetch Seimas.v2 OpenPlanter graph export and map it to workspace GraphData.
 */
import type { GraphData, GraphEdge, GraphNode, NodeType } from "./types";

export interface SeimasOpenPlanterGraphResponse {
  nodes: Array<{ data: Record<string, unknown> }>;
  edges: Array<{ data: Record<string, unknown> }>;
  generated_at?: string;
}

const DEFAULT_BASE = "https://seimas-api.onrender.com";

export function getDefaultSeimasBaseUrl(): string {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  const env = viteEnv?.VITE_SEIMAS_API_URL;
  if (env && String(env).trim()) {
    return String(env).replace(/\/$/, "");
  }
  return DEFAULT_BASE;
}

function asRecord(d: unknown): Record<string, unknown> {
  return d && typeof d === "object" ? (d as Record<string, unknown>) : {};
}

/**
 * GET {base}/api/v2/openplanter/graph → GraphData for Cytoscape.
 */
export async function fetchSeimasOpenPlanterGraph(baseUrl?: string): Promise<GraphData> {
  const base = (baseUrl || getDefaultSeimasBaseUrl()).replace(/\/$/, "");
  const url = `${base}/api/v2/openplanter/graph`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 240);
    throw new Error(`Seimas graph ${res.status}: ${snippet || res.statusText}`);
  }
  const raw = (await res.json()) as SeimasOpenPlanterGraphResponse;

  const nodes: GraphNode[] = (raw.nodes || []).map((el) => {
    const d = asRecord(el.data);
    const cat = String(d.category ?? "unknown");
    const isPol = cat === "politician";
    const intRaw = d.integrity_score;
    const integrity =
      isPol && intRaw != null && intRaw !== ""
        ? Number(intRaw)
        : undefined;
    const nodeType: NodeType = isPol ? "source" : "fact";
    const detail =
      d.detail != null && String(d.detail).trim() !== ""
        ? String(d.detail).trim()
        : "";
    return {
      id: String(d.id ?? ""),
      label: String(d.label ?? d.id ?? ""),
      category: cat,
      path: isPol ? `seimas:${d.id}` : `seimas-entity:${d.id}`,
      node_type: nodeType,
      content: isPol
        ? `${d.party ?? ""} · INT ${integrity ?? "?"} · ${d.alignment ?? ""}`
        : detail || undefined,
      detail: detail || undefined,
      alignment: isPol && d.alignment != null ? String(d.alignment) : undefined,
      integrity_score:
        integrity != null && !Number.isNaN(integrity) ? integrity : undefined,
      party: isPol && d.party != null ? String(d.party) : undefined,
      xp: isPol && d.xp != null && d.xp !== "" ? Number(d.xp) : undefined,
      level: isPol && d.level != null && d.level !== "" ? Number(d.level) : undefined,
    };
  }).filter((n) => n.id.length > 0);

  const edges: GraphEdge[] = (raw.edges || []).map((el) => {
    const d = asRecord(el.data);
    const hintParts: string[] = [];
    if (d.vote_choice != null && String(d.vote_choice).trim() !== "") {
      hintParts.push(String(d.vote_choice).trim());
    }
    if (d.role != null && String(d.role).trim() !== "") {
      hintParts.push(String(d.role).trim());
    }
    if (d.hop_count != null && String(d.hop_count).trim() !== "") {
      const hops = Number(d.hop_count);
      if (!Number.isNaN(hops)) {
        hintParts.push(`${hops} hop${hops === 1 ? "" : "s"}`);
      }
    }
    if (d.has_procurement_hit === true) {
      hintParts.push("procurement hit");
    }
    return {
      source: String(d.source ?? ""),
      target: String(d.target ?? ""),
      label: d.label != null ? String(d.label) : "phantom_network",
      edge_hint: hintParts.length > 0 ? hintParts.join(" · ") : undefined,
    };
  }).filter((e) => e.source.length > 0 && e.target.length > 0);

  return { nodes, edges };
}
