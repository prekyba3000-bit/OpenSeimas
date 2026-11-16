import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Decree, GovernmentResponse } from '../services/api';
import { cn } from './ui/utils';
import { shortName } from '../utils/valdzia';
import { DECREE_KINDS, buildTimeline, position, quarterTicks } from '../utils/valdziaTimeline';
import type { DecreeKind, Segment } from '../utils/valdziaTimeline';

/**
 * „Kas ir kada ėjo pareigas" — the three Governments of this Seimas term on
 * one time axis, with the President's decrees to the Seimas beneath them.
 *
 * One bar is one person in one post. Pressing a bar picks that person (shared
 * with the cabinets table) and draws a line through every post they held, so
 * a move from a ministry to the Prime Minister's office and back reads at a
 * glance. Bar length is time only; nothing is scored. Dates and gaps follow
 * `buildTimeline`, which never fills in a date the register lacks.
 */

const ROW = 32; // px per row
const BAR = 20; // px; marks stay under the 24 px cap
const GAP = 12; // px between the cabinet rows and the decree lanes
const CHAR = 6.6; // px per character of text-xs — a safe estimate for fitting a label in a bar

// LT-COPY: needs native review — every string in this file.
const KIND_LABEL: Record<DecreeKind, string> = {
  treaty: 'Sutartys', veto: 'Veto', bill: 'Projektai', nomination: 'Skyrimai',
};

type Hover = { segment: Segment } | { kind: DecreeKind; decree: Decree };

/** The name if it fits, else the surname, else nothing: a label is never clipped. */
function barLabel(name: string, px: number): string {
  const room = px - 12;
  if (name.length * CHAR <= room) return name;
  const surname = name.split(' ').pop() ?? '';
  return surname.length * CHAR <= room ? surname : '';
}

function usePlotWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const until = (s: Segment) => (s.open ? 'iki šiol' : `iki ${s.to}`);
const describe = (s: Segment) => `${s.holder.name}, ${s.holder.title}, ${s.government} Vyriausybė, nuo ${s.from} ${until(s)}`;

