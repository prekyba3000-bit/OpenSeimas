import React from 'react';
import { Shield, AlertTriangle, User, Zap } from 'lucide-react';
import { cn } from './ui/utils';

// --- Mock Data ---

const PARTY_INFO = {
  tag: "TS-LKD",
  name: "Homeland Union",
  color: "#3b82f6", // Blue-500
  unityScore: 94,
  description: "The conservative mainstays. High discipline, strategic voting patterns."
};

interface Member {
  id: string;
  name: string;
  role: string;
  loyalty: number; // 0-100
  avatar?: string;
}

const MEMBERS: Member[] = [
  { id: '1', name: "Gabrielius L.", role: "Clan Leader", loyalty: 99 },
  { id: '2', name: "Ingrida S.", role: "Strategist", loyalty: 98 },
  { id: '3', name: "Laurynas K.", role: "Tank", loyalty: 96 },
  { id: '4', name: "Radvilė M.", role: "Support", loyalty: 95 },
  { id: '5', name: "Žygimantas P.", role: "Member", loyalty: 92 },
  { id: '6', name: "Arvydas A.", role: "Veteran", loyalty: 88 },
  { id: '7', name: "Matas M.", role: "Rogue", loyalty: 76 },
  { id: '8', name: "Mykolas M.", role: "Rogue", loyalty: 72 },
  { id: '9', name: "Jurgis R.", role: "Member", loyalty: 85 },
  { id: '10', name: "Paulius S.", role: "Member", loyalty: 90 },
];

