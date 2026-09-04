import React, { useEffect, useState, useMemo } from 'react';
import { ltPlural } from '../utils/ltPlural';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';
import { MpSummary } from '../services/api';
import { getPartyColor, getPartyShort, getPartyMeta } from '../utils/partyColors';
import { useTapReveal } from '../hooks/useTapReveal';
import { SEIMAS_SEATS_TOTAL, vacancyLabel } from '../utils/mpCounts';
import {
  SeatMode,
  SeatEncoding,
  factionEncoding,
  voteEncoding,
  presenceEncoding,
  hasRecordedChoices,
} from './seatMapModes';
import type { LastSittingDay, VoteDetail } from '../services/api';
import { factionLabel } from '../utils/faction';

export interface Seat {
  id: string;
  x: number;
  y: number;
  mp: MpSummary | null;
}

/**
 * Coordinate space for the hemicycle.
 *
 * The seats were laid out around (300, 350) inside a 600x400 box, but the
 * outermost row used radius 390 — so the arc actually spanned x = -90..655 and
 * the parent's overflow-hidden silently cut roughly 90px of seats off the left
 * edge and 55px off the right. The chamber was drawn with its ends missing.
 *
 * Centre and box are now derived from the largest radius the layout can reach,
 * so every seat lands inside with a margin instead of by luck.
 */
const HEMICYCLE = {
  rows: 8,
  innerRadius: 180,
  rowGap: 35,
  margin: 10,
} as const;

const MAX_RADIUS = HEMICYCLE.innerRadius + (HEMICYCLE.rows - 1) * HEMICYCLE.rowGap;
const CENTER_X = MAX_RADIUS + HEMICYCLE.margin;
const BASELINE_Y = MAX_RADIUS + HEMICYCLE.margin;
export const MAP_WIDTH = CENTER_X * 2;
export const MAP_HEIGHT = BASELINE_Y + HEMICYCLE.margin * 2;

function generateHemicycle(count: number): { x: number; y: number }[] {
  const seats: { x: number; y: number }[] = [];
  let idx = 0;
  for (let r = 0; r < HEMICYCLE.rows; r++) {
    const radius = HEMICYCLE.innerRadius + r * HEMICYCLE.rowGap;
    const seatsInRow = 12 + r * 4;
    for (let s = 0; s < seatsInRow; s++) {
      if (idx >= count) break;
      const angle = Math.PI - (Math.PI / (seatsInRow - 1)) * s;
      seats.push({
        x: CENTER_X + Math.cos(angle) * radius,
        y: BASELINE_Y - Math.sin(angle) * radius,
      });
      idx++;
    }
  }
  return seats;
}

interface SeimasMapProps {
  mps?: MpSummary[];
  compact?: boolean;
  /** The most recent completed vote, for the „Balsavimas" encoding. */
  latestVote?: VoteDetail | null;
  /** Last-sitting-day presence, for the „Dalyvavimas" encoding. */
  lastSittingDay?: LastSittingDay | null;
}

