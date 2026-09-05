import type { MpSummary, VoteDetail } from "../services/api";
import { getPartyColor, getPartyMeta } from "../utils/partyColors";
import { perMemberChoiceState } from "../utils/perMemberChoices";
import { factionLabel } from "../utils/faction";

export type SeatMode = "frakcijos" | "balsavimas" | "dalyvavimas";

export interface LegendEntry {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface SeatEncoding {
  /** What the colours mean, stated on the panel rather than left to a guess. */
  caption: string;
  colorFor: (mp: MpSummary | null) => string | null;
  legend: LegendEntry[];
}

/**
 * The three ways the chamber can be coloured, and what each one is claiming.
 *
 * The rule this file exists to enforce is „no naked colour without a text
 * label“: every mode returns a legend, so a reader is never asked to infer
 * what a colour means. The map used to have one encoding (party) with the
 * legend tucked into a floating overlay that vanished in compact mode — a
 * chamber of 141 coloured dots and nothing saying what the colours were.
 */

/** Choices as the source spells them. A member with no recorded choice is
 *  absent, not "against" — the distinction the whole map depends on. */
const VOTE_STYLES: Array<{ key: string; label: string; color: string }> = [
  { key: "Už", label: "Už", color: "hsl(var(--vote-for))" },
  { key: "Prieš", label: "Prieš", color: "hsl(var(--vote-against))" },
  { key: "Susilaikė", label: "Susilaikė", color: "hsl(var(--vote-abstain))" },
];
const ABSENT_COLOR = "transparent";

export function factionEncoding(mps: MpSummary[]): SeatEncoding {
  const counts = new Map<string, number>();
  for (const m of mps) {
    const p = factionLabel(m.party);
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const legend = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      key: name,
      label: getPartyMeta(name).short,
      count,
      color: getPartyColor(name),
    }));

  return {
    caption: "Spalva — frakcija.",
    colorFor: (mp) => (mp ? getPartyColor(mp.party) : null),
    legend,
  };
}

/**
 * Whether a vote has any recorded per-member choice at all.
 *
 * 1,656 of 5,286 votes (31%) have none. The source does not say why: the LRS
 * comment „Elektroninėmis priemonėmis gauti individualūs balsavimo rezultatai
 * neatitinka protokole įrašytų suminių rezultatų“ was once read as the reason,
 * but it is attached to every vote in the table — including all 3,630 that do
 * publish per-member results — so it explains nothing.
 *
 * Colouring the chamber from one of those would paint 140 hollow seats
 * labelled „Nedalyvavo“, asserting that the entire Seimas skipped a vote. The
 * mode is withheld instead.
 */
export function hasRecordedChoices(vote: VoteDetail | null): boolean {
  // Defers to the shared predicate so „missing" and „unpublished" cannot drift
  // apart between the seat map, the vote page and the MP profile.
  return perMemberChoiceState(vote?.votes) === "present";
}

export function voteEncoding(vote: VoteDetail | null, seatedIds: string[]): SeatEncoding {
  const byId = new Map<string, string | null>();
  for (const v of vote?.votes ?? []) {
    if (v.mp_id) byId.set(v.mp_id, v.choice ?? null);
  }

  const counts = new Map<string, number>();
  let absent = 0;
  for (const id of seatedIds) {
    const choice = byId.get(id) ?? null;
    if (choice && VOTE_STYLES.some((s) => s.key === choice)) {
      counts.set(choice, (counts.get(choice) ?? 0) + 1);
    } else {
      absent += 1;
    }
  }

  const legend: LegendEntry[] = VOTE_STYLES.filter((s) => (counts.get(s.key) ?? 0) > 0).map((s) => ({
    key: s.key,
    label: s.label,
    count: counts.get(s.key) ?? 0,
    color: s.color,
  }));
  if (absent > 0) {
    legend.push({
      key: "nedalyvavo",
      label: "Nedalyvavo",
      count: absent,
      color: ABSENT_COLOR,
    });
  }

  return {
    caption: vote
      ? `Spalva — kaip narys balsavo: ${vote.title}`
      : "Spalva — kaip narys balsavo paskutiniame balsavime.",
    colorFor: (mp) => {
      if (!mp) return null;
      const choice = byId.get(mp.id) ?? null;
      return VOTE_STYLES.find((s) => s.key === choice)?.color ?? ABSENT_COLOR;
    },
    legend,
  };
}

export function presenceEncoding(presentIds: string[], seatedIds: string[]): SeatEncoding {
  const present = new Set(presentIds);
  const here = seatedIds.filter((id) => present.has(id)).length;

  return {
    caption: "Spalva — ar narys balsavo paskutinę posėdžio dieną.",
    colorFor: (mp) => {
      if (!mp) return null;
      return present.has(mp.id) ? "hsl(var(--vote-for))" : ABSENT_COLOR;
    },
    legend: [
      { key: "dalyvavo", label: "Dalyvavo", count: here, color: "hsl(var(--vote-for))" },
      {
        key: "nedalyvavo",
        label: "Nedalyvavo",
        count: seatedIds.length - here,
        color: ABSENT_COLOR,
      },
    ],
  };
}
