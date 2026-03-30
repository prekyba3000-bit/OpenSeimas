import React from 'react';
import { AlertTriangle, Box, Info } from 'lucide-react';

interface PropDefinition {
  name: string;
  type: string;
  default?: string;
  description?: string;
}

interface DocCardProps {
  name: string;
  type: 'Organism' | 'Molecule' | 'Atom';
  rarity: 'Common' | 'Rare' | 'Legendary' | 'Mythic';
  color?: string;
  props: PropDefinition[];
  notes: string[];
}

const RARITY_COLORS = {
  Common: '#9CA3AF', // Gray
  Rare: '#3B82F6',   // Blue
  Legendary: '#F59E0B', // Amber
  Mythic: '#A855F7', // Purple
};

export function DocCard({ 
  name, 
  type, 
  rarity, 
  color = '#22C55E', // Default green
  props, 
  notes 
}: DocCardProps) {
  
  return (
    <div className="w-full max-w-2xl bg-[#0B0C0E] border-l-4 overflow-hidden shadow-xl" style={{ borderColor: color }}>
      
      {/* Header "Stat Block" */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl text-white tracking-tight" style={{ fontFamily: '"Geist Mono", monospace' }}>
            {name}
          </h2>
          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded bg-white/10 text-white/70">
            {type}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           <span 
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: RARITY_COLORS[rarity] }}
          >
            {rarity}
          </span>
          <Box size={14} color={RARITY_COLORS[rarity]} />
        </div>
      </div>

      {/* Prop Table */}
      <div className="w-full">
        <div className="grid grid-cols-12 bg-white/5 border-b border-white/5 py-2 px-4 text-[10px] uppercase tracking-wider text-gray-500 font-mono">
          <div className="col-span-4">Prop</div>
          <div className="col-span-4">Type</div>
          <div className="col-span-4">Default</div>
        </div>
        
        <div className="font-mono text-xs">
          {props.map((prop, index) => (
            <div 
              key={prop.name}
              className={`grid grid-cols-12 py-2 px-4 border-b border-white/5 ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}
            >
              <div className="col-span-4 text-blue-300 font-medium">{prop.name}</div>
              <div className="col-span-4 text-pink-300">{prop.type}</div>
              <div className="col-span-4 text-gray-400">{prop.default || '-'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Behavior Notes */}
      <div className="p-4 bg-white/[0.02]">
        <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2 font-mono">
          <Info size={12} />
          Implementation Notes
        </h3>
        <ul className="space-y-2">
          {notes.map((note, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <AlertTriangle className="flex-shrink-0 mt-0.5 text-yellow-500/80" size={14} />
              <span className="leading-relaxed text-xs opacity-90 font-mono">{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
