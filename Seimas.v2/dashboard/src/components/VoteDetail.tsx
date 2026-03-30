import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ThumbsUp, ThumbsDown, Circle, AlertTriangle, FileText, Share2, Printer } from 'lucide-react';
import { SeimasMap, Seat } from './SeimasMap';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

// Mock Data Generator for a specific vote
const generateVoteData = () => {
    const results: Record<number, Seat['status']> = {};
    const rebelIds: number[] = [];
    
    // Simulate 141 votes
    for (let i = 0; i < 141; i++) {
        // Skew towards "Aye" (Passing vote)
        const rand = Math.random();
        let status: Seat['status'] = 'aye';
        
        if (rand > 0.7) status = 'nay';
        if (rand > 0.9) status = 'abstain';
        if (rand > 0.95) status = 'did_not_vote';

        // Simulate "Rebels" (e.g., Party A usually votes Aye, but this MP voted Nay)
        // Let's say IDs 10, 25, 40 are rebels
        if ([10, 25, 40, 41, 88].includes(i)) {
            status = 'nay'; // Voting against majority
            rebelIds.push(i);
        }

        results[i] = status;
    }
    return { results, rebelIds };
};

export function VoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Memoize data so it doesn't change on re-renders
  const { results, rebelIds } = useMemo(() => generateVoteData(), []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       {/* Top Navigation */}
       <div className="flex justify-between items-center">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft size={16} />
                Grįžti į sąrašą
            </button>
            <div className="flex gap-2">
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
                    <Share2 size={18} />
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
                    <Printer size={18} />
                </button>
            </div>
       </div>

       {/* Main Content Card */}
       <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          
          {/* Header Section */}
          <div className="p-6 md:p-8 border-b border-border bg-muted/10">
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                 <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 mb-4 border border-blue-200 dark:border-blue-900/50">
                        <FileText size={12} />
                        Priimtas Įstatymas
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
                        Dėl Biudžeto sandaros įstatymo Nr. I-430 pakeitimo įstatymo projekto
                    </h1>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                            Dokumento Nr: <span className="font-mono text-foreground">XIVP-1234</span>
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                            Data: <span className="text-foreground">2026-02-01</span>
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                            Stadija: <span className="text-green-600 dark:text-green-500 font-bold">Priėmimas</span>
                        </span>
                    </div>
                 </div>

                 {/* Quick Stats Summary */}
                 <div className="flex flex-row md:flex-col gap-4 min-w-[140px]">
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg border border-border shadow-sm">
                        <span className="text-xs font-bold text-green-600 uppercase">Už</span>
                        <span className="text-xl font-bold">89</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg border border-border shadow-sm">
                         <span className="text-xs font-bold text-red-600 uppercase">Prieš</span>
                         <span className="text-xl font-bold">12</span>
                    </div>
                 </div>
             </div>
          </div>

          {/* Visualization Section */}
          <div className="p-6 md:p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
             
             {/* Left Column: Map */}
             <div className="xl:col-span-2 space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        Balsavimo Žemėlapis
                    </h3>
                    {/* Legend hint */}
                    <div className="text-xs text-muted-foreground hidden sm:block">
                        Rodomas balsavimas pagal seimo narių vietas
                    </div>
                 </div>
                 
                 {/* The Interactive Map in Analysis Mode */}
                 <div className="rounded-xl overflow-hidden shadow-inner border border-border bg-muted/10">
                    <SeimasMap 
                        isAnalysisMode={true} 
                        voteResults={results} 
                        rebelIds={rebelIds} 
                    />
                 </div>
             </div>

             {/* Right Column: Analysis & Info */}
             <div className="xl:col-span-1 space-y-8">
                 
                 {/* Vote Breakdown */}
                 <section>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
                        Rezultatų Suvestinė
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                  <ThumbsUp size={16} />
                              </div>
                              <span className="font-medium text-foreground">Balsavo UŽ</span>
                           </div>
                           <span className="text-xl font-bold text-green-700 dark:text-green-500">89</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                                  <ThumbsDown size={16} />
                              </div>
                              <span className="font-medium text-foreground">Balsavo PRIEŠ</span>
                           </div>
                           <span className="text-xl font-bold text-red-700 dark:text-red-500">12</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                                  <Circle size={16} />
                              </div>
                              <span className="font-medium text-foreground">Susilaikė</span>
                           </div>
                           <span className="text-xl font-bold text-muted-foreground">5</span>
                        </div>
                    </div>
                 </section>

                 {/* Rebels List */}
                 <section>
                    <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Frakcijų Maištininkai
                        </h3>
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full font-bold">
                            {rebelIds.length} Nariai
                        </span>
                    </div>
                    
                    <div className="space-y-3">
                        {rebelIds.map((id) => (
                            <div key={id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors group cursor-pointer">
                                <Avatar className="w-8 h-8 border border-border">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${id + 55}`} />
                                    <AvatarFallback>MP</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">Seimo Narys {id}</div>
                                    <div className="text-xs text-muted-foreground truncate">LSDP Frakcija</div>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">
                                    <AlertTriangle size={10} />
                                    PRIEŠ
                                </div>
                            </div>
                        ))}
                    </div>
                 </section>

             </div>
          </div>
       </div>
    </div>
  );
}
