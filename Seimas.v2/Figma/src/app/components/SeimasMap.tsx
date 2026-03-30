import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, Mic, Users, X, BarChart3, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';

// --- Shared Data (Normally in a separate file) ---
export const PARTIES = [
  { name: 'Tėvynės sąjunga', color: 'bg-blue-600', ring: 'ring-blue-600' },
  { name: 'LSDP', color: 'bg-red-500', ring: 'ring-red-500' },
  { name: 'Liberalų sąjūdis', color: 'bg-amber-500', ring: 'ring-amber-500' },
  { name: 'Demokratų sąjunga', color: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { name: 'Laisvės partija', color: 'bg-violet-500', ring: 'ring-violet-500' },
  { name: 'LVŽS', color: 'bg-green-600', ring: 'ring-green-600' },
  { name: 'Mišri grupė', color: 'bg-slate-500', ring: 'ring-slate-500' },
];

const NAMES = [
  'Andrius Kubilius', 'Viktorija Čmilytė-Nielsen', 'Ingrida Šimonytė', 'Gabrielius Landsbergis',
  'Aušrinė Armonaitė', 'Eugenijus Gentvilas', 'Saulius Skvernelis', 'Rasa Juknevičienė',
  'Kęstutis Masiulis', 'Mykolas Majauskas', 'Radvilė Morkūnaitė', 'Paulius Saudargas',
  'Agnė Bilotaitė', 'Arvydas Anušauskas', 'Laurynas Kasčiūnas', 'Gintarė Skaistė'
];

export interface Seat {
  id: number;
  status: 'aye' | 'nay' | 'abstain' | 'speaking' | 'empty' | 'present' | 'did_not_vote';
  x: number;
  y: number;
  mp: {
    name: string;
    party: string;
    avatarUrl?: string;
  };
  isRebel?: boolean; // For visual analysis of party dissenters
}

// Generate static layout once
const LAYOUT_SEATS: Omit<Seat, 'status' | 'mp'>[] = (() => {
  const seats = [];
  const rows = 8;
  let count = 0;
  for (let r = 0; r < rows; r++) {
    const radius = 180 + (r * 35);
    const seatsInRow = 12 + (r * 4);
    for (let s = 0; s < seatsInRow; s++) {
      if (count >= 141) break;
      const angle = Math.PI - (Math.PI / (seatsInRow - 1)) * s;
      seats.push({
        id: count++,
        x: 300 + Math.cos(angle) * radius,
        y: 350 - Math.sin(angle) * radius
      });
    }
  }
  return seats;
})();

interface SeimasMapProps {
  // If provided, the map enters "Static Analysis Mode"
  // It will display these specific results instead of a live simulation
  voteResults?: Record<number, Seat['status']>;
  rebelIds?: number[]; // IDs of MPs who voted against party line
  isAnalysisMode?: boolean;
}

export function SeimasMap({ voteResults, rebelIds = [], isAnalysisMode = false }: SeimasMapProps) {
  const navigate = useNavigate();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  // Initialize Data — stable, deterministic assignment
  useEffect(() => {
    const initialSeats: Seat[] = LAYOUT_SEATS.map(layout => {
      const party = PARTIES[layout.id % PARTIES.length];
      const name = NAMES[layout.id % NAMES.length];
      
      let status: Seat['status'] = 'present';
      let isRebel = false;

      // Override if in Analysis Mode (Vote Results)
      if (voteResults && voteResults[layout.id]) {
        status = voteResults[layout.id];
      } else if (!isAnalysisMode) {
        // Deterministic: most seats are "present", a few are empty (absent)
        // Use a simple hash to make it consistent across renders
        const hash = (layout.id * 7 + 13) % 100;
        if (hash > 95) {
          status = 'empty';
        } else {
          status = 'present';
        }
      }

      if (rebelIds.includes(layout.id)) {
        isRebel = true;
      }

      return {
        ...layout,
        status,
        isRebel,
        mp: {
          name,
          party: party.name,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${layout.id + 55}`,
        }
      };
    });
    setSeats(initialSeats);
  }, [voteResults, rebelIds, isAnalysisMode]);

  // No live simulation — the map is a calm, stable visualization

  // Derived Stats
  const stats = useMemo(() => {
    return {
        aye: seats.filter(s => s.status === 'aye').length,
        nay: seats.filter(s => s.status === 'nay').length,
        abstain: seats.filter(s => s.status === 'abstain').length,
        total: 141
    };
  }, [seats]);

  const speaker = seats.find(s => s.status === 'speaking');

  // Filter Logic
  const filteredSeats = seats.map(seat => {
      const matchesSearch = seat.mp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesParty = selectedParty ? seat.mp.party === selectedParty : true;
      const isDimmed = (searchTerm && !matchesSearch) || (selectedParty && !matchesParty);
      return { ...seat, isDimmed };
  });

  return (
    <div className="flex flex-col gap-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card border border-border p-3 rounded-xl shadow-sm">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Rasti Seimo narį..." 
                    className="w-full bg-muted/50 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground text-muted-foreground">
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                {/* Analysis Mode Indicator */}
                {isAnalysisMode && (
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/20 bg-primary/5 text-primary whitespace-nowrap">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Balsavimo Analizė
                   </div>
                )}

                {!isAnalysisMode && (
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent bg-muted text-muted-foreground whitespace-nowrap">
                      <Users className="w-3.5 h-3.5" />
                      Posėdžių salė
                   </div>
                )}

                <div className="h-4 w-[1px] bg-border mx-1"></div>

                {PARTIES.slice(0, 3).map(p => (
                    <button
                        key={p.name}
                        onClick={() => setSelectedParty(selectedParty === p.name ? null : p.name)}
                        className={cn(
                            "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center shrink-0",
                            selectedParty === p.name ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-70 hover:opacity-100",
                            p.color,
                            "border-white dark:border-slate-900"
                        )}
                        title={p.name}
                    >
                         {selectedParty === p.name && <Users className="w-3 h-3 text-white" />}
                    </button>
                ))}
                {(selectedParty && !PARTIES.slice(0,3).find(p => p.name === selectedParty)) && (
                    <button onClick={() => setSelectedParty(null)} className="text-xs text-muted-foreground underline">
                        Valyti
                    </button>
                )}
            </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl overflow-hidden shadow-inner group select-none">
            
            {/* Vote Stats Overlay — only in analysis mode */}
            {isAnalysisMode && (
                <div className="absolute top-0 left-0 right-0 z-20 p-4 pointer-events-none">
                     <div className="flex flex-col gap-2 bg-background/80 backdrop-blur-md p-3 rounded-lg border border-border shadow-sm max-w-lg mx-auto pointer-events-auto">
                        <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${(stats.aye / stats.total) * 100}%` }} />
                            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${(stats.nay / stats.total) * 100}%` }} />
                            <div className="h-full bg-slate-400 transition-all duration-700" style={{ width: `${(stats.abstain / stats.total) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-green-600">{stats.aye} Už</span>
                            <span className="text-red-600">{stats.nay} Prieš</span>
                            <span className="text-slate-500">{stats.abstain} Susilaikė</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Rendering */}
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                <div className="relative w-[600px] h-[400px] scale-[0.6] sm:scale-[0.8] md:scale-100 origin-center transition-transform duration-500">
                    
                    <TooltipProvider delayDuration={0}>
                    {filteredSeats.map((seat) => (
                        <Tooltip key={seat.id}>
                            <TooltipTrigger asChild>
                            <div
                                className={cn(
                                    "absolute w-4 h-4 rounded-full cursor-pointer shadow-sm border border-black/5 dark:border-white/5",
                                    "transition-all duration-300 ease-out",
                                    seat.status === 'aye' && "bg-green-500 dark:bg-green-500",
                                    seat.status === 'nay' && "bg-red-500 dark:bg-red-500",
                                    seat.status === 'abstain' && "bg-slate-400 dark:bg-slate-400",
                                    seat.status === 'present' && "bg-slate-300 dark:bg-slate-700",
                                    seat.status === 'empty' && "bg-slate-200 dark:bg-slate-800 opacity-40",
                                    seat.status === 'did_not_vote' && "bg-slate-200 dark:bg-slate-800 opacity-50",
                                    
                                    // Rebel Styling
                                    seat.isRebel && "ring-2 ring-yellow-400 dark:ring-yellow-400 z-30",

                                    // Dimmed state for search/filter
                                    seat.isDimmed ? "opacity-10 scale-75" : "",

                                    hoveredSeat === seat.id && "z-50 ring-2 ring-foreground scale-150"
                                )}
                                style={{ left: seat.x, top: seat.y }}
                                onClick={() => navigate(`/dashboard/mps/${seat.id}`)}
                                onMouseEnter={() => setHoveredSeat(seat.id)}
                                onMouseLeave={() => setHoveredSeat(null)}
                            />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="p-0 overflow-hidden bg-popover border-border rounded-lg shadow-xl">
                                <div className="flex flex-col w-[220px]">
                                    <div className="h-12 bg-muted relative">
                                        <div className={cn("absolute inset-0 opacity-20", 
                                            PARTIES.find(p => p.name === seat.mp.party)?.color
                                        )}></div>
                                    </div>
                                    <div className="px-4 pb-4 -mt-6 flex flex-col gap-2">
                                        <div className="flex justify-between items-end">
                                            <Avatar className="w-12 h-12 border-4 border-background shadow-sm">
                                                <AvatarImage src={seat.mp.avatarUrl} />
                                                <AvatarFallback>{seat.mp.name.slice(0,2)}</AvatarFallback>
                                            </Avatar>
                                            {seat.isRebel && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30 px-2 py-1 rounded-full mb-1">
                                                    <AlertTriangle size={10} /> Maištininkas
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">{seat.mp.name}</h4>
                                            <p className="text-xs text-muted-foreground">{seat.mp.party}</p>
                                        </div>
                                        {/* Status Tag */}
                                        <div className={cn(
                                            "mt-1 text-xs font-bold uppercase py-1 px-2 rounded w-fit",
                                            seat.status === 'aye' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                            seat.status === 'nay' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                            "bg-muted text-muted-foreground"
                                        )}>
                                            {seat.status === 'aye' ? 'Balsavo UŽ' : 
                                             seat.status === 'nay' ? 'Balsavo PRIEŠ' : 
                                             seat.status === 'abstain' ? 'Susilaikė' : 'Nedalyvavo'}
                                        </div>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                    </TooltipProvider>

                    {/* Presidium Area */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-[340px] flex flex-col items-center opacity-80">
                         <div className="w-16 h-8 bg-card border border-border rounded-lg shadow-md flex items-center justify-center mb-2">
                            <Mic className="w-4 h-4 text-muted-foreground" />
                         </div>
                         <div className="w-32 h-10 bg-muted border border-border/50 rounded-t-2xl flex items-center justify-around px-4">
                             <div className="w-2 h-2 rounded-full bg-muted-foreground/20"></div>
                             <div className="w-16 h-1 bg-border/50 rounded-full"></div>
                             <div className="w-2 h-2 rounded-full bg-muted-foreground/20"></div>
                         </div>
                    </div>

                </div>
            </div>

            {/* Bottom Legend */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 max-w-[80%]">
                 <div className="flex flex-wrap gap-3 bg-background/90 backdrop-blur p-2 px-3 rounded-lg border border-border shadow-sm text-[10px] text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" /> Dalyvauja</div>
                    {isAnalysisMode && (
                      <>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> Už</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Prieš</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /> Susilaikė</div>
                        <div className="flex items-center gap-1.5 border-l border-border pl-3 text-yellow-600 dark:text-yellow-400">
                             <div className="w-2 h-2 rounded-full ring-2 ring-yellow-400" /> Maištavo
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 opacity-50" /> Nedalyvauja</div>
                 </div>
            </div>
        </div>
    </div>
  );
}