export function SeimasMap({
  mps = [],
  compact = false,
  latestVote = null,
  lastSittingDay = null,
}: SeimasMapProps) {
  const navigate = useNavigate();
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [mode, setMode] = useState<SeatMode>('frakcijos');
  const { isTouch, revealedId, activate, dismiss } = useTapReveal();

  const activeMps = useMemo(
    () => mps.filter(m => m.is_active !== false),
    [mps],
  );

  // Always draw the full chamber. Sizing the hemicycle to the number of sitting
  // members would silently redraw parliament smaller whenever a seat is vacant —
  // a reader counting dots would get 140 and never learn there are 141 seats.
  const layout = useMemo(() => generateHemicycle(SEIMAS_SEATS_TOTAL), []);

  const parties = useMemo(() => {
    const counts: Record<string, number> = {};
    activeMps.forEach(m => {
      const p = factionLabel(m.party);
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, ...getPartyMeta(name) }));
  }, [activeMps]);

  const seatedIds = useMemo(() => activeMps.map(m => m.id), [activeMps]);

  // Modes whose data has not arrived are not offered. An empty „Balsavimas"
  // map would be 141 identical grey dots reading as "nobody voted".
  const availableModes = useMemo(() => {
    const list: Array<{ id: SeatMode; label: string }> = [
      { id: 'frakcijos', label: 'Frakcijos' },
    ];
    // Withheld when the source published no per-member results for this vote
    // — see hasRecordedChoices. An all-absent chamber is a claim, not a gap.
    if (hasRecordedChoices(latestVote)) list.push({ id: 'balsavimas', label: 'Balsavimas' });
    if (lastSittingDay?.mps_present_ids?.length) {
      list.push({ id: 'dalyvavimas', label: 'Dalyvavimas' });
    }
    return list;
  }, [latestVote, lastSittingDay]);

  const activeMode = availableModes.some(m => m.id === mode) ? mode : 'frakcijos';

  const encoding: SeatEncoding = useMemo(() => {
    if (activeMode === 'balsavimas') return voteEncoding(latestVote, seatedIds);
    if (activeMode === 'dalyvavimas') {
      return presenceEncoding(lastSittingDay?.mps_present_ids ?? [], seatedIds);
    }
    return factionEncoding(activeMps);
  }, [activeMode, activeMps, latestVote, lastSittingDay, seatedIds]);

  const seats: (Seat & { isDimmed: boolean })[] = useMemo(() => {
    return layout.map((pos, i) => {
      const mp = activeMps[i] ?? null;
      const matchesSearch =
        !searchTerm || (mp?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesParty = !selectedParty || mp?.party === selectedParty;
      return {
        id: mp?.id ?? `empty-${i}`,
        x: pos.x,
        y: pos.y,
        mp,
        isDimmed: (!!searchTerm && !matchesSearch) || (!!selectedParty && !matchesParty),
      };
    });
  }, [layout, activeMps, searchTerm, selectedParty]);

  // The panel takes the hemicycle's own aspect ratio, so the chamber always
  // fits whatever width it is given. The previous fixed scale steps
  // (scale-[0.5] … lg:scale-100) were tuned to one panel width and clipped the
  // outer rows everywhere else.
  const mapAspect = `${MAP_WIDTH} / ${MAP_HEIGHT}`;

  const revealedMp = useMemo(
    () => (revealedId ? seats.find(s => s.mp?.id === revealedId)?.mp ?? null : null),
    [seats, revealedId],
  );

  const openProfile = (mp: MpSummary) => navigate(`/dashboard/mps/${mp.id}`);

  return (
    <div className="flex flex-col gap-3">
      {/* The panel states its own encoding. A chamber of 141 coloured dots
          means nothing without a sentence saying what the colour is. */}
      <div className="flex flex-col gap-3">
        {availableModes.length > 1 && (
          <div
            className="inline-flex w-fit rounded-lg border border-border bg-muted p-1"
            role="group"
            aria-label="Ką rodo spalvos"
          >
            {availableModes.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={activeMode === m.id}
                className={cn(
                  'min-h-9 px-3 rounded-md text-sm font-medium transition-colors',
                  activeMode === m.id
                    ? 'bg-card text-foreground shadow-card'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground line-clamp-2">{encoding.caption}</p>

        {/* „Rask savo narį“ — by name. The wireframe asked for a district
            lookup, but constituency_number and constituency_name are NULL for
            all 148 members: migration 010 added the columns and nothing ever
            filled them. Inventing a district for a member would be the exact
            failure this project exists to avoid, so the affordance is name
            search and the data gap is in the backlog. */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
            <input
              // `type="text"`, not `type="search"`: a search input brings its
              // own clear button, which fought with ours.
              type="text"
              placeholder="Rask savo narį — vardas ar pavardė"
              aria-label="Rask savo narį pagal vardą"
              // `placeholder:text-muted-foreground` is not optional. Without it the
              // colour falls to the user agent's default, and in the Android
              // WebView that rendered invisible — on the phone this was a box
              // with a magnifier in it and no indication of what to type. Every
              // other input in the app already sets it; this one was written
              // without it.
              className="w-full min-h-11 bg-card border border-input rounded-lg pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Išvalyti paiešką"
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <span className="text-sm text-muted-foreground">
            {activeMps.length} iš {SEIMAS_SEATS_TOTAL} vietų
            {vacancyLabel(SEIMAS_SEATS_TOTAL - activeMps.length)
              ? ` · ${vacancyLabel(SEIMAS_SEATS_TOTAL - activeMps.length)}` : ''}
          </span>
        </div>

        {!compact && activeMode === 'frakcijos' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {parties.slice(0, 5).map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => setSelectedParty(selectedParty === p.name ? null : p.name)}
                aria-pressed={selectedParty === p.name}
                className={cn(
                  'min-h-9 px-3 rounded-full border transition-all flex items-center gap-1.5 shrink-0 text-sm font-medium text-white',
                  selectedParty === p.name ? 'ring-2 ring-offset-2 ring-ring' : 'opacity-90 hover:opacity-100',
                  'border-black/10',
                )}
                style={{ backgroundColor: p.hex }}
                title={p.name}
              >
                {p.short}
              </button>
            ))}
            {selectedParty && (
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="min-h-9 px-2 text-sm text-muted-foreground underline"
              >
                Valyti
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className="relative w-full bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl overflow-hidden shadow-inner select-none"
        style={{ aspectRatio: mapAspect }}
      >
        <div className="absolute inset-0 z-10">
          <div className="relative h-full w-full">
            <TooltipProvider delayDuration={0}>
              {seats.map((seat, i) => (
                <Tooltip key={seat.id}>
                  <TooltipTrigger asChild>
                    <div
                      role={seat.mp ? 'button' : undefined}
                      tabIndex={seat.mp ? 0 : undefined}
                      aria-label={seat.mp?.name}
                      className={cn(
                        'absolute w-[14px] h-[14px] rounded-full shadow-sm transition-all duration-300 ease-out',
                        seat.mp
                          ? 'cursor-pointer border border-black/10 dark:border-border'
                          // Vacant seat: hollow, so it reads as an empty seat
                          // rather than an unnamed member.
                          : 'border-2 border-dashed border-muted-foreground/40 bg-transparent cursor-default',
                        // Invisible padding widens the tap target from 14px to
                        // 34px in map coordinates — the tightest neighbour
                        // spacing, so it is the largest slot that still cannot
                        // overlap an adjacent seat. Scaled down on a phone it
                        // is still under 44px: 141 seats cannot each be 44px in
                        // this area, which is why a tap reveals who the seat
                        // belongs to rather than navigating straight there.
                        "before:absolute before:-inset-[10px] before:content-['']",
                        seat.isDimmed ? 'opacity-10 scale-75' : '',
                        (hoveredSeat === i || (!!seat.mp && revealedId === seat.mp.id)) &&
                          'z-50 ring-2 ring-foreground',
                      )}
                      style={{
                        // Percentages, not map pixels: the seat keeps its place
                        // in the chamber at any panel width.
                        left: `${(seat.x / MAP_WIDTH) * 100}%`,
                        top: `${(seat.y / MAP_HEIGHT) * 100}%`,
                        // Centring and the hover magnification share one
                        // transform: an inline transform overrides Tailwind's
                        // scale utility, so composing them here keeps the
                        // highlight working.
                        transform:
                          hoveredSeat === i || (!!seat.mp && revealedId === seat.mp.id)
                            ? 'translate(-50%, -50%) scale(2)'
                            : 'translate(-50%, -50%)',
                        backgroundColor: encoding.colorFor(seat.mp) ?? 'transparent',
                      }}
                      onClick={() => {
                        if (!seat.mp) return;
                        // On touch the first tap only reveals who this is.
                        if (activate(seat.mp.id)) openProfile(seat.mp);
                      }}
                      onKeyDown={e => {
                        if (!seat.mp || (e.key !== 'Enter' && e.key !== ' ')) return;
                        e.preventDefault();
                        openProfile(seat.mp);
                      }}
                      onMouseEnter={() => setHoveredSeat(i)}
                      onMouseLeave={() => setHoveredSeat(null)}
                    />
                  </TooltipTrigger>
                  {seat.mp && !isTouch && (
                    <TooltipContent side="top" className="p-0 overflow-hidden bg-popover border-border rounded-lg shadow-xl">
                      <div className="flex flex-col w-[220px]">
                        <div className="h-10 relative" style={{ backgroundColor: getPartyColor(seat.mp.party) + '33' }}>
                          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
                        </div>
                        <div className="px-4 pb-3 -mt-5 flex flex-col gap-1.5">
                          <div className="flex items-end gap-3">
                            <img
                              src={seat.mp.photo_url}
                              alt=""
                              className="w-10 h-10 rounded-lg bg-muted object-cover border-2 border-background shadow-sm"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white mb-0.5"
                              style={{ backgroundColor: getPartyColor(seat.mp.party) }}
                            >
                              {getPartyShort(seat.mp.party)}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm leading-tight">{seat.mp.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{seat.mp.vote_count} {ltPlural(seat.mp.vote_count, 'balsas', 'balsai', 'balsų')}</span>
                            <span>•</span>
                            <span>{seat.mp.attendance?.toFixed(0) ?? '—'}% dalyvavimas</span>
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </TooltipProvider>

            {/* A microphone icon sat here on a drawn rostrum. It implied a
                live session the app has no data for — the last sitting was
                weeks ago — so it was decoration claiming a state. Removed
                rather than restyled. */}
          </div>
        </div>

        {/* Touch has no hover, so the seat's detail card cannot be a tooltip.
            It sits here instead, where it always fits on screen and can carry a
            full-size control to actually open the profile. */}
        {isTouch && revealedMp && (
          <div className="absolute inset-x-2 bottom-2 z-30 rounded-xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
            <div className="flex items-start gap-3">
              <img
                src={revealedMp.photo_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg border border-border bg-muted object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{revealedMp.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {revealedMp.party || 'Nepriklausomas (-a)'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {revealedMp.vote_count} {ltPlural(revealedMp.vote_count, 'balsas', 'balsai', 'balsų')}
                  {typeof revealedMp.attendance === 'number'
                    ? ` · ${revealedMp.attendance.toFixed(0)}% dalyvavimas`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Uždaryti"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => openProfile(revealedMp)}
              className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Atidaryti profilį
            </button>
          </div>
        )}

      </div>

      {/* The legend is part of the panel, not an overlay that disappears in
          compact mode. In „Balsavimas" it doubles as the tally, which is why
          it carries counts in every mode rather than colour swatches alone. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {encoding.legend.map(entry => (
          <span key={entry.key} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                entry.color === 'transparent'
                  ? 'border-2 border-dashed border-muted-foreground/50'
                  : 'border border-black/10 dark:border-border',
              )}
              style={entry.color === 'transparent' ? undefined : { backgroundColor: entry.color }}
              aria-hidden
            />
            {entry.label} ({entry.count})
          </span>
        ))}
      </div>
    </div>
  );
}