// Mock Voting History for Heatmap (1 = Loyal/Green, 0 = Rebel/Red)
const VOTING_HISTORY: Record<string, number[]> = {
  '1': [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  '2': [1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  '4': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  '5': [1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  '6': [1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
  '7': [0, 0, 1, 0, 1, 0, 1, 0, 1, 0], 
  '8': [0, 1, 0, 0, 1, 1, 0, 0, 0, 1], 
  '9': [1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  '10': [1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
};

const VOTE_IDS = ["V-201", "V-202", "V-203", "V-204", "V-205", "V-206", "V-207", "V-208", "V-209", "V-210"];

// --- Components ---

function UnityGauge({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-32 h-32 flex items-center justify-center group">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full group-hover:bg-blue-500/30 transition-all" />
      
      <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
        <circle cx="64" cy="64" r={radius} stroke="#1e3a8a" strokeWidth="8" fill="transparent" />
        <circle 
          cx="64" cy="64" r={radius} 
          stroke="#3b82f6" strokeWidth="8" 
          fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
         <span className="text-2xl font-black text-white italic">{score}%</span>
         <span className="text-[10px] text-blue-200 uppercase tracking-widest">Unity</span>
      </div>
    </div>
  );
}

function RosterCard({ member }: { member: Member }) {
  const isRogue = member.loyalty < 80;
  
  return (
    <div className={cn(
      "relative group overflow-hidden rounded-lg bg-[#141517] border border-white/5 p-2 hover:border-white/20 transition-all flex flex-col gap-2",
      isRogue && "border-red-500/30 hover:border-red-500/60 bg-red-900/5"
    )}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center border border-white/10 shrink-0">
           <User size={16} className="text-gray-400" />
        </div>
        
        <div className="flex-1 min-w-0">
           <div className="flex items-center justify-between">
             <h4 className="text-xs font-bold text-gray-200 truncate">{member.name}</h4>
             {isRogue && <AlertTriangle size={12} className="text-red-500 animate-pulse" />}
           </div>
           <div className="flex items-center justify-between">
             <span className="text-[9px] text-gray-500 uppercase">{member.role}</span>
             <span className={cn("text-[9px] font-mono", isRogue ? "text-red-400" : "text-green-400")}>
               {member.loyalty}%
             </span>
           </div>
        </div>
      </div>
      
      {/* Micro Progress Bar */}
      <div className="h-0.5 w-full bg-gray-800 rounded-full overflow-hidden">
        <div 
            className={cn("h-full", isRogue ? "bg-red-500" : "bg-blue-500")} 
            style={{ width: `${member.loyalty}%` }}
        />
      </div>
    </div>
  );
}

function HeatmapCell({ loyal }: { loyal: boolean }) {
  return (
    <div className={cn(
      "w-full h-8 rounded-sm border border-transparent hover:border-white/50 transition-colors relative group",
      loyal 
        ? "bg-green-500/20 hover:bg-green-500/40" 
        : "bg-red-500/20 hover:bg-red-500/40"
    )}>
      {/* Inner "LED" */}
      <div className={cn(
        "absolute inset-2 rounded-[1px] shadow-[0_0_5px_rgba(0,0,0,0.5)]",
        loyal ? "bg-green-500" : "bg-red-500"
      )} />
    </div>
  );
}

export function Party_Clan_Profile() {
  const sortedMembers = [...MEMBERS].sort((a, b) => b.loyalty - a.loyalty);

  return (
    <div className="w-full bg-[#0a0a0c] text-white overflow-hidden rounded-xl border border-gray-800 shadow-2xl font-sans">
      
      {/* 1. Hero Section */}
      <div className="relative h-[300px] w-full overflow-hidden flex flex-col justify-end">
        {/* Background Mesh Gradient */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(at 0% 0%, ${PARTY_INFO.color} 0px, transparent 50%),
              radial-gradient(at 100% 0%, #1e1b4b 0px, transparent 60%),
              linear-gradient(to bottom, #0a0a0c 10%, transparent 100%)
            `,
            backgroundColor: '#0f172a'
          }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        
        {/* Content Container */}
        <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between px-8 md:px-12 pb-8 pt-12">
            
            {/* Left: Logo & Tag */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                {/* 3D Glass Logo Placeholder */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-500 group">
                    <Shield size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] group-hover:scale-110 transition-transform" />
                </div>
                
                <div className="mb-2">
                    <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 drop-shadow-xl leading-none" style={{ fontFamily: 'Impact, sans-serif' }}>
                        {PARTY_INFO.tag}
                    </h1>
                    <p className="text-sm md:text-lg text-blue-200 font-medium tracking-[0.2em] uppercase opacity-80 pl-2">
                        {PARTY_INFO.name} // Faction Profile
                    </p>
                </div>
            </div>

            {/* Right: Unity Score */}
            <div className="flex flex-col items-center gap-2 mt-6 md:mt-0">
                <UnityGauge score={PARTY_INFO.unityScore} />
                <div className="px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-300 uppercase tracking-widest font-bold">
                    High Cohesion
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-0 border-t border-gray-800">
          
          {/* 2. Roster (Member Grid) */}
          <div className="xl:col-span-1 border-r border-gray-800 p-6 bg-[#0E0F11]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 text-gray-300">
                    <User size={16} className="text-blue-500" /> 
                    Active Roster
                </h3>
                <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">{sortedMembers.length} UNITS</span>
             </div>
             
             <div className="grid grid-cols-2 xl:grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
                {sortedMembers.map(member => (
                    <RosterCard key={member.id} member={member} />
                ))}
             </div>
          </div>

          {/* 3. Loyalty Matrix (Heatmap) */}
          <div className="xl:col-span-2 p-6 bg-[#0a0a0c] relative overflow-hidden flex flex-col">
             {/* Cyberpunk Grid Background */}
             <div 
                className="absolute inset-0 pointer-events-none opacity-20" 
                style={{ 
                    backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                }} 
             />

             <div className="relative z-10 flex-1">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 text-gray-300">
                        <Zap size={16} className="text-cyan-400" /> 
                        Tactical Vote Matrix
                    </h3>
                    <div className="flex gap-4 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-[1px] shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                            <span className="text-gray-400">LOYAL</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-red-500 rounded-[1px] shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                            <span className="text-gray-400">ROGUE</span>
                        </div>
                    </div>
                 </div>

                 {/* The Matrix */}
                 <div className="w-full overflow-x-auto pb-4">
                     <div className="min-w-[500px]">
                         {/* Header Row */}
                         <div className="grid grid-cols-[140px_repeat(10,1fr)] gap-1 mb-2">
                             <div className="text-[10px] text-gray-600 font-mono flex items-end pb-1 uppercase">Member_ID</div>
                             {VOTE_IDS.map(vid => (
                                 <div key={vid} className="text-[9px] text-cyan-600/80 font-mono text-center -rotate-45 origin-bottom-left translate-x-3 mb-1">
                                     {vid}
                                 </div>
                             ))}
                         </div>

                         {/* Rows */}
                         <div className="space-y-1">
                             {sortedMembers.map(member => (
                                 <div key={member.id} className="grid grid-cols-[140px_repeat(10,1fr)] gap-1 items-center hover:bg-white/5 transition-colors p-1 rounded-sm border border-transparent hover:border-white/10">
                                     <div className="text-xs font-medium text-gray-400 truncate pr-2 flex items-center gap-2 font-mono">
                                         {member.loyalty < 80 && <AlertTriangle size={10} className="text-red-500" />}
                                         {member.name}
                                     </div>
                                     {VOTING_HISTORY[member.id].map((vote, idx) => (
                                         <HeatmapCell key={idx} loyal={vote === 1} />
                                     ))}
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
}
