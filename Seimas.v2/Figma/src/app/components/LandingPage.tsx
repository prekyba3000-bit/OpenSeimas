import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, ShieldCheck, BarChart3, Users } from 'lucide-react';
import { cn } from './ui/utils';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      
      {/* Navigation */}
      <nav className="border-b border-border py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold">L</div>
           <span className="font-bold text-lg tracking-tight">Lietuvos Respublikos Seimas</span>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => navigate('/dashboard')}
             className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
           >
             Prisijungti
           </button>
           <button 
             onClick={() => navigate('/dashboard')}
             className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
           >
             Atidaryti portalą
           </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-12 py-12 md:py-24 max-w-7xl mx-auto w-full gap-12">
         <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
               <span className="w-2 h-2 rounded-full bg-primary"></span>
               Skaidrumo portalas
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
               Atviras Seimas<br/>
               <span className="text-primary">Visuomenei</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
               Stebėkite posėdžius, analizuokite balsavimus ir susipažinkite su Seimo narių veikla realiuoju laiku. Modernus įrankis demokratijai.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
               <button 
                 onClick={() => navigate('/dashboard')}
                 className="flex items-center justify-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-lg font-medium hover:bg-foreground/90 transition-all hover:translate-y-[-1px] shadow-lg shadow-black/20"
               >
                 Pradėti naudojimą
                 <ArrowRight size={18} />
               </button>
               <button className="flex items-center justify-center gap-2 bg-card border border-border text-foreground px-8 py-3.5 rounded-lg font-medium hover:bg-muted transition-colors">
                 Sužinoti daugiau
               </button>
            </div>

            <div className="pt-8 flex items-center gap-8 text-muted-foreground">
               <div className="flex items-center gap-2">
                  <ShieldCheck size={20} />
                  <span className="text-sm">Oficialūs duomenys</span>
               </div>
               <div className="flex items-center gap-2">
                  <BarChart3 size={20} />
                  <span className="text-sm">Realaus laiko analizė</span>
               </div>
            </div>
         </div>

         <div className="flex-1 w-full max-w-xl relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-[2rem] -z-10 blur-xl opacity-70"></div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-border bg-card relative">
               <img 
                 src="https://images.unsplash.com/photo-1688863960349-78461412ddf9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" 
                 alt="Seimas Dashboard Preview" 
                 className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-8">
                  <div className="text-foreground">
                     <div className="font-bold text-xl">Seimo Posėdžių Salė</div>
                     <div className="text-sm text-muted-foreground">Tiesioginė transliacija ir duomenų srautai</div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border">
         © {new Date().getFullYear()} Lietuvos Respublikos Seimas. Visos teisės saugomos.
      </footer>
    </div>
  );
}