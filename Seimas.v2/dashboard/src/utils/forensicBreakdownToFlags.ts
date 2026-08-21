import type { ForensicBreakdown, ForensicFlag, ForensicStatus } from "../services/api";

function severityFromStatus(status: ForensicStatus): ForensicFlag["severity"] {
  if (status === "flagged" || status === "critical") return "high";
  if (status === "warning") return "medium";
  if (status === "clean") return "none";
  return "low";
}

function pickFlag(entry: ForensicFlag): ForensicFlag {
  return {
    engine: entry.engine,
    status: entry.status,
    title: entry.title,
    description: entry.description,
    severity: entry.severity,
    penalty: entry.penalty,
  };
}

/**
 * Maps civic forensic breakdown into a flat list of flags for UI (e.g. FlagList).
 * TODO(v4): if ForensicBreakdown shape changes, update mapping here.
 */
export function forensicBreakdownToFlags(bd: ForensicBreakdown): ForensicFlag[] {
  // „Bazinė rizika" was not an engine finding — it was the composite's own
  // input, restated as a flag. It went with the composite.

  const loyalty: ForensicFlag = {
    engine: "loyalty",
    status: bd.loyaltyBonus.status,
    title: "Partijos lojalumas",
    description: bd.loyaltyBonus.explanation,
    severity: severityFromStatus(bd.loyaltyBonus.status),
    penalty: bd.loyaltyBonus.bonus,
  };

  return [
    pickFlag(bd.benford),
    pickFlag(bd.chrono),
    pickFlag(bd.voteGeometry),
    pickFlag(bd.phantomNetwork),
    loyalty,
  ];
}
