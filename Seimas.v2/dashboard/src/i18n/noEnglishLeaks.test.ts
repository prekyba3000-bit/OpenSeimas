import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guard against English leaking back into the Lithuanian UI.
 *
 * These strings were all live on the page at some point: server-composed
 * "Voted Susilaikė", hardcoded CONNECTED/ONLINE/AUTOMATINĖ telemetry, and an
 * English MP-list header. Each was invisible to anyone reading the code in
 * English, which is exactly why a test is worth more than vigilance here.
 */
const SRC = join(__dirname, "..");

// Directories whose text never reaches a citizen.
const SKIP_DIRS = new Set(["ui", "stories", "figma"]);

/**
 * Components imported by nothing. Their strings cannot reach a citizen, so a
 * leak in them is not a user-facing bug — but they are also not worth
 * translating. Sixteen of these exist (see the redesign report); listed here so
 * the guard stays meaningful for live code, and so the list is a standing
 * reminder that they are candidates for deletion.
 */
const UNREACHABLE = new Set([
  "Admin_Server_Status.tsx", "AlignmentResultCard.tsx", "CommandPalette.tsx",
  "ComponentBreakdown.tsx", "ConflictAlertModal.tsx", "DivergingBar.tsx",
  "DocCard.tsx", "ForensicExplainer.tsx", "MenuTrigger.tsx",
  "Party_Clan_Profile.tsx", "SeatingMap.tsx", "SessionOverview.tsx",
  "SwipeableVoteItem.tsx", "TokenHandOff.tsx", "VerticalPowerMeter.tsx",
  "VoteStatusIcon.tsx", "MobileVoteStrip.tsx",
]);

const LEAKS: Array<[string, RegExp]> = [
  ["Voted (server-composed English)", /["'>]\s*Voted\s/],
  ["CONNECTED", /["']CONNECTED["']/],
  ["ONLINE", /["']ONLINE["']/],
  ["Seimas Members", /Seimas Members/],
  ["Current term representatives", /Current term representatives/],
  ["No MPs found", /No MPs found/],
  ["Clear Filters", /Clear Filters/],
  ["Loading MP roster", /Loading MP roster/],
  // The forensic engine names are composed client-side and head the
  // „Kodėl toks balas?“ sections on every MP profile.
  ["Benford's Law Analysis", /Benford's Law Analysis/],
  ["Chrono-Forensics", /Chrono-Forensics/],
  ["Vote Geometry", /["']Vote Geometry["']/],
  ["Phantom Network", /["']Phantom Network["']/],
];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) sourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) && !UNREACHABLE.has(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("no English leaks in the Lithuanian UI", () => {
  const files = sourceFiles(SRC);

  it("finds source files to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(LEAKS)("does not contain %s", (_label, pattern) => {
    const offenders = files.filter((f) => {
      const text = readFileSync(f, "utf8");
      // A mention inside a comment is documentation of the fix, not a leak.
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      return pattern.test(code);
    });
    expect(offenders.map((f) => f.replace(SRC, "src"))).toEqual([]);
  });
});
