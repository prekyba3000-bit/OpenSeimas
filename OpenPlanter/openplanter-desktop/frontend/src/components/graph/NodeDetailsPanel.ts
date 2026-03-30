import { alignmentToNodeColor, getCategoryColor } from "../../graph/colors";
import type { NodeSelectionData } from "../../graph/interaction";

export interface NodeDetailsPanelActions {
  onClose: () => void;
  onFocusNode: (id: string) => void;
  onReadWikiForMp: (mpId: string, label: string) => void;
  canOpenWikiForMp: (mpId: string) => Promise<boolean>;
  onSearchWeb: (query: string) => void;
}

export interface NodeDetailsPanelController {
  element: HTMLElement;
  show: (node: NodeSelectionData) => void;
  hide: () => void;
}

export function createNodeDetailsPanel(actions: NodeDetailsPanelActions): NodeDetailsPanelController {
  const panel = document.createElement("aside");
  panel.className = "graph-node-details";
  panel.style.display = "none";

  let activeNode: NodeSelectionData | null = null;

  function hide(): void {
    panel.style.display = "none";
    panel.innerHTML = "";
    activeNode = null;
  }

  function show(node: NodeSelectionData): void {
    activeNode = node;
    panel.style.display = "block";
    panel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "graph-node-details-header";

    const titleWrap = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "graph-node-details-title";
    title.textContent = node.label || node.id;

    const subtitle = document.createElement("div");
    subtitle.className = "graph-node-details-subtitle";
    subtitle.textContent = humanCategory(node.category);

    titleWrap.append(title, subtitle);

    const close = document.createElement("button");
    close.className = "graph-node-details-close";
    close.textContent = "×";
    close.addEventListener("click", () => {
      hide();
      actions.onClose();
    });

    header.append(titleWrap, close);
    panel.appendChild(header);

    const categoryPill = document.createElement("div");
    categoryPill.className = "graph-node-details-category";
    categoryPill.style.borderColor = getCategoryColor(node.category);
    categoryPill.textContent = node.category;
    panel.appendChild(categoryPill);

    if (node.category === "politician") {
      renderPoliticianSection(node, panel, actions);
    } else if (
      node.category === "wealth_declaration" ||
      node.category === "interest" ||
      node.category === "legislation"
    ) {
      renderEvidenceDetail(node, panel);
    } else if (node.detail || node.content) {
      renderEvidenceDetail(node, panel);
    }

    if (node.category === "phantom_entity") {
      renderPhantomSearch(node, panel, actions);
    }

    renderConnections(node, panel, actions);
  }

  return {
    element: panel,
    show,
    hide,
  };
}

function renderPoliticianSection(
  node: NodeSelectionData,
  panel: HTMLElement,
  actions: NodeDetailsPanelActions,
): void {
  const card = document.createElement("div");
  card.className = "graph-node-details-card";

  card.appendChild(kv("Party", node.party || "Unknown"));

  const alignValue = node.alignment && node.alignment.trim() ? node.alignment : "Unknown";
  const alignRow = kv("Alignment", alignValue);
  const alignBadge = document.createElement("span");
  alignBadge.className = "graph-node-alignment-badge";
  alignBadge.style.backgroundColor = alignmentToNodeColor(alignValue, node.integrity_score);
  alignBadge.title = alignValue;
  alignRow.querySelector(".graph-node-details-value")?.appendChild(alignBadge);
  card.appendChild(alignRow);

  const integrity =
    typeof node.integrity_score === "number" && !Number.isNaN(node.integrity_score)
      ? Math.max(0, Math.min(100, Math.round(node.integrity_score)))
      : null;

  const integrityWrap = document.createElement("div");
  integrityWrap.className = "graph-node-integrity-wrap";

  const integrityLabel = document.createElement("div");
  integrityLabel.className = "graph-node-integrity-label";
  integrityLabel.textContent = integrity == null ? "Integrity Score: n/a" : `Integrity Score: ${integrity}/100`;

  const bar = document.createElement("div");
  bar.className = "graph-node-integrity-bar";
  const fill = document.createElement("div");
  fill.className = "graph-node-integrity-fill";
  fill.style.width = `${integrity ?? 0}%`;
  fill.style.backgroundColor = integrityColor(integrity);
  bar.appendChild(fill);

  integrityWrap.append(integrityLabel, bar);
  card.appendChild(integrityWrap);

  const xpVal = typeof node.xp === "number" && Number.isFinite(node.xp) ? Math.round(node.xp) : 0;
  const levelVal = typeof node.level === "number" && Number.isFinite(node.level) ? Math.round(node.level) : 0;
  card.appendChild(kv("Progress", `XP ${xpVal} / Level ${levelVal}`));

  panel.appendChild(card);

  if (integrity != null && integrity < 40) {
    const wikiBtn = document.createElement("button");
    wikiBtn.className = "graph-node-details-primary";
    wikiBtn.disabled = true;
    wikiBtn.textContent = "Checking forensic wiki…";
    panel.appendChild(wikiBtn);

    const mpId = node.id;
    actions
      .canOpenWikiForMp(mpId)
      .then((exists) => {
        if (!exists) {
          wikiBtn.textContent = "Forensic wiki unavailable";
          wikiBtn.disabled = true;
          return;
        }
        wikiBtn.textContent = "Read Full Forensic Wiki";
        wikiBtn.disabled = false;
        wikiBtn.addEventListener("click", () => {
          actions.onReadWikiForMp(mpId, node.label);
        });
      })
      .catch(() => {
        wikiBtn.textContent = "Forensic wiki unavailable";
        wikiBtn.disabled = true;
      });
  }
}

