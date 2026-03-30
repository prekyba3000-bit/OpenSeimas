import React from 'react';
import { useNavigate } from 'react-router';
import { SeimasMap } from './SeimasMap';
import { cn } from './ui/utils';
import { Users, Clock, AlertCircle, TrendingUp, MoreHorizontal, Download, ArrowRight } from 'lucide-react';

// Mock Data
const recentVotes = [
  { id: 1, title: 'Dėl Biudžeto sandaros įstatymo pakeitimo', type: 'Įstatymas', result: 'Priimta', votes: { for: 89, against: 12, abstain: 5 }, time: '14:22' },
  { id: 2, title: 'Dėl Nacionalinio saugumo strategijos', type: 'Nutarimas', result: 'Priimta', votes: { for: 112, against: 0, abstain: 1 }, time: '13:45' },
  { id: 3, title: 'Dėl Švietimo įstatymo pataisų', type: 'Projektas', result: 'Atidėta', votes: { for: 45, against: 48, abstain: 20 }, time: '12:10' },
  { id: 4, title: 'Seimo nutarimas "Dėl komisijos sudarymo"', type: 'Nutarimas', result: 'Atmesta', votes: { for: 30, against: 60, abstain: 15 }, time: '11:05' },
];

export function DashboardView() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-foreground">Posėdžio apžvalga</h1>
            <p className="text-muted-foreground text-sm">2026 m. vasario 8 d., Sekmadienis • Rytinis posėdis</p>
         </div>
         <div className="flex gap-3">
             <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors">
                <Download size={16} />
                Eksportuoti darbotvarkę
             </button>
             <button className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
                Stebėti tiesiogiai
             </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stat Cards */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div>
                  <div className="text-sm font-medium text-muted-foreground">Registruoti nariai</div>
                  <div className="text-3xl font-bold text-card-foreground mt-1">138 <span className="text-lg text-muted-foreground font-normal">/ 141</span></div>
                  <div className="text-xs text-green-600 dark:text-green-500 font-medium mt-1 flex items-center gap-1">
                      <Users size={12} />
                      Kvorumas yra
                  </div>
              </div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Users size={24} />
              </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div>
                  <div className="text-sm font-medium text-muted-foreground">Posėdžio laikas</div>
                  <div className="text-3xl font-bold text-card-foreground mt-1">04:22:15</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      Liko 1 val. 30 min.
                  </div>
              </div>
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Clock size={24} />
              </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
              <div>
                  <div className="text-sm font-medium text-muted-foreground">Priimti teisės aktai</div>
                  <div className="text-3xl font-bold text-card-foreground mt-1">12</div>
                  <div className="text-xs text-green-600 dark:text-green-500 font-medium mt-1 flex items-center gap-1">
                      <TrendingUp size={12} />
                      +4 lyginant su vakar
                  </div>
              </div>
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                  <TrendingUp size={24} />
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Map Area */}
         <div className="lg:col-span-2 flex flex-col gap-4">
             <div className="flex justify-between items-center px-1">
                 <h2 className="text-lg font-bold text-foreground">Posėdžių salės planas</h2>
                 <div className="flex gap-2">
                     <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Posėdis vyksta
                     </span>
                 </div>
             </div>
             <SeimasMap />
         </div>

         {/* Recent Activity */}
         <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col max-h-[600px]">
             <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
                 <h2 className="text-lg font-bold text-card-foreground">Naujausi balsavimai</h2>
                 <button 
                    onClick={() => navigate('/dashboard/votes')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                 >
                     <ArrowRight size={20} />
                 </button>
             </div>
             <div className="flex-1 overflow-y-auto">
                 {recentVotes.map((vote) => (
                     <div 
                        key={vote.id} 
                        onClick={() => navigate(`/dashboard/votes/${vote.id}`)}
                        className="p-4 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                     >
                         <div className="flex justify-between items-start mb-1">
                             <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                 {vote.type}
                             </span>
                             <span className="text-xs text-muted-foreground font-mono">{vote.time}</span>
                         </div>
                         <h3 className="text-sm font-medium text-card-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
                             {vote.title}
                         </h3>
                         <div className="flex items-center justify-between text-xs">
                             <div className="flex gap-3 text-muted-foreground">
                                 <span className="text-green-600 dark:text-green-500 font-medium">Už: {vote.votes.for}</span>
                                 <span className="text-red-600 dark:text-red-500">Prieš: {vote.votes.against}</span>
                                 <span>Sus.: {vote.votes.abstain}</span>
                             </div>
                             <span className={cn(
                                 "font-medium px-2 py-0.5 rounded",
                                 vote.result === 'Priimta' ? "bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-500" : 
                                 vote.result === 'Atmesta' ? "bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-500" : 
                                 "bg-orange-50 text-orange-600 dark:bg-orange-900/10 dark:text-orange-500"
                             )}>
                                 {vote.result}
                             </span>
                         </div>
                     </div>
                 ))}
             </div>
             <div className="p-4 bg-muted/20 text-center border-t border-border">
                 <button 
                    onClick={() => navigate('/dashboard/votes')}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                 >
                     Peržiūrėti visą registrą
                 </button>
             </div>
         </div>
      </div>
    </div>
  );
}