export function ValdziaTimeline({ data, picked, onPick, today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vilnius' }) }: {
  data: GovernmentResponse;
  picked: string | null;
  onPick: (name: string) => void;
  today?: string;
}) {
  const t = useMemo(() => buildTimeline(data, today), [data, today]);
  const [plotRef, width] = usePlotWidth();
  const [hover, setHover] = useState<Hover | null>(null);

  const rows = [
    { key: 'pm', label: 'Ministras Pirmininkas' },
    ...data.ministries.map((m) => ({ key: m.key, label: shortName(m.name) })),
  ];
  const rowOf = new Map(rows.map((r, i) => [r.key, i]));
  const lanes = data.presidential_acts ? DECREE_KINDS : [];
  const lanesTop = rows.length * ROW + GAP;
  const height = lanes.length ? lanesTop + lanes.length * ROW : rows.length * ROW;
  const x = (iso: string) => position(t, iso);
  const yMid = (row: string) => (rowOf.get(row) ?? 0) * ROW + ROW / 2;

  // Same person, same post, both sides of a change of Government.
  const bridges = t.segments.flatMap((s) => {
    if (!s.kept) return [];
    const before = t.segments
      .filter((p) => p.row === s.row && p.to <= s.from)
      .sort((a, b) => a.to.localeCompare(b.to))
      .pop();
    return before && before.holder.name === s.holder.name ? [{ row: s.row, from: before.to, to: s.from, name: s.holder.name }] : [];
  });

  const mine = picked
    ? t.segments.filter((s) => s.holder.name === picked).sort((a, b) => a.from.localeCompare(b.from))
    : [];
  const moves = mine.slice(1).flatMap((b, i) => {
    const a = mine[i];
    if (a.row === b.row) return [];
    const x1 = x(a.to); const x2 = x(b.from); const xm = (x1 + x2) / 2;
    const y1 = yMid(a.row); const y2 = yMid(b.row);
    return [`M ${x1} ${y1} C ${xm} ${y1}, ${xm} ${y2}, ${x2} ${y2}`];
  });

  const hoverHandlers = (h: Hover) => ({
    onMouseEnter: () => setHover(h), onMouseLeave: () => setHover(null),
    onFocus: () => setHover(h), onBlur: () => setHover(null),
  });

  return (
    <section aria-labelledby="laikas" className="space-y-4">
      <div className="max-w-3xl">
        <h2 id="laikas" className="text-xl font-semibold">Kas ir kada ėjo pareigas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visos šios Seimo kadencijos Vyriausybės vienoje laiko juostoje, o apačioje – ką Prezidentas tuo pačiu metu
          perdavė Seimui. Paspauskite juostą, ir linija sujungs visas to žmogaus pareigas.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {/* Labels stay pinned while the plot scrolls under them on a narrow screen. */}
        <div className="min-w-[60rem] grid grid-cols-[9rem_1fr] md:grid-cols-[13rem_1fr] py-3 pr-3">
          <div className="sticky left-0 z-10 bg-card pl-3 pr-3" />
          {/* Government names over their spans, quarter ticks under them. */}
          <div className="relative h-11" aria-hidden="true">
            {t.governments.map((g) => {
              const px = ((x(g.to) - x(g.from)) / 100) * width;
              return (
                <span key={g.numeral} className="absolute top-0 text-center text-xs font-semibold whitespace-nowrap"
                  style={{ left: `${x(g.from)}%`, width: `${x(g.to) - x(g.from)}%` }}>
                  {px > 110 ? `${g.numeral} Vyriausybė` : g.numeral}
                </span>
              );
            })}
            {quarterTicks(t).map((q) => (
              <span key={q.date} className={cn('absolute top-6 pl-1 text-xs tabular-nums whitespace-nowrap', q.year ? 'font-semibold' : 'text-muted-foreground')}
                style={{ left: `${x(q.date)}%` }}>
                {q.label}
              </span>
            ))}
          </div>

          <div className="sticky left-0 z-10 bg-card pl-3 pr-3 text-xs leading-tight" style={{ height }}>
            {rows.map((r) => (
              <div key={r.key} className={cn('flex items-center', r.key === 'pm' && 'font-semibold')} style={{ height: ROW }}>{r.label}</div>
            ))}
            {lanes.length > 0 && <div style={{ height: GAP }} />}
            {lanes.map((k) => (
              <div key={k} className="flex items-center text-muted-foreground" style={{ height: ROW }}>{KIND_LABEL[k]}</div>
            ))}
          </div>

          <div ref={plotRef} className="relative" style={{ height }}>
            {/* Backdrop: Government spans (the gaps stay bare), quarter gridlines, today. */}
            {t.governments.map((g) => (
              <div key={g.numeral} className="absolute inset-y-0 bg-muted/60" aria-hidden="true"
                style={{ left: `${x(g.from)}%`, width: `${x(g.to) - x(g.from)}%` }} />
            ))}
            {quarterTicks(t).map((q) => (
              <div key={q.date} className="absolute inset-y-0 w-px bg-border" style={{ left: `${x(q.date)}%` }} aria-hidden="true" />
            ))}
            <div className="absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${x(t.today)}%` }} aria-hidden="true" />

            {bridges.map((b) => (
              <div key={`${b.row}-${b.from}`} aria-hidden="true"
                className={cn('absolute h-0.5', picked === b.name ? 'bg-attention' : 'bg-primary', picked && picked !== b.name && 'opacity-30')}
                style={{ left: `${x(b.from)}%`, width: `${x(b.to) - x(b.from)}%`, top: yMid(b.row) - 1 }} />
            ))}

            {t.segments.map((s) => {
              const own = picked === s.holder.name;
              const w = x(s.to) - x(s.from);
              return (
                <button
                  key={`${s.row}-${s.government}-${s.from}`}
                  type="button"
                  onClick={() => onPick(s.holder.name)}
                  {...hoverHandlers({ segment: s })}
                  aria-pressed={own}
                  aria-label={describe(s)}
                  className={cn(
                    'absolute rounded-[4px] px-1.5 text-left text-xs font-medium leading-5 whitespace-nowrap transition-opacity',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                    own ? 'bg-attention text-attention-foreground' : 'bg-primary text-primary-foreground',
                    picked && !own && 'opacity-30',
                    s.open && 'rounded-r-none',
                  )}
                  style={{
                    left: `calc(${x(s.from)}% + 1px)`,
                    width: `max(2px, calc(${w}% - 2px))`,
                    top: (rowOf.get(s.row) ?? 0) * ROW + (ROW - BAR) / 2,
                    height: BAR,
                  }}
                >
                  {barLabel(s.holder.name, (w / 100) * width)}
                </button>
              );
            })}

            {moves.length > 0 && (
              <svg className="absolute inset-x-0 top-0 w-full pointer-events-none overflow-visible" style={{ height: rows.length * ROW }}
                viewBox={`0 0 100 ${rows.length * ROW}`} preserveAspectRatio="none" aria-hidden="true">
                {moves.map((d) => (
                  <path key={d} d={d} fill="none" stroke="hsl(var(--attention))" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
            )}

            {t.decrees.map(({ kind, decree }) => {
              const label = `${decree.listed_on}${decree.decree_no ? ` · Nr. ${decree.decree_no}` : ''} · ${decree.title}`;
              const style = { left: `${x(decree.listed_on)}%`, top: lanesTop + DECREE_KINDS.indexOf(kind) * ROW + (ROW - 24) / 2 };
              const dot = <span className="block w-2.5 h-2.5 rounded-full bg-foreground/70 ring-2 ring-card group-hover:bg-foreground group-focus-visible:bg-foreground" />;
              const cls = 'group absolute -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring';
              // No file on lrp.lt: a dot without a link that would lead nowhere.
              return decree.url ? (
                <a key={`${kind}-${label}`} href={decree.url} target="_blank" rel="noreferrer" aria-label={label}
                  className={cls} style={style} {...hoverHandlers({ kind, decree })}>{dot}</a>
              ) : (
                <span key={`${kind}-${label}`} className={cls} style={style} {...hoverHandlers({ kind, decree })}>{dot}</span>
              );
            })}
          </div>

          <div className="sticky left-0 z-10 bg-card pl-3 pr-3" />
          <div className="relative h-5" aria-hidden="true">
            <span className="absolute top-1 -translate-x-full pr-1 text-xs text-muted-foreground whitespace-nowrap tabular-nums"
              style={{ left: `${x(t.today)}%` }}>
              šiandien, {t.today}
            </span>
          </div>
        </div>
      </div>

      {/* What the pointer is on; otherwise the picked person's posts in order — the line, in words. */}
      <div className="min-h-[2.5rem] text-sm max-w-4xl">
        {hover && 'segment' in hover ? (
          <p>
            <strong>{hover.segment.holder.name}</strong> · {hover.segment.holder.title} · {hover.segment.government} Vyriausybė ·
            nuo {hover.segment.from} {until(hover.segment)}
          </p>
        ) : hover && 'decree' in hover ? (
          <p>
            <span className="text-muted-foreground">{hover.decree.listed_on}{hover.decree.decree_no && ` · Nr. ${hover.decree.decree_no}`} · {KIND_LABEL[hover.kind]}</span>
            <span className="block text-xs leading-snug">{hover.decree.title}</span>
          </p>
        ) : mine.length > 0 ? (
          <p>
            <strong>{picked}</strong>:{' '}
            {mine.map((s) => `${s.holder.title} (${s.government}, nuo ${s.from} ${until(s)})`).join(' → ')}
          </p>
        ) : (
          <p className="text-muted-foreground">Užveskite žymeklį ant juostos ar taško, kad pamatytumėte datas.</p>
        )}
      </div>

      <ul className="text-xs text-muted-foreground space-y-1 max-w-3xl">
        <li>
          Juosta – vienas žmogus vienose pareigose. Ji prasideda Vyriausybės įgaliojimų arba darbo pradžioje, o
          Ministro Pirmininko ir vėliau paskirto ministro – jų paskyrimo dieną. Baigiasi, kai Vyriausybė atsistatydina
          arba pareigas pradeda kitas žmogus.
        </li>
        <li>
          Pilkas fonas – Vyriausybės laikas. Tarpas tarp atsistatydinimo ir naujos Vyriausybės paliktas tuščias:
          registre nėra, kas tuo metu ėjo pareigas. Plona linija jungia juostas, kai tas pats žmogus liko tose pačiose
          pareigose ir naujoje Vyriausybėje.
        </li>
        <li>
          {lanes.length > 0
            ? 'Taškai – Prezidento dekretai, kuriuos jis perdavė Seimui, pagal lrp.lt paskelbimo datą. Paspaudus tašką atsidaro dekretas.'
            : 'Prezidento dekretai dar neįkelti, todėl taškų nerodome. Tai nereiškia, kad dekretų nebuvo.'}
        </li>
        <li>Juostos ilgis rodo tik laiką. Žmonių nevertiname ir nelyginame.</li>
        {t.undated > 0 && (
          // §1.1: a post we cannot date is named as missing, not drawn somewhere plausible.
          <li>{t.undated} pareigų įrašų be datos laiko juostoje nerodome; jie yra lentelėje žemiau.</li>
        )}
      </ul>
    </section>
  );
}
