import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * §3.1 and §3.6: no composite, no composite-derived rank, and no import path
 * from a public page to an aggregation function.
 *
 * The recon table listed seven surfaces that rendered the composite. This is
 * that table as an assertion, plus the guard that stops a new one appearing:
 * a page component that cannot import the aggregation cannot render it.
 */
const SRC = join(__dirname, "..");

const DEAD =
  /Party_Clan|Admin_Server|SeatingMap|ComponentBreakdown|AlignmentScore|AlignmentResult|MpSelector|VoteListCard|SwipeableVote|SessionOverview|VerticalPower|DivergingBar|DocCard|CommandPalette|ConflictAlert|MobileVoteStrip|TokenHandOff|MenuTrigger|VoteStatusIcon|ActivityItem|VoteDiffRow|ForensicExplainer|Header\.tsx|components\/VotesListView/;

function sourceFiles(dirs: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (!["ui", "stories", "figma"].includes(entry)) walk(full);
      } else if (/\.tsx?$/.test(entry) && !/\.test\./.test(entry) && !DEAD.test(full)) {
        out.push(full);
      }
    }
  };
  dirs.forEach((d) => walk(join(SRC, d)));
  return out;
}

const code = (f: string) =>
  readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("no verdict reaches a surface", () => {
  const files = sourceFiles(["views", "components", "utils", "services"]);

  it("finds the surfaces to check", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  // One assertion per thing the recon table said had to go.
  it.each([
    ["the composite score", /finalIntegrityScore|final_integrity_score/],
    ["its base-risk inputs", /baseRiskScore|baseRiskPenalty|base_risk_score/],
    ["the integrity dimension", /["']integrity["']/],
    ["the RPG alignment label", /Lawful Good|["']alignment["']\s*:/],
    ["xp and levels", /\bxp_next_level\b|\bxp_current_level\b/],
    ["artifacts", /["']artifacts["']/],
    ["the heroes/watchlist endpoint", /heroes-villains|getAccountabilitySnapshot/],
    ["a composite-derived rank", /integrity_score|risk_score/],
    // Named composites are the easy half. This catches one invented in place:
    // a „Skaidrumo indeksas" panel ranked members by `100 - attendance`, under
    // a label describing something else, and no keyword search would have
    // found it.
    ["a locally invented composite", /100\s*-\s*(?:mp\.|row\.|item\.)?\w*[Aa]ttendance/],
  ])("renders no %s", (_label, pattern) => {
    const offenders = files.filter((f) => pattern.test(code(f)));
    expect(offenders.map((f) => f.replace(SRC, "src"))).toEqual([]);
  });

  it("no page component imports an aggregation function", () => {
    // §3.6 as an import-graph guard rather than a naming convention: a view
    // that cannot reach the aggregation cannot accidentally surface it.
    const views = sourceFiles(["views"]);
    const banned = /from ["'][^"']*forensicBreakdownToFlags["']|aggregate|compositeScore/;
    const offenders = views.filter((f) => banned.test(code(f)));
    expect(offenders.map((f) => f.replace(SRC, "src"))).toEqual([]);
  });

  it("keeps exactly the five dimensions", async () => {
    const { CIVIC_DIMENSION_ORDER } = await import("../utils/mpLegacyDimensions");
    expect(CIVIC_DIMENSION_ORDER).toHaveLength(5);
  });
});
