import React, { useState, useEffect } from 'react';
import { User, Clock, ThumbsUp, ThumbsDown, Activity } from 'lucide-react';
import { cn } from './ui/utils';
import { ScrambleNumber } from './ScrambleNumber';

// --- Mock Data ---

const RECENT_VOTES = [
  "AMENDMENT 42: ACCEPTED (84-12)",
  "BUDGET PROPOSAL B: REJECTED (33-91)",
  "TAX REFORM ACT: ACCEPTED (78-45)",
  "EDUCATION BILL: PENDING",
  "DEFENSE SPENDING: ACCEPTED (112-1)",
  "INFRASTRUCTURE PLAN: REJECTED (55-60)",
  "HEALTHCARE INITIATIVE: ACCEPTED (90-30)",
  "ENERGY POLICY: PENDING"
];

const SPEAKER = {
  name: "Aušrinė Armonaitė",
  party: "Freedom Party",
  avatar: "figma:asset/avatar_placeholder.png" 
};

export function Live_Spectator_HUD() {
  // Mock Real-time Data
  const [votesFor, setVotesFor] = useState(65);
  const [votesAgainst, setVotesAgainst] = useState(24);
  const [timeLeft, setTimeLeft] = useState(185); // Seconds

  // Simulation Effects
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate vote counters changing
      if (Math.random() > 0.7) {
        setVotesFor(prev => Math.min(prev + 1, 141));
      }
      if (Math.random() > 0.8) {
        setVotesAgainst(prev => Math.min(prev + 1, 141));
      }
      
      // Countdown
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalVotes = votesFor + votesAgainst;
  const maxVotes = 141; // Seimas size
  const percentFor = (votesFor / maxVotes) * 100;
  const percentAgainst = (votesAgainst / maxVotes) * 100;

  return (
    <div className="w-full aspect-video bg-black relative overflow-hidden flex flex-col font-sans select-none border border-gray-800 rounded-xl shadow-2xl">
      
      {/* 1. The "Stage" (Video Feed Area) */}
      <div className="relative flex-1 bg-gray-900 w-full overflow-hidden">
        {/* Simulated Video Feed Layer */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
             {/* Background Image simulating video feed */}
             <img 
                src="https://images.unsplash.com/photo-1575320181282-9afab399332c?q=80&w=2070&auto=format&fit=crop" 
                alt="Parliament Video Feed" 
                className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[30%]"
             />
             
             {/* "LIVE" Indicator watermark */}
             <div className="absolute top-8 left-8 flex items-center gap-3 bg-red-600/90 px-4 py-2 rounded-sm backdrop-blur-sm shadow-lg z-10">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="text-white font-bold tracking-widest text-lg">LIVE FEED</span>
             </div>
        </div>

        {/* --- HUD OVERLAYS --- */}

        {/* Top Right: Live Vote Status */}
        <div className="absolute top-8 right-8 w-[450px] bg-black/90 backdrop-blur-md border border-white/10 p-8 rounded-xl shadow-2xl transform transition-all hover:scale-105 duration-500">
            <h3 className="text-white/60 uppercase tracking-[0.2em] font-bold text-sm mb-6 flex items-center justify-between">
                <span className="flex items-center gap-2"><Activity size={18} className="text-blue-500" /> Real-time Analytics</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/40">ID: V-2024-88</span>
            </h3>
            
            <div className="space-y-8">
                {/* FOR */}
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-green-500 font-bold text-3xl uppercase tracking-wider flex items-center gap-3">
                            <ThumbsUp size={28} /> For
                        </span>
                        <span className="text-white font-mono text-6xl font-black tracking-tighter leading-none filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            <ScrambleNumber value={votesFor.toString().padStart(3, '0')} />
                        </span>
                    </div>
                    {/* Bar Chart Track */}
                    <div className="h-6 bg-gray-800/50 rounded-sm overflow-hidden border border-white/5 relative">
                        {/* Grid lines on bar */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                        <div 
                            className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-1000 ease-out relative" 
                            style={{ width: `${percentFor}%` }} 
                        >
                           <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50" />
                        </div>
                    </div>
                </div>

                {/* AGAINST */}
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-red-500 font-bold text-3xl uppercase tracking-wider flex items-center gap-3">
                             <ThumbsDown size={28} /> Against
                        </span>
                        <span className="text-white font-mono text-6xl font-black tracking-tighter leading-none filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            <ScrambleNumber value={votesAgainst.toString().padStart(3, '0')} />
                        </span>
                    </div>
                     {/* Bar Chart Track */}
                    <div className="h-6 bg-gray-800/50 rounded-sm overflow-hidden border border-white/5 relative">
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                        <div 
                            className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-1000 ease-out relative" 
                            style={{ width: `${percentAgainst}%` }} 
                        >
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Bottom Left: Current Speaker */}
        <div className="absolute bottom-8 left-8 flex items-end gap-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
            <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-800 group">
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-900">
                    <User size={80} />
                </div>
                <img 
                   src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop"
                   alt="Speaker"
                   className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Overlay Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
                <div className="absolute bottom-2 left-0 right-0 text-center text-white/80 text-xs uppercase font-bold tracking-widest">Speaker</div>
            </div>

            <div className="bg-black/90 backdrop-blur-md border border-white/10 px-10 py-8 rounded-xl shadow-2xl min-w-[380px]">
                <div className="flex items-center gap-3 text-white/50 mb-2 uppercase tracking-widest text-sm font-bold">
                    <span className="text-blue-400">{SPEAKER.party}</span>
                    <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
                    <span>Floor Time</span>
                </div>
                <h2 className="text-5xl text-white font-black uppercase tracking-tight mb-6 leading-none truncate max-w-[400px]">
                    {SPEAKER.name}
                </h2>
                
                <div className="flex items-center gap-5 border-t border-white/10 pt-5">
                    <Clock className="text-yellow-500 animate-pulse" size={32} />
                    <span className="text-6xl font-mono text-yellow-500 font-bold tracking-widest leading-none drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                        <ScrambleNumber value={formatTime(timeLeft)} />
                    </span>
                </div>
            </div>
        </div>

      </div>

      {/* 2. The "Ticker" (Bottom Bar) */}
      <div className="h-[120px] bg-black border-t border-gray-800 flex items-center overflow-hidden relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
          {/* Gradient Masks */}
          <div className="absolute left-0 top-0 bottom-0 w-48 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-black via-black/80 to-transparent z-10 pointer-events-none" />
          
          <div className="flex whitespace-nowrap animate-marquee">
              {/* Duplicated list for seamless loop */}
              {[...RECENT_VOTES, ...RECENT_VOTES, ...RECENT_VOTES].map((vote, i) => (
                  <div key={i} className="flex items-center mx-12">
                      <span className={cn(
                          "text-4xl font-mono font-bold uppercase tracking-widest filter drop-shadow-md",
                          vote.includes("ACCEPTED") ? "text-green-500" : 
                          vote.includes("REJECTED") ? "text-red-500" : "text-gray-400"
                      )}>
                          {vote}
                      </span>
                      <span className="ml-24 text-gray-800 text-3xl font-black opacity-30">///</span>
                  </div>
              ))}
          </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
