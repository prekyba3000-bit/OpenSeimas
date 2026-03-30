/** Graph pane: 2D investigative graph (Cytoscape.js). */
import type { GraphData } from "../api/types";
import { getGraphData, readWikiFile } from "../api/invoke";
import {
  fetchSeimasOpenPlanterGraph,
  getDefaultSeimasBaseUrl,
} from "../api/SeimasProvider";
import {
  createNodeDetailsPanel,
} from "./graph/NodeDetailsPanel";
import {
  initGraph,
  updateGraph,
  destroyGraph,
  fitView,
  focusNode,
  setLayout,
  getCurrentLayout,
  filterByCategory,
  filterByTier,
  filterBySearch,
  filterBySession,
  fitSearchMatches,
  getCategories,
  getNodeIds,
} from "../graph/cytoGraph";
import { bindInteractions, type NodeSelectionData } from "../graph/interaction";
import { getCategoryColor } from "../graph/colors";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(str, { language: lang }).value; } catch { /* fallback */ }
    }
    return "";
  },
});

export function createGraphPane(): HTMLElement {
  const pane = document.createElement("div");
  pane.className = "graph-pane";

  // --- Toolbar ---
  const toolbar = document.createElement("div");
  toolbar.className = "graph-toolbar";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "graph-search";
  searchInput.placeholder = "Search nodes...";

  const layoutSelect = document.createElement("select");
  layoutSelect.className = "graph-layout-select";
  const layouts = [
    { value: "fcose", label: "Force" },
    { value: "concentric", label: "Grouped" },
    { value: "dagre", label: "Hierarchical" },
    { value: "circle", label: "Circle" },
  ];
  for (const l of layouts) {
    const opt = document.createElement("option");
    opt.value = l.value;
    opt.textContent = l.label;
    layoutSelect.appendChild(opt);
  }

  const tierSelect = document.createElement("select");
  tierSelect.className = "graph-tier-select";
  const tiers = [
    { value: "all", label: "All tiers" },
    { value: "sources-sections", label: "Sources + Sections" },
    { value: "sources", label: "Sources only" },
  ];
  for (const t of tiers) {
    const opt = document.createElement("option");
    opt.value = t.value;
    opt.textContent = t.label;
    tierSelect.appendChild(opt);
  }

  const sessionToggle = document.createElement("button");
  sessionToggle.className = "graph-session-toggle";
  sessionToggle.textContent = "\u2726"; // ✦
  sessionToggle.title = "Show only new nodes from this session";
  sessionToggle.classList.add("active");

  const sessionHint = document.createElement("span");
  sessionHint.className = "graph-session-hint";

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "graph-refresh-btn";
  refreshBtn.textContent = "\u21bb"; // ↻
  refreshBtn.title = "Refresh graph data";

  const fitBtn = document.createElement("button");
  fitBtn.className = "graph-fit-btn";
  fitBtn.textContent = "\u229e"; // ⊞
  fitBtn.title = "Fit to view";

  const graphSourceSelect = document.createElement("select");
  graphSourceSelect.className = "graph-source-select";
  graphSourceSelect.title = "Graph data source";
  for (const [v, t] of [
    ["wiki", "Wiki (workspace)"],
    ["seimas", "Seimas API"],
  ] as const) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = t;
    graphSourceSelect.appendChild(o);
  }
  const savedSource = localStorage.getItem("openplanter_graph_source");
  if (savedSource === "seimas" || savedSource === "wiki") {
    graphSourceSelect.value = savedSource;
  }

  const seimasUrlInput = document.createElement("input");
  seimasUrlInput.type = "url";
  seimasUrlInput.className = "graph-seimas-url";
  seimasUrlInput.placeholder = "Seimas API base URL";
  seimasUrlInput.value =
    localStorage.getItem("openplanter_seimas_api_base") || getDefaultSeimasBaseUrl();
  seimasUrlInput.style.minWidth = "200px";
  seimasUrlInput.style.display = graphSourceSelect.value === "seimas" ? "inline-block" : "none";

  graphSourceSelect.addEventListener("change", () => {
    seimasUrlInput.style.display =
      graphSourceSelect.value === "seimas" ? "inline-block" : "none";
    localStorage.setItem("openplanter_graph_source", graphSourceSelect.value);
    void runLoadGraph();
  });

  toolbar.append(
    searchInput,
    layoutSelect,
    tierSelect,
    sessionToggle,
    sessionHint,
    graphSourceSelect,
    seimasUrlInput,
    refreshBtn,
    fitBtn
  );

  // --- Graph container ---
  const graphContainer = document.createElement("div");
  graphContainer.className = "graph-canvas";

  // --- Legend ---
  const legend = document.createElement("div");
  legend.className = "graph-legend";

  // --- Source drawer (slide-out panel for wiki markdown) ---
  const drawerBackdrop = document.createElement("div");
  drawerBackdrop.className = "graph-source-drawer-backdrop";

  const drawer = document.createElement("div");
  drawer.className = "graph-source-drawer";

  const drawerHeader = document.createElement("div");
  drawerHeader.className = "graph-source-drawer-header";

  const drawerTitle = document.createElement("span");
  drawerTitle.className = "graph-source-drawer-title";

  const drawerCloseBtn = document.createElement("button");
  drawerCloseBtn.className = "graph-detail-close";
  drawerCloseBtn.textContent = "\u00d7";
  drawerCloseBtn.addEventListener("click", () => hideDrawer());

  drawerHeader.append(drawerTitle, drawerCloseBtn);

  const drawerBody = document.createElement("div");
  drawerBody.className = "graph-source-drawer-body rendered";

  drawer.append(drawerHeader, drawerBody);
  drawerBackdrop.addEventListener("click", () => hideDrawer());

  pane.append(toolbar, graphContainer, legend, drawerBackdrop, drawer);

  // State
  const hiddenCategories = new Set<string>();
  let baselineNodeIds = new Set<string>();
  let baselineCaptured = false;
  let sessionFilterActive = true;
  let graphInitialized = false;
  const mpWikiExistsCache = new Map<string, boolean>();

  function isSeimasSource(): boolean {
    return graphSourceSelect.value === "seimas";
  }

  function currentSeimasBaseUrl(): string {
    const base = seimasUrlInput.value.trim() || getDefaultSeimasBaseUrl();
    return base.replace(/\/$/, "");
  }

  function showGraphStatus(
    kind: "loading" | "error" | "empty",
    message?: string
  ): void {
    hideDrawer();
    nodeDetailsPanel.hide();
    graphInitialized = false;
    destroyGraph();
    graphContainer.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "graph-status-overlay";
    wrap.style.cssText =
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;min-height:180px;padding:16px;text-align:center;color:var(--text-muted);font-size:12px;";
    if (kind === "loading") {
      wrap.textContent = "Loading graph\u2026";
    } else if (kind === "error") {
      const t = document.createElement("div");
      t.textContent = message || "Failed to load graph";
      t.style.color = "var(--error)";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Retry";
      retry.className = "graph-retry-btn";
      retry.addEventListener("click", () => void runLoadGraph());
      wrap.append(t, retry);
    } else {
      wrap.textContent = message || "No nodes to display.";
    }
    graphContainer.appendChild(wrap);
  }

  async function loadGraphFromSource(): Promise<GraphData> {
    if (isSeimasSource()) {
      const base = seimasUrlInput.value.trim() || getDefaultSeimasBaseUrl();
      localStorage.setItem("openplanter_seimas_api_base", base);
      return fetchSeimasOpenPlanterGraph(base);
    }
    return getGraphData();
  }

  async function runLoadGraph(): Promise<void> {
    showGraphStatus("loading");
    try {
      const data = await loadGraphFromSource();
      if (data.nodes.length === 0) {
        const hint = isSeimasSource()
          ? "Seimas API returned no MPs (empty or unavailable)."
          : "Knowledge graph \u2014 no wiki data";
        showGraphStatus("empty", hint);
        return;
      }
      graphContainer.innerHTML = "";
      initializeWithData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showGraphStatus("error", msg);
    }
  }

  // --- Search handler (200ms debounce) ---
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener("input", () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filterBySearch(searchInput.value);
    }, 200);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (searchTimer) clearTimeout(searchTimer);
      const matches = filterBySearch(searchInput.value);
      if (matches.length > 0) fitSearchMatches();
    }
    if (e.key === "Escape") {
      if (searchTimer) clearTimeout(searchTimer);
      searchInput.value = "";
      filterBySearch("");
      searchInput.blur();
    }
  });

  // --- Layout handler ---
  layoutSelect.addEventListener("change", () => {
    setLayout(layoutSelect.value);
  });

  // --- Tier filter handler ---
  tierSelect.addEventListener("change", () => {
    filterByTier(tierSelect.value as "all" | "sources-sections" | "sources");
  });

  // --- Session toggle handler ---
  let hintTimer: ReturnType<typeof setTimeout> | null = null;
  function showHint(text: string): void {
    if (hintTimer) clearTimeout(hintTimer);
    sessionHint.textContent = text;
    sessionHint.classList.add("visible");
    hintTimer = setTimeout(() => {
      sessionHint.classList.remove("visible");
    }, 3000);
  }

  sessionToggle.addEventListener("click", () => {
    sessionFilterActive = !sessionFilterActive;
    if (sessionFilterActive) {
      sessionToggle.classList.add("active");
    } else {
      sessionToggle.classList.remove("active");
    }
    const newCount = filterBySession(sessionFilterActive, baselineNodeIds);

    if (sessionFilterActive) {
      showHint(newCount === 0 ? "0 new" : `${newCount} new`);
    } else {
      sessionHint.classList.remove("visible");
    }
  });

  // --- Auto-refresh helper (used by button, agent-step, etc.) ---
  async function autoRefreshGraph() {
    try {
      const data = await loadGraphFromSource();
      if (data.nodes.length === 0) return;
      if (graphInitialized) {
        updateGraph(data);
        buildLegend(getCategories());
        if (sessionFilterActive) {
          filterBySession(true, baselineNodeIds);
        }
      } else {
        graphContainer.innerHTML = "";
        initializeWithData(data);
      }
    } catch {
      // Silently ignore — graph refresh is best-effort
    }
  }

  // --- Refresh handler ---
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.classList.add("spinning");
    try {
      await runLoadGraph();
    } catch (e) {
      console.error("Failed to refresh graph data:", e);
    } finally {
      refreshBtn.classList.remove("spinning");
    }
  });

  // --- Fit handler ---
  fitBtn.addEventListener("click", () => {
    fitView();
  });

  // --- Build legend from categories ---
  function buildLegend(categories: string[]): void {
    legend.innerHTML = "";
    for (const cat of categories) {
      const item = document.createElement("span");
      item.className = "graph-legend-item";
      if (hiddenCategories.has(cat)) item.classList.add("legend-hidden");

      const dot = document.createElement("span");
      dot.className = "graph-legend-dot";
      dot.style.backgroundColor = getCategoryColor(cat);

      const label = document.createElement("span");
      label.className = "graph-legend-label";
      label.textContent = cat;

      item.append(dot, label);
      item.addEventListener("click", () => {
        if (hiddenCategories.has(cat)) {
          hiddenCategories.delete(cat);
          item.classList.remove("legend-hidden");
        } else {
          hiddenCategories.add(cat);
          item.classList.add("legend-hidden");
        }
        filterByCategory(hiddenCategories);
      });
      legend.appendChild(item);
    }
  }

  // --- Drawer open/close ---
  function openDrawerFromWorkspace(label: string, path: string): void {
    drawerTitle.textContent = label;
    drawerBody.innerHTML = '<span style="color:var(--text-muted)">Loading...</span>';
    drawerBackdrop.classList.add("visible");
    drawer.classList.add("visible");

    readWikiFile(path).then((content) => {
      drawerBody.innerHTML = md.render(content);
      interceptDrawerLinks();
    }).catch((err) => {
      drawerBody.innerHTML = `<span style="color:var(--error)">Failed to load: ${err}</span>`;
    });
  }

  function openDrawerWithMarkdown(label: string, markdown: string): void {
    drawerTitle.textContent = label;
    drawerBody.innerHTML = md.render(markdown);
    drawerBackdrop.classList.add("visible");
    drawer.classList.add("visible");
    interceptDrawerLinks();
  }

  function hideDrawer(): void {
    drawerBackdrop.classList.remove("visible");
    drawer.classList.remove("visible");
  }

  /** Intercept internal wiki links in the drawer to load them in-place. */
  function interceptDrawerLinks(): void {
    drawerBody.querySelectorAll("a").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || !href.endsWith(".md")) return;
      // Skip external links
      if (href.startsWith("http://") || href.startsWith("https://")) return;

      link.addEventListener("click", (e) => {
        e.preventDefault();
        // Resolve relative path: if drawer is showing wiki/fec.md and link is sec.md → wiki/sec.md
        const currentDir = drawerTitle.textContent?.includes("/")
          ? (drawerTitle.textContent || "").substring(0, (drawerTitle.textContent || "").lastIndexOf("/") + 1)
          : "wiki/";
        const resolvedPath = href.startsWith("wiki/") ? href : `wiki/${href}`;
        const nodeId = href.replace(/\.md$/, "").replace(/^.*\//, "");
        openDrawerFromWorkspace(nodeId, resolvedPath);
        focusNode(nodeId);
      });
    });
  }

  async function canOpenWikiForMp(mpId: string): Promise<boolean> {
    if (mpWikiExistsCache.has(mpId)) return mpWikiExistsCache.get(mpId) === true;

    // 1) Prefer live Seimas dashboard URL if available.
    try {
      const url = `${currentSeimasBaseUrl()}/wikis/${encodeURIComponent(mpId)}.md`;
      const res = await fetch(url, { method: "GET" });
      const ok = res.ok;
      mpWikiExistsCache.set(mpId, ok);
      if (ok) return true;
    } catch {
      // Fallback below.
    }

    // 2) Fallback to local workspace wiki reader pattern.
    try {
      await readWikiFile(`wiki/${mpId}.md`);
      mpWikiExistsCache.set(mpId, true);
      return true;
    } catch {
      mpWikiExistsCache.set(mpId, false);
      return false;
    }
  }

  async function openSeimasWikiDrawer(mpId: string, label: string): Promise<void> {
    // Try live dashboard wiki endpoint first.
    try {
      const url = `${currentSeimasBaseUrl()}/wikis/${encodeURIComponent(mpId)}.md`;
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        const markdown = await res.text();
        openDrawerWithMarkdown(`${label} forensic wiki`, markdown);
        return;
      }
    } catch {
      // Fallback below.
    }

    // Fallback to workspace wiki reader.
    openDrawerFromWorkspace(`${label} forensic wiki`, `wiki/${mpId}.md`);
  }

  const nodeDetailsPanel = createNodeDetailsPanel({
    onClose: () => {
      hideDrawer();
    },
    onFocusNode: (id: string) => {
      focusNode(id);
    },
    onReadWikiForMp: (mpId: string, label: string) => {
      void openSeimasWikiDrawer(mpId, label);
    },
    canOpenWikiForMp,
    onSearchWeb: (query: string) => {
      const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
  });
  pane.appendChild(nodeDetailsPanel.element);

  // --- Initialize graph ---
  let interactionsBound = false;

  function initializeWithData(data: GraphData): void {
    // Remove placeholder if present
    const placeholder = pane.querySelector(".graph-placeholder");
    if (placeholder) placeholder.remove();

    graphInitialized = true;
    initGraph(graphContainer, data);

    // Sync dropdown to actual layout (may differ from default if no edges)
    layoutSelect.value = getCurrentLayout();

    if (!interactionsBound) {
      bindInteractions({
        onNodeSelect: (nodeData: NodeSelectionData) => {
          hideDrawer();
          nodeDetailsPanel.show(nodeData);
        },
        onNodeDeselect: () => { nodeDetailsPanel.hide(); hideDrawer(); },
      });
      interactionsBound = true;
    }

    // Capture baseline node IDs on first load
    if (!baselineCaptured) {
      baselineNodeIds = getNodeIds();
      baselineCaptured = true;
    }

    // Apply session filter if active (e.g. auto-activated for new sessions)
    if (sessionFilterActive) {
      filterBySession(true, baselineNodeIds);
    }

    buildLegend(getCategories());
  }

  // Load graph data on mount
  setTimeout(() => void runLoadGraph(), 100);

  // Listen for wiki updates
  window.addEventListener("wiki-updated", ((e: CustomEvent<GraphData>) => {
    if (isSeimasSource()) return;
    const data = e.detail;
    if (data.nodes.length > 0) {
      initializeWithData(data);
      // Re-apply session filter if active
      if (sessionFilterActive) {
        filterBySession(true, baselineNodeIds);
      }
    } else {
      updateGraph(data);
    }
  }) as EventListener);

  // Auto-refresh graph after each agent step (tool calls may write wiki files)
  window.addEventListener("agent-step", () => {
    autoRefreshGraph();
  });

  // Auto-refresh graph when background curator updates wiki files
  window.addEventListener("curator-done", () => {
    autoRefreshGraph();
  });

  // Listen for session changes — reset baseline
  window.addEventListener("session-changed", ((e: CustomEvent<{ isNew: boolean }>) => {
    const isNew = e.detail?.isNew ?? false;
    baselineNodeIds = new Set<string>();
    baselineCaptured = false;

    if (isNew) {
      sessionFilterActive = true;
      sessionToggle.classList.add("active");
    } else {
      sessionFilterActive = false;
      sessionToggle.classList.remove("active");
    }

    void runLoadGraph();
  }) as EventListener);

  return pane;
}

function showPlaceholder(pane: HTMLElement, text: string): void {
  const placeholder = document.createElement("div");
  placeholder.className = "graph-placeholder";
  placeholder.style.cssText =
    "display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:12px;";
  placeholder.textContent = text;
  pane.appendChild(placeholder);
}
