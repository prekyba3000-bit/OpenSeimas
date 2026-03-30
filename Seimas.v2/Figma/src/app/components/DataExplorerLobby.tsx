import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Save, 
  Filter, 
  Plus, 
  Trash2, 
  Database, 
  User, 
  FileText, 
  Flag, 
  ChevronDown, 
  Play,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// --- Types & Mock Data ---

type TargetClass = 'MPs' | 'Votes' | 'Parties';

interface Preset {
  id: string;
  name: string;
  target: TargetClass;
  conditions: number;
  icon: React.ReactNode;
}

const PRESETS: Preset[] = [
  { 
    id: '1', 
    name: 'Find Rebels', 
    target: 'MPs', 
    conditions: 3,
    icon: <Zap size={14} className="text-yellow-400" />
  },
  { 
    id: '2', 
    name: 'Big Spenders', 
    target: 'Parties', 
    conditions: 2,
    icon: <Database size={14} className="text-green-400" />
  },
  { 
    id: '3', 
    name: 'Controversial Bills', 
    target: 'Votes', 
    conditions: 4,
    icon: <FileText size={14} className="text-red-400" />
  },
  { 
    id: '4', 
    name: 'Ghost MPs (<20% Att.)', 
    target: 'MPs', 
    conditions: 1,
    icon: <User size={14} className="text-gray-400" />
  }
];

// --- Sub-Components ---

function ConditionPill({ 
  label, 
  operator, 
  value, 
  color 
}: { 
  label: string; 
  operator: string; 
  value: string; 
  color: 'red' | 'gold' | 'purple' | 'blue';
}) {
  const colorStyles = {
    red: 'bg-red-500/10 border-red-500 text-red-400',
    gold: 'bg-yellow-500/10 border-yellow-500 text-yellow-400',
    purple: 'bg-purple-500/10 border-purple-500 text-purple-400',
    blue: 'bg-blue-500/10 border-blue-500 text-blue-400'
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-sm uppercase tracking-wide cursor-pointer hover:bg-opacity-20 transition-all",
        colorStyles[color]
      )}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-bold text-white">{operator}</span>
      <span className="font-bold">{value}</span>
      <button className="ml-2 hover:text-white opacity-50 hover:opacity-100">
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}

