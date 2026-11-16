import type { Decree, Government, GovernmentResponse, OfficeHolder } from '../services/api';
import { holdersOf, keptPost } from './valdzia';

/**
 * The register laid out on one time axis, for „Kas ir kada ėjo pareigas".
 *
 * Every date comes from the register; nothing is filled in. A bar starts on the
 * holder's own date where the register gives one (a Prime Minister's
 * appointment, a minister replaced mid-term), otherwise on the Government's
 * mandate or start of work. It ends where the next holder starts, or when the
 * Government resigned. The weeks between a resignation and the next
 * Government's start are left empty: the register does not say who held the
 * post then (§1.1). A post whose start or end is unknown is counted in
 * `undated`, not drawn at a made-up date.
 */

export type Segment = {
  /** 'pm' or a ministry key. */
  row: string;
  holder: OfficeHolder;
  government: string;
  from: string;
  to: string;
  /** Still in office: the bar runs to today. */
  open: boolean;
  /** Same person, same row, in the previous Government — compared by name, as `keptPost`. */
  kept: boolean;
};

export type GovernmentSpan = { numeral: string; from: string; to: string; open: boolean };

export type DecreeKind = 'treaty' | 'veto' | 'bill' | 'nomination';

export type Timeline = {
  start: string;
  end: string;
  today: string;
  governments: GovernmentSpan[];
  segments: Segment[];
  undated: number;
  decrees: { kind: DecreeKind; decree: Decree }[];
};

export const DECREE_KINDS: DecreeKind[] = ['treaty', 'veto', 'bill', 'nomination'];

const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;

/** When a Government's register dates begin: mandate, else start of work. */
export const govStart = (g: Government): string | null => g.mandate_from ?? g.started_work_on;

export function buildTimeline(data: GovernmentResponse, today: string): Timeline {
  const govs = data.governments;
  const governments: GovernmentSpan[] = [];
  const segments: Segment[] = [];
  let undated = 0;

  const push = (row: string, holder: OfficeHolder, g: Government, from: string | null, to: string | null, open: boolean, kept: boolean) => {
    if (!from || !to) { undated += 1; return; }
    segments.push({ row, holder, government: g.numeral, from, to, open, kept });
  };

  govs.forEach((g, gi) => {
    const prev = govs[gi - 1];
    const next = govs[gi + 1];
    const start = govStart(g);
    const last = gi === govs.length - 1;
    const open = last && !g.resigned_on;
    const end = g.resigned_on ?? (next ? govStart(next) : today);

    if (start && end) governments.push({ numeral: g.numeral, from: start, to: end, open });

    if (g.prime_minister) {
      const kept = !!prev?.prime_minister && prev.prime_minister.name === g.prime_minister.name;
      push('pm', g.prime_minister, g, g.prime_minister.from_date ?? start, end, open, kept);
    }

    for (const m of data.ministries) {
      const holders = holdersOf(g, m.key);
      holders.forEach((h, i) => {
        const from = h.from_date ?? (i === 0 ? start : null);
        const isLast = i === holders.length - 1;
        const to = isLast ? end : holders[i + 1].from_date;
        push(m.key, h, g, from, to, open && isLast, i === 0 && keptPost(prev, g, m.key));
      });
    }
  });

  const acts = data.presidential_acts;
  const decrees = acts ? DECREE_KINDS.flatMap((kind) => acts[kind].map((decree) => ({ kind, decree }))) : [];

  const dates = [
    ...segments.flatMap((s) => [s.from, s.to]),
    ...governments.map((g) => g.from),
    ...decrees.map((d) => d.decree.listed_on),
    today,
  ].sort();
  const first = dates[0];
  const lastDate = dates[dates.length - 1];
  const start = `${first.slice(0, 7)}-01`;
  const y = +lastDate.slice(0, 4);
  const mo = +lastDate.slice(5, 7);
  const end = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`;

  return { start, end, today, governments, segments, undated, decrees };
}

/** Where a date falls on the axis, 0–100. */
export function position(t: Pick<Timeline, 'start' | 'end'>, iso: string): number {
  return ((day(iso) - day(t.start)) / (day(t.end) - day(t.start))) * 100;
}

// LT-COPY: needs native review
const MONTHS = ['sau', 'vas', 'kov', 'bal', 'geg', 'birž', 'liep', 'rugp', 'rugs', 'spal', 'lapkr', 'gruod'];

/** Quarter starts inside the axis, labelled: the year in January, the month otherwise. */
export function quarterTicks(t: Pick<Timeline, 'start' | 'end'>): { date: string; label: string; year: boolean }[] {
  const ticks: { date: string; label: string; year: boolean }[] = [];
  let y = +t.start.slice(0, 4);
  let m = +t.start.slice(5, 7);
  for (;;) {
    const date = `${y}-${String(m).padStart(2, '0')}-01`;
    if (date > t.end) break;
    if ((m - 1) % 3 === 0 && date >= t.start) ticks.push({ date, label: m === 1 ? String(y) : MONTHS[m - 1], year: m === 1 });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return ticks;
}
