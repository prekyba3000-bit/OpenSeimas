import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, Mic, Users, X, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';
import { MpSummary } from '../services/api';
import { getPartyColor, getPartyShort, getPartyMeta } from '../utils/partyColors';

export interface Seat {
  id: string;
  x: number;
  y: number;
  mp: MpSummary | null;
}

function generateHemicycle(count: number): { x: number; y: number }[] {
  const seats: { x: number; y: number }[] = [];
  const rows = 8;
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const radius = 180 + r * 35;
    const seatsInRow = 12 + r * 4;
    for (let s = 0; s < seatsInRow; s++) {
      if (idx >= count) break;
      const angle = Math.PI - (Math.PI / (seatsInRow - 1)) * s;
      seats.push({
        x: 300 + Math.cos(angle) * radius,
        y: 350 - Math.sin(angle) * radius,
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

  const activeMps = useMemo(
    () => mps.filter(m => m.is_active !== false),
    [mps],
  );

  const layout = useMemo(() => generateHemicycle(activeMps.length || 141), [activeMps.length]);

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

  const mapHeight = compact ? 'aspect-[16/8]' : 'aspect-[16/10]';

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
              {activeMps.length} nariai
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

      <div className={cn(
        'relative w-full bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl overflow-hidden shadow-inner select-none',
        mapHeight,
      )}>
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
          <div className="relative w-[600px] h-[400px] scale-[0.5] sm:scale-[0.7] md:scale-[0.85] lg:scale-100 origin-center transition-transform duration-500">
            <TooltipProvider delayDuration={0}>
              {seats.map((seat, i) => (
                <Tooltip key={seat.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'absolute w-[14px] h-[14px] rounded-full cursor-pointer shadow-sm border border-black/10 dark:border-white/10',
                        'transition-all duration-300 ease-out',
                        seat.isDimmed ? 'opacity-10 scale-75' : '',
                        hoveredSeat === i && 'z-50 ring-2 ring-foreground scale-[2]',
                      )}
                      style={{
                        left: seat.x,
                        top: seat.y,
                        backgroundColor: seat.mp ? getPartyColor(seat.mp.party) : '#374151',
                      }}
                      onClick={() => seat.mp && navigate(`/dashboard/mps/${seat.mp.id}`)}
                      onMouseEnter={() => setHoveredSeat(i)}
                      onMouseLeave={() => setHoveredSeat(null)}
                    />
                  </TooltipTrigger>
                  {seat.mp && (
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

            <div className="absolute left-1/2 -translate-x-1/2 top-[340px] flex flex-col items-center opacity-70">
              <div className="w-14 h-7 bg-card border border-border rounded-lg shadow-md flex items-center justify-center">
                <Mic className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="w-28 h-8 bg-muted border border-border/50 rounded-t-2xl mt-1" />
            </div>
          </div>
        </div>

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