function renderEvidenceDetail(node: NodeSelectionData, panel: HTMLElement): void {
  const detail = document.createElement("div");
  detail.className = "graph-node-details-evidence";
  detail.textContent = formatDetail(node.category, node.detail || node.content || "No detail available.");
  panel.appendChild(detail);
}

function renderPhantomSearch(
  node: NodeSelectionData,
  panel: HTMLElement,
  actions: NodeDetailsPanelActions,
): void {
  const linkedMp = node.connectedNodes.find((n) => n.category === "politician");
  if (!linkedMp) return;

  const btn = document.createElement("button");
  btn.className = "graph-node-details-secondary";
  btn.textContent = "Search Web for Connections";
  btn.addEventListener("click", () => {
    const query = `"${linkedMp.label}" "${node.label}"`;
    actions.onSearchWeb(query);
  });
  panel.appendChild(btn);
}

function renderConnections(
  node: NodeSelectionData,
  panel: HTMLElement,
  actions: NodeDetailsPanelActions,
): void {
  if (node.connectedNodes.length === 0) return;

  const heading = document.createElement("div");
  heading.className = "graph-node-details-connections-title";
  heading.textContent = `Connected (${node.connectedNodes.length})`;
  panel.appendChild(heading);

  const list = document.createElement("div");
  list.className = "graph-node-details-connections";

  for (const conn of node.connectedNodes) {
    const item = document.createElement("button");
    item.className = "graph-node-details-conn-item";
    item.textContent = `${conn.label} · ${conn.category}`;
    item.addEventListener("click", () => {
      actions.onFocusNode(conn.id);
    });
    list.appendChild(item);
  }

  panel.appendChild(list);
}

function kv(key: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "graph-node-details-kv";

  const k = document.createElement("span");
  k.className = "graph-node-details-key";
  k.textContent = key;

  const v = document.createElement("span");
  v.className = "graph-node-details-value";
  v.textContent = value;

  row.append(k, v);
  return row;
}

function humanCategory(category: string): string {
  return category.replaceAll("_", " ").replace(/\w/g, (m) => m.toUpperCase());
}

function integrityColor(score: number | null): string {
  if (score == null) return "#8b949e";
  if (score < 40) return "#ff7b72";
  if (score < 70) return "#d29922";
  return "#3fb950";
}

function formatDetail(category: string, detail: string): string {
  if (category !== "wealth_declaration") return detail;
  // If detail contains plain numeric euro amount, normalize with currency formatting.
  const m = detail.match(/(-?\d+(?:\.\d+)?)/);
  if (!m) return detail;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return detail;
  const formatted = new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
  return detail.replace(m[1], formatted);
}
