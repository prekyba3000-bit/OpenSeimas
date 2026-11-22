import type { ForensicBreakdown, ForensicFlag } from "../services/api";
import { forensicSeverityFromStatus } from "../services/api";

function pickFlag(entry: ForensicFlag): ForensicFlag {
  return {
    engine: entry.engine,
    status: entry.status,
    title: entry.title,
    description: entry.description,
    severity: entry.severity,
  };
}

/**
 * Maps civic forensic breakdown into a flat list of flags for UI (e.g. FlagList).
 * TODO(v4): if ForensicBreakdown shape changes, update mapping here.
 */
export function forensicBreakdownToFlags(bd: ForensicBreakdown): ForensicFlag[] {
  // „Bazinė rizika" was not an engine finding — it was the composite's own
  // input, restated as a flag. It went with the composite. The loyalty
  // "bonus" went the same way (evaluation CORB-07): rewarding a member for
  // disagreeing with their faction 10–40 % of the time is a verdict.

  return [
    pickFlag(bd.benford),
    pickFlag(bd.chrono),
    pickFlag(bd.voteGeometry),
    pickFlag(bd.phantomNetwork),
  ];
}
