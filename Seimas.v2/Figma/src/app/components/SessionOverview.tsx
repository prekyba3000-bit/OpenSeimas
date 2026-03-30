import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

export function SessionOverview() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-foreground">Sesijų apžvalga</h1>
      
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Calendar size={24} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-card-foreground">IX (Rudens) Sesija</h2>
                <p className="text-muted-foreground text-sm">2025 m. Rugsėjis - 2026 m. Sausis</p>
            </div>
         </div>
         
         <div className="prose dark:prose-invert max-w-none text-muted-foreground">
             <p>Šiuo metu vyksta eilinė pavasario sesija. Pagrindiniai darbotvarkės klausimai apima valstybės biudžeto tikslinimą ir gynybos finansavimo didinimą.</p>
         </div>

         <div className="mt-6 pt-6 border-t border-border">
             <h3 className="text-sm font-semibold text-foreground mb-4">Artimiausi posėdžiai</h3>
             <div className="space-y-3">
                 {[1, 2, 3].map(i => (
                     <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group">
                         <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-md bg-muted flex flex-col items-center justify-center text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                 <span>VAS</span>
                                 <span className="text-lg leading-none">{8 + i}</span>
                             </div>
                             <div>
                                 <div className="font-medium text-foreground">Rytinis posėdis</div>
                                 <div className="text-xs text-muted-foreground">10:00 - 13:00 • Seimo posėdžių salė</div>
                             </div>
                         </div>
                         <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                     </div>
                 ))}
             </div>
         </div>
      </div>
    </div>
  );
}
