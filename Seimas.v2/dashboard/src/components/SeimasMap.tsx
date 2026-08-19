import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, Mic, Users, X, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';
import { MpSummary } from '../services/api';
import { getPartyColor, getPartyShort, getPartyMeta } from '../utils/partyColors';
import { useTapReveal } from '../hooks/useTapReveal';
import { SEIMAS_SEATS_TOTAL, vacancyLabel } from '../utils/mpCounts';

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
}

export function SeimasMap({ mps = [], compact = false }: SeimasMapProps) {
  const navigate = useNavigate();
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
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
      const p = m.party || 'Unknown';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, ...getPartyMeta(name) }));
  }, [activeMps]);

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
      {!compact && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card border border-border p-3 rounded-xl">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rasti narį..."
              className="w-full bg-muted/50 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent bg-muted text-muted-foreground whitespace-nowrap">
              <Users className="w-3.5 h-3.5" />
              {activeMps.length} iš {SEIMAS_SEATS_TOTAL} vietų
              {vacancyLabel(SEIMAS_SEATS_TOTAL - activeMps.length)
                ? ` · ${vacancyLabel(SEIMAS_SEATS_TOTAL - activeMps.length)}` : ''}
            </div>
            <div className="h-4 w-px bg-border mx-1" />
            {parties.slice(0, 5).map(p => (
              <button
                key={p.name}
                onClick={() => setSelectedParty(selectedParty === p.name ? null : p.name)}
                className={cn(
                  'h-6 px-2 rounded-full border-2 transition-all flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-white',
                  selectedParty === p.name ? 'ring-2 ring-offset-2 ring-primary scale-105' : 'opacity-80 hover:opacity-100',
                  'border-white/10',
                )}
                style={{ backgroundColor: p.hex }}
                title={p.name}
              >
                {p.short}
              </button>
            ))}
            {selectedParty && (
              <button onClick={() => setSelectedParty(null)} className="text-xs text-muted-foreground underline ml-1">
                Valyti
              </button>
            )}
          </div>
        </div>
      )}

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
                          ? 'cursor-pointer border border-black/10 dark:border-white/10'
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
                        backgroundColor: seat.mp ? getPartyColor(seat.mp.party) : 'transparent',
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
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{seat.mp.vote_count} balsų</span>
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

            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center opacity-70"
              style={{ top: `${((BASELINE_Y - 6) / MAP_HEIGHT) * 100}%` }}
            >
              <div className="w-14 h-7 bg-card border border-border rounded-lg shadow-md flex items-center justify-center">
                <Mic className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="w-28 h-8 bg-muted border border-border/50 rounded-t-2xl mt-1" />
            </div>
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
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {revealedMp.vote_count} balsų
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

        {!compact && (
          <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2 max-w-[90%]">
            <div className="flex flex-wrap gap-3 bg-background/90 backdrop-blur p-2 px-3 rounded-lg border border-border shadow-sm text-[10px] text-muted-foreground font-medium">
              {parties.slice(0, 6).map(p => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.hex }} />
                  {p.short} ({p.count})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
