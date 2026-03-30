/** Category color map for graph nodes. */
export const CATEGORY_COLORS: Record<string, string> = {
  politician: "#58a6ff",
  /** Seimas graph — political party / faction */
  party: "#f0883e",
  /** Parliamentary committee */
  committee: "#6cb6ff",
  /** Wealth / asset declaration row */
  wealth_declaration: "#3fb950",
  /** VTEK or conflict-of-interest declaration */
  interest: "#ff9492",
  /** Vote / legislative motion node */
  legislation: "#bc8cff",
  "phantom_entity": "#a371f7",
  "campaign-finance": "#f97583",
  "contracts": "#79c0ff",
  "corporate": "#56d364",
  "financial": "#d2a8ff",
  "infrastructure": "#ffa657",
  "international": "#ff7b72",
  "lobbying": "#e3b341",
  "nonprofits": "#a5d6ff",
  "regulatory": "#7ee787",
  "sanctions": "#f778ba",
  "media": "#c9d1d9",
  "legal": "#b392f0",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#8b949e";
}

/** Map D&D-style alignment strings to node fill colors (Seimas hero engine). */
const ALIGNMENT_HEX: Record<string, string> = {
  "Lawful Good": "#3fb950",
  "Lawful Neutral": "#56d364",
  "Lawful Evil": "#7ee787",
  Neutral: "#d29922",
  "True Neutral": "#8b949e",
  "Neutral Good": "#79c0ff",
  "Neutral Evil": "#ffa657",
  "Chaotic Good": "#58a6ff",
  "Chaotic Neutral": "#a371f7",
  "Chaotic Evil": "#ff7b72",
};

/**
 * Color for Seimas politician nodes: alignment palette, low integrity → warning red.
 */
export function alignmentToNodeColor(alignment: string, integrity?: number): string {
  if (integrity != null && integrity < 40) {
    return "#ff7b72";
  }
  const key = alignment.trim();
  return ALIGNMENT_HEX[key] ?? getCategoryColor("politician");
}
