import React from 'react';
import { 
  ArrowLeft, Users, Scale
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { cn } from './ui/utils';

// --- Comparison Data ---

const MP_A = {
  name: 'Andrius Kubilius',
  party: 'TS-LKD',
  img: 'https://images.unsplash.com/photo-1579454905046-339b3913f937?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  stats: { attendance: 94, votes: 1247 }
};

const MP_B = {
  name: 'Saulius Skvernelis',
  party: 'Demokratų sąjunga',
  img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=1080',
  stats: { attendance: 88, votes: 1102 }
};

const COMMON_GROUND = [
  { topic: 'Gynyba', agreement: 'Aukštas', val: 95 },
  { topic: 'Užsienio politika', agreement: 'Aukštas', val: 90 },
  { topic: 'Mokesčiai', agreement: 'Žemas', val: 30 },
  { topic: 'Žmogaus teisės', agreement: 'Vidutinis', val: 55 },
];

export function ComparisonView({ onBack }: { onBack?: () => void }) {
  return (
    <div className="bg-[#FDFBF7] text-stone-800 font-sans -m-4 lg:-m-8 p-6 md:p-10 lg:p-12 min-h-[calc(100vh-4rem)]">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 hover:text-stone-900 flex items-center gap-3 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Grįžti
          </button>
          <h1 className="text-lg font-serif font-bold text-stone-900 tracking-wide uppercase">Pozicijų Gretinimas</h1>
          <div className="w-24"></div>
      </div>

      {/* Main comparison layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-0 items-start">
          
          {/* Left Side: MP A */}
          <div className="flex flex-col items-center lg:items-end lg:text-right p-6 lg:p-10">
              <div className="w-40 h-56 bg-stone-200 mb-6 shadow-lg overflow-hidden">
                  <ImageWithFallback src={MP_A.img} className="w-full h-full object-cover grayscale" />
              </div>
              <h2 className="text-3xl font-serif text-stone-900 mb-1">{MP_A.name}</h2>
              <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-8">{MP_A.party}</p>
              
              <div className="space-y-6 w-full max-w-sm">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                      <span className="text-sm font-bold text-stone-400 uppercase">Lankomumas</span>
                      <span className="text-xl font-serif">{MP_A.stats.attendance}%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                      <span className="text-sm font-bold text-stone-400 uppercase">Balsavimai</span>
                      <span className="text-xl font-serif">{MP_A.stats.votes}</span>
                  </div>
              </div>
          </div>

          {/* Center: The Bridge */}
          <div className="w-full lg:w-[480px] bg-white border border-stone-200 shadow-xl p-8 rounded-sm self-center">
              <div className="text-center mb-8">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                      <Scale size={20} className="text-stone-500" />
                  </div>
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Balsavimų Sutapimas</div>
                  <div className="text-5xl font-serif text-stone-900">64%</div>
              </div>
              
              <div className="space-y-6">
                  {COMMON_GROUND.map((item, i) => (
                      <div key={i}>
                          <div className="flex justify-between text-xs font-bold uppercase tracking-wide mb-2">
                              <span>{item.topic}</span>
                              <span className={cn(
                                  item.val > 60 ? "text-emerald-700" : "text-amber-700"
                              )}>{item.agreement}</span>
                          </div>
                          <div className="h-1.5 bg-stone-100 w-full relative rounded-full overflow-hidden">
                              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-stone-300 z-10"></div>
                              <div 
                                className={cn("h-full transition-all duration-1000 rounded-full", item.val > 50 ? "bg-stone-800" : "bg-stone-400")} 
                                style={{ 
                                    width: `${Math.abs(item.val - 50) * 2}%`,
                                    marginLeft: item.val < 50 ? 'auto' : '50%',
                                    marginRight: item.val < 50 ? '50%' : 'auto'
                                }}
                              ></div>
                          </div>
                      </div>
                  ))}
              </div>
              
              <div className="mt-8 text-center">
                   <button className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 border-b border-stone-300 pb-1 transition-colors">
                       Detali Analizė
                   </button>
              </div>
          </div>

          {/* Right Side: MP B */}
          <div className="flex flex-col items-center lg:items-start lg:text-left p-6 lg:p-10">
              <div className="w-40 h-56 bg-stone-200 mb-6 shadow-lg overflow-hidden">
                  <ImageWithFallback src={MP_B.img} className="w-full h-full object-cover grayscale" />
              </div>
              <h2 className="text-3xl font-serif text-stone-900 mb-1">{MP_B.name}</h2>
              <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-8">{MP_B.party}</p>
              
              <div className="space-y-6 w-full max-w-sm">
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                      <span className="text-xl font-serif">{MP_B.stats.attendance}%</span>
                      <span className="text-sm font-bold text-stone-400 uppercase">Lankomumas</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                      <span className="text-xl font-serif">{MP_B.stats.votes}</span>
                      <span className="text-sm font-bold text-stone-400 uppercase">Balsavimai</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
