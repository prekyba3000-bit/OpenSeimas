/** Graph interaction handlers for Cytoscape.js. */
import type { EventObject, NodeSingular } from "cytoscape";
import {
  highlightNeighborhood,
  clearHighlights,
  getCy,
  onNodeTap,
} from "./cytoGraph";

export interface NodeConnectionSummary {
  id: string;
  label: string;
  category: string;
}

export interface NodeSelectionData {
  id: string;
  label: string;
  category: string;
  path: string;
  node_type?: string;
  parent_id?: string;
  content?: string;
  detail?: string;
  alignment?: string;
  integrity_score?: number;
  party?: string;
  xp?: number;
  level?: number;
  connectedNodes: NodeConnectionSummary[];
}

export interface InteractionCallbacks {
  onNodeSelect: (nodeData: NodeSelectionData) => void;
  onNodeDeselect: () => void;
}

/** Bind all interaction handlers to the Cytoscape instance. */
export function bindInteractions(callbacks: InteractionCallbacks): void {
  const cy = getCy();
  if (!cy) return;

  const container = cy.container();
  const quickTip = document.createElement("div");
  quickTip.className = "graph-quick-tooltip";
  quickTip.style.display = "none";
  document.body.appendChild(quickTip);

  const hideQuickTip = () => {
    quickTip.style.display = "none";
    quickTip.innerHTML = "";
  };

  const moveQuickTip = (evt: EventObject) => {
    const mouse = evt.originalEvent as MouseEvent | undefined;
    if (!mouse) return;
    quickTip.style.left = `${mouse.clientX + 14}px`;
    quickTip.style.top = `${mouse.clientY + 14}px`;
  };

  // Click node: select, highlight neighborhood, show details
  onNodeTap((node: NodeSingular, evt: EventObject) => {

    // Shift+click: add to selection without clearing
    if (evt.originalEvent && (evt.originalEvent as MouseEvent).shiftKey) {
      node.select();
      return;
    }

    clearHighlights();
    node.select();
    highlightNeighborhood(node);

    const connectedNodes: NodeConnectionSummary[] = node.neighborhood().nodes().map((n) => ({
      id: n.id(),
      label: n.data("label") as string,
      category: (n.data("category") as string) || "unknown",
    }));

    callbacks.onNodeSelect({
      id: node.id(),
      label: node.data("label") as string,
      category: node.data("category") as string,
      path: node.data("path") as string,
      node_type: node.data("node_type") as string | undefined,
      parent_id: node.data("parent_id") as string | undefined,
      content: node.data("content") as string | undefined,
      detail: node.data("detail") as string | undefined,
      alignment: node.data("alignment") as string | undefined,
      integrity_score: node.data("integrity_score") as number | undefined,
      party: node.data("party") as string | undefined,
      xp: node.data("xp") as number | undefined,
      level: node.data("level") as number | undefined,
      connectedNodes,
    });
  });

  // Click background: deselect all
  cy.on("tap", (evt: EventObject) => {
    if (evt.target === cy) {
      clearHighlights();
      hideQuickTip();
      callbacks.onNodeDeselect();
    }
  });

  // Double-click node: zoom to fit its neighborhood
  cy.on("dbltap", "node", (evt: EventObject) => {
    const node = evt.target as NodeSingular;
    const neighborhood = node.neighborhood().add(node);

    cy.animate({
      fit: { eles: neighborhood, padding: 60 },
      duration: 300,
    });
  });

  // Hover node: quick evidence tooltip
  cy.on("mouseover", "node", (evt: EventObject) => {
    const node = evt.target as NodeSingular;
    if (container) container.style.cursor = "pointer";

    const label = (node.data("label") as string) || node.id();
    const detail = (node.data("detail") as string) || (node.data("content") as string) || "";
    quickTip.innerHTML = `
      <div class="graph-quick-tooltip-title">${escapeHtml(label)}</div>
      ${detail ? `<div class="graph-quick-tooltip-body">${escapeHtml(detail)}</div>` : ""}
    `;
    quickTip.style.display = "block";
    moveQuickTip(evt);
  });

  cy.on("mousemove", "node", (evt: EventObject) => {
    moveQuickTip(evt);
  });

  cy.on("mouseout", "node", () => {
    if (container) container.style.cursor = "default";
    hideQuickTip();
  });

  // Hover edge: relation hint (vote choice / role / hops)
  cy.on("mouseover", "edge", (evt: EventObject) => {
    const edge = evt.target;
    if (container) container.style.cursor = "pointer";

    const label = (edge.data("label") as string) || "edge";
    const hint = (edge.data("edge_hint") as string) || "";
    quickTip.innerHTML = `
      <div class="graph-quick-tooltip-title">${escapeHtml(label)}</div>
      ${hint ? `<div class="graph-quick-tooltip-body">${escapeHtml(hint)}</div>` : ""}
    `;
    quickTip.style.display = "block";
    moveQuickTip(evt);
  });

  cy.on("mousemove", "edge", (evt: EventObject) => {
    moveQuickTip(evt);
  });

  cy.on("mouseout", "edge", () => {
    if (container) container.style.cursor = "default";
    hideQuickTip();
  });

  // Escape key: deselect all
  document.addEventListener("keydown", (evt: KeyboardEvent) => {
    if (evt.key === "Escape") {
      clearHighlights();
      hideQuickTip();
      callbacks.onNodeDeselect();
    }
  });
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
