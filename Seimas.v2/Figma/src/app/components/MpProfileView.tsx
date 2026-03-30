import React, { useState } from 'react';
import { 
  ArrowLeft, ArrowRightLeft,
  BookOpen, Feather, MapPin, Clock, Scroll, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { cn } from './ui/utils';

// --- Data: The Nation's Record ---

const MP_DATA = {
  name: 'Andrius Kubilius',
  party: 'Tėvynės sąjunga-Lietuvos krikščionys demokratai',
  partyShort: 'TS-LKD',
  role: 'Komiteto pirmininkas',
  signatory: false,
  education: 'Vilniaus Universitetas, Fizika',
  avatarUrl: 'https://images.unsplash.com/photo-1579454905046-339b3913f937?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  bio_snippet: 'Politikas, kurio veikla neatsiejama nuo Lietuvos integracijos į Vakarų struktūras. Nuoseklus valstybingumo stiprinimo šalininkas.',
  stats: {
    votes_total: 1247,
    attendance: 94.2,
    initiatives: 28
  }
};

const TIMELINE = [
  { year: 2024, text: 'Lietuvos Respublikos Seimo narys (XV kadencija)' },
  { year: 2019, text: 'Europos Parlamento narys' },
  { year: 2016, text: 'Lietuvos Respublikos Seimo narys (XII kadencija)' },
  { year: 2008, text: 'Lietuvos Respublikos Ministras Pirmininkas (XV Vyriausybė)' },
];

const VOTES_HISTORY = [
  { date: '2026.02.01', title: 'Dėl Biudžeto sandaros įstatymo', vote: 'Už', type: 'affirmative' },
  { date: '2026.01.28', title: 'Dėl Gynybos fondo steigimo', vote: 'Už', type: 'affirmative' },
  { date: '2026.01.15', title: 'Dėl Mokesčių reformos', vote: 'Prieš', type: 'dissent' },
  { date: '2025.12.10', title: 'Dėl Švietimo strategijos', vote: 'Susilaikė', type: 'neutral' },
  { date: '2025.11.05', title: 'Dėl Miškų įstatymo', vote: 'Už', type: 'affirmative' },
];

// --- Sub-Components ---

const SectionHeading = ({ children, icon: Icon }: { children: React.ReactNode, icon?: any }) => (
    <div className="flex items-center gap-3 mb-6 border-b border-stone-300 pb-2">
        {Icon && <Icon size={18} className="text-stone-500" />}
        <h2 className="text-lg font-serif font-bold tracking-wide text-stone-900 uppercase">{children}</h2>
    </div>
);

const StatBlock = ({ label, value, sub }: { label: string, value: string | number, sub?: string }) => (
    <div className="flex flex-col border-l-2 border-amber-700/30 pl-4 py-1">
        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{label}</span>
        <span className="text-3xl font-serif text-stone-900 mt-1">{value}</span>
        {sub && <span className="text-xs text-stone-400 italic mt-1">{sub}</span>}
    </div>
);

// --- Main Component ---

export function MpProfileView({ onBack, onCompare }: { onBack?: () => void, onCompare?: () => void }) {
  const [activeTab, setActiveTab] = useState('chronicle');

  return (
    <div className="bg-[#FDFBF7] text-stone-800 font-sans selection:bg-amber-100 selection:text-amber-900 -m-4 lg:-m-8 p-6 md:p-10 lg:p-12 min-h-[calc(100vh-4rem)]">
      
      {/* --- Top Bar: Back + Actions --- */}
      <div className="flex justify-between items-center mb-10">
          <button 
            onClick={onBack}
            className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.15em] text-stone-500 hover:text-stone-900 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Seimo Nariai
          </button>
          
          <button onClick={onCompare} className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-[#FDFBF7] text-xs font-bold uppercase tracking-wider hover:bg-stone-700 transition-colors rounded-sm">
              <ArrowRightLeft size={14} />
              Gretinti
          </button>
      </div>

      {/* --- The Portrait Section --- */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20 items-start max-w-[1200px]">
          
          {/* Image Column */}
          <div className="md:col-span-5 lg:col-span-4 relative">
              <div className="relative aspect-[3/4] bg-stone-200 overflow-hidden shadow-xl shadow-stone-200/50">
                  <div className="absolute inset-0 border-[12px] border-white z-10"></div>
                  <ImageWithFallback src={MP_DATA.avatarUrl} className="w-full h-full object-cover grayscale contrast-[1.1] sepia-[0.1]" />
                  
                  {/* Ribbon / Status */}
                  <div className="absolute bottom-6 left-6 right-6 z-20 bg-white/95 backdrop-blur px-4 py-3 border border-stone-100 shadow-sm">
                       <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Statusas</span>
                           <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase">
                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                               Veikia
                           </span>
                       </div>
                  </div>
              </div>
          </div>

          {/* Biography Column */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-center h-full pt-4">
              <div className="mb-6">
                  <h1 className="text-4xl md:text-6xl font-serif text-stone-900 mb-4 leading-tight">
                      {MP_DATA.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-stone-600 border-t border-b border-stone-200 py-3">
                      <span className="flex items-center gap-2">
                          <MapPin size={16} className="text-amber-700" />
                          Antakalnio apygarda
                      </span>
                      <span className="w-px h-4 bg-stone-300"></span>
                      <span className="flex items-center gap-2">
                          <BookOpen size={16} className="text-amber-700" />
                          {MP_DATA.partyShort}
                      </span>
                  </div>
              </div>

              <p className="text-lg md:text-xl text-stone-600 leading-relaxed font-serif italic mb-8 max-w-2xl border-l-4 border-amber-700/20 pl-6">
                  "{MP_DATA.bio_snippet}"
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-auto">
                  <StatBlock label="Kadencija" value="XV" sub="2024–2028" />
                  <StatBlock label="Posėdžiai" value={MP_DATA.stats.attendance + '%'} sub="Dalyvavimas" />
                  <StatBlock label="Iniciatyvos" value={MP_DATA.stats.initiatives} sub="Teisės aktai" />
              </div>
          </div>
      </section>

      {/* --- The Chronicle (Tabs) --- */}
      <div className="border-b border-stone-200 mb-12 flex gap-8 overflow-x-auto max-w-[1200px]">
          {[
            { id: 'chronicle', label: 'Veiklos Kronika' },
            { id: 'biography', label: 'Gyvenimo Kelias' },
            { id: 'values', label: 'Vertybinė Pozicija' }
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                      "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
                      activeTab === tab.id 
                        ? "text-stone-900" 
                        : "text-stone-400 hover:text-stone-600"
                  )}
              >
                  {tab.label}
                  {activeTab === tab.id && (
                      <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-700" />
                  )}
              </button>
          ))}
      </div>

      <div className="max-w-[1200px]">
        <AnimatePresence mode="wait">
            {activeTab === 'chronicle' && (
                <motion.section 
                  key="chronicle"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-12"
                >
                    {/* Left: Voting History (The List) */}
                    <div className="lg:col-span-2">
                        <SectionHeading icon={Scroll}>Balsavimų Registras</SectionHeading>
                        <div className="space-y-0">
                            {VOTES_HISTORY.map((vote, i) => (
                                <div key={i} className="group flex items-baseline gap-6 py-5 border-b border-stone-100 hover:bg-stone-50 transition-colors px-4 -mx-4 rounded-lg">
                                    <span className="text-xs font-mono text-stone-400 w-24 shrink-0">{vote.date}</span>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-serif text-stone-900 group-hover:text-amber-800 transition-colors">
                                            {vote.title}
                                        </h3>
                                    </div>
                                    <div className="shrink-0">
                                        <span className={cn(
                                            "text-xs font-bold uppercase tracking-wider px-3 py-1 border",
                                            vote.type === 'affirmative' ? "border-emerald-200 text-emerald-800 bg-emerald-50" :
                                            vote.type === 'dissent' ? "border-rose-200 text-rose-800 bg-rose-50" :
                                            "border-stone-200 text-stone-600 bg-stone-50"
                                        )}>
                                            {vote.vote}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-8 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-amber-700 flex items-center gap-2 transition-colors">
                            <Activity size={14} /> Rodyti visą archyvą
                        </button>
                    </div>

                    {/* Right: Context & Analysis */}
                    <div>
                        <SectionHeading icon={Feather}>Kontekstas</SectionHeading>
                        <div className="bg-stone-100 p-6 rounded-sm border border-stone-200 mb-8">
                            <h4 className="font-bold text-stone-900 mb-2 text-sm uppercase tracking-wide">Analitiko Pastaba</h4>
                            <p className="text-stone-600 text-sm leading-relaxed font-serif">
                                Šioje sesijoje narys demonstruoja ypatingą dėmesį <span className="text-stone-900 font-bold">gynybos politikai</span>. 
                                Pastebimas išsiskyrimas su frakcija mokesčių klausimais, kas rodo principinę poziciją dėl smulkaus verslo apmokestinimo.
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide mb-4">Aktyvumo Dinamika</h4>
                            {[
                              { label: 'Rugsėjis', val: 60 },
                              { label: 'Spalis', val: 85 },
                              { label: 'Lapkritis', val: 45 },
                              { label: 'Gruodis', val: 90 },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 text-xs">
                                    <span className="w-20 text-stone-500">{item.label}</span>
                                    <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-stone-800" style={{ width: `${item.val}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.section>
            )}

            {activeTab === 'biography' && (
                <motion.section 
                  key="biography"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-3xl"
                >
                    <SectionHeading icon={Clock}>Tarnybos Kelias</SectionHeading>
                    <div className="relative border-l border-stone-300 ml-3 space-y-12 py-4">
                        {TIMELINE.map((event, i) => (
                            <div key={i} className="relative pl-12">
                                <div className="absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full bg-white border-2 border-stone-400"></div>
                                <span className="text-3xl font-serif text-stone-300 absolute -left-20 top-0 w-16 text-right tabular-nums">
                                    {event.year}
                                </span>
                                <h3 className="text-xl font-medium text-stone-900 leading-tight">
                                    {event.text}
                                </h3>
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}

            {activeTab === 'values' && (
                <motion.section 
                  key="values"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-3xl"
                >
                    <SectionHeading icon={BookOpen}>Vertybinė Pozicija</SectionHeading>
                    <p className="text-stone-500 text-sm italic">Šis skyrius bus papildytas ideologine radar diagrama ir vertybinių pozicijų analize.</p>
                </motion.section>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