function LaunchButton() {
  return (
    <button className="relative group w-full py-6 overflow-hidden rounded-xl bg-blue-600 hover:bg-blue-500 transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] border border-blue-400">
      
      {/* Glitch Overlay effects */}
      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12" />
      
      {/* Text Content */}
      <div className="relative z-10 flex items-center justify-center gap-3">
        <Play size={24} className="fill-white" />
        <span className="text-2xl font-black italic tracking-tighter text-white">RUN SIMULATION</span>
      </div>
      
      {/* Animated Borders/Scanlines */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-white/50 group-hover:animate-[scanline_1s_infinite]" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/50 group-hover:animate-[scanline_1s_infinite_reverse]" />
    </button>
  );
}

export function DataExplorerLobby() {
  const [activeTarget, setActiveTarget] = useState<TargetClass>('MPs');
  const [selectedPreset, setSelectedPreset] = useState<string | null>('1');

  return (
    <div className="w-full bg-[#0a0a0c] border border-gray-800 rounded-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      
      {/* Sidebar: Presets */}
      <div className="w-full md:w-64 bg-gray-900/50 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
           <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">Saved Presets</h3>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
             <input 
                type="text" 
                placeholder="Search loadouts..." 
                className="w-full bg-black/40 border border-gray-700 rounded-md py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-blue-500"
             />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {PRESETS.map((preset) => (
             <button
               key={preset.id}
               onClick={() => setSelectedPreset(preset.id)}
               className={cn(
                 "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group",
                 selectedPreset === preset.id 
                    ? "bg-blue-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "hover:bg-white/5 border border-transparent"
               )}
             >
                <div className={cn(
                  "w-8 h-8 rounded flex items-center justify-center bg-black/40 border border-gray-700",
                  selectedPreset === preset.id ? "border-blue-500/50" : ""
                )}>
                   {preset.icon}
                </div>
                <div>
                   <div className={cn(
                     "text-sm font-bold truncate",
                     selectedPreset === preset.id ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                   )}>
                     {preset.name}
                   </div>
                   <div className="text-[10px] text-gray-600 font-mono uppercase">
                      {preset.target} • {preset.conditions} Cond.
                   </div>
                </div>
             </button>
           ))}
        </div>

        <div className="p-4 border-t border-gray-800">
           <Button variant="outline" className="w-full text-xs border-dashed border-gray-700 text-gray-500 hover:text-white hover:border-gray-500">
              <Plus size={14} className="mr-2" /> New Preset
           </Button>
        </div>
      </div>

      {/* Main Stage: Filter Deck */}
      <div className="flex-1 flex flex-col p-6 md:p-8 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
         {/* Overlay to darken background */}
         <div className="absolute inset-0 bg-[#0a0a0c]/95 backdrop-blur-sm" />

         <div className="relative z-10 flex-1 flex flex-col max-w-3xl mx-auto w-full">
            
            <div className="mb-8">
               <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Data Explorer // God Mode</h2>
               <p className="text-gray-400 font-mono text-sm">Configure your query parameters to filter the parliamentary database.</p>
            </div>

            {/* The Filter Deck */}
            <div className="bg-black/60 border border-gray-700 rounded-xl p-6 backdrop-blur-md shadow-2xl space-y-8 flex-1">
               
               {/* Row 1: Target Selector */}
               <div className="space-y-3">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     <LayoutGrid size={12} /> Target Class
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     {(['MPs', 'Votes', 'Parties'] as TargetClass[]).map((target) => (
                        <button
                           key={target}
                           onClick={() => setActiveTarget(target)}
                           className={cn(
                              "h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all",
                              activeTarget === target 
                                 ? "border-blue-500 bg-blue-500/10 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                                 : "border-gray-800 bg-gray-900/50 text-gray-500 hover:border-gray-600 hover:text-gray-300"
                           )}
                        >
                           <span className="text-lg font-bold uppercase">{target}</span>
                        </button>
                     ))}
                  </div>
               </div>

               {/* Row 2: Conditions (The Loadout) */}
               <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                     <div className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Filter size={12} /> Filter Conditions
                     </div>
                     <span className="text-[10px] text-gray-600">3 of 5 Slots Used</span>
                  </div>
                  
                  <div className="bg-black/40 border border-gray-800 rounded-xl p-4 min-h-[200px] flex flex-wrap content-start gap-3 relative overflow-hidden">
                     {/* Grid lines decoration */}
                     <div className="absolute inset-0 pointer-events-none opacity-5" 
                          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                     />
                     
                     {/* Active Pills */}
                     <ConditionPill 
                        label="Attendance" 
                        operator="<" 
                        value="50%" 
                        color="red" 
                     />
                     <div className="h-px w-4 bg-gray-700 self-center" />
                     <ConditionPill 
                        label="Net Worth" 
                        operator=">" 
                        value="€1.0M" 
                        color="gold" 
                     />
                     <div className="h-px w-4 bg-gray-700 self-center" />
                     <ConditionPill 
                        label="Vote Behavior" 
                        operator="=" 
                        value="'Against Party'" 
                        color="purple" 
                     />

                     {/* Add New Placeholder */}
                     <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition-colors bg-white/5">
                        <Plus size={14} />
                        <span className="text-xs font-mono uppercase">Add Condition</span>
                     </button>
                  </div>
               </div>

               {/* Row 3: Action Deck */}
               <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                         <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Est. Results: ~14
                         </span>
                         <span className="flex items-center gap-2">
                            <ClockIcon />
                            Query Time: 0.04s
                         </span>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="ghost" size="sm" className="h-8 text-gray-500 hover:text-white">Clear All</Button>
                         <Button variant="ghost" size="sm" className="h-8 text-blue-400 hover:text-blue-300">
                            <Save size={14} className="mr-2" /> Save as Preset
                         </Button>
                      </div>
                  </div>
                  
                  <LaunchButton />
               </div>

            </div>
         </div>
      </div>
    </div>
  );
}

function ClockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    )
}
