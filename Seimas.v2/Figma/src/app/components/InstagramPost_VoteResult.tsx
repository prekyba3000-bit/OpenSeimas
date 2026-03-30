import React from 'react';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import { Check, X, Share2, Download, Instagram } from 'lucide-react';
import { Button } from './ui/button';

interface InstagramPostProps {
  title?: string;
  outcome?: 'ACCEPTED' | 'REJECTED';
  date?: string;
}

export function InstagramPost_VoteResult({ 
  title = "BUDGET AMENDMENT 2026-A", 
  outcome = "ACCEPTED",
  date = "FEB 07, 2026"
}: InstagramPostProps) {
  
  const isAccepted = outcome === 'ACCEPTED';
  const primaryColor = isAccepted ? '#22c55e' : '#ef4444'; // Green-500 : Red-500
  const glowColor = isAccepted ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Controls / Context */}
      <div className="flex items-center justify-between w-full max-w-[500px]">
        <div className="flex items-center gap-2 text-gray-400">
           <Instagram size={18} />
           <span className="text-sm font-medium">Post Preview (1080x1080)</span>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-2">
                <Share2 size={14} /> Share
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-2">
                <Download size={14} /> Export PNG
            </Button>
        </div>
      </div>

      {/* The Canvas (Scaled down for view, but aspect ratio locked) */}
      <div 
        className="relative w-full max-w-[500px] aspect-square bg-[#0B0C0E] overflow-hidden rounded-sm shadow-2xl border border-gray-800 flex flex-col items-center justify-between p-12 text-center select-none"
        style={{
            // Subtle noise texture overlay
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
        }}
      >
        {/* Background Ambient Glow */}
        <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
                background: `radial-gradient(circle at center, ${primaryColor} 0%, transparent 70%)`
            }}
        />

        {/* 1. Top Typography */}
        <div className="relative z-10 w-full border-b border-white/10 pb-6">
            <div className="flex items-center justify-center gap-4 text-white/80 font-mono tracking-[0.3em] text-sm uppercase">
                <span>●</span>
                <span>Breaking News</span>
                <span>●</span>
            </div>
            <div className="mt-2 text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                {date} • Vilnius, Lithuania
            </div>
        </div>

        {/* 2. Visual Anchor (3D Glass Icon) */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8">
            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Back Glow Layer */}
                <div 
                    className="absolute inset-0 rounded-full blur-[60px] opacity-40 animate-pulse"
                    style={{ backgroundColor: primaryColor }}
                />
                
                {/* The 'Glass' Icon Container */}
                <div 
                    className="relative w-40 h-40 flex items-center justify-center rounded-[3rem] border border-white/20 backdrop-blur-sm shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)]"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.01) 100%)',
                        boxShadow: `0 20px 40px -10px ${glowColor}, inset 0 0 20px rgba(255,255,255,0.1)`
                    }}
                >
                    {/* Inner 3D Icon */}
                    {isAccepted ? (
                        <Check 
                            size={100} 
                            strokeWidth={3}
                            className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" 
                        />
                    ) : (
                        <X 
                            size={100} 
                            strokeWidth={3}
                            className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" 
                        />
                    )}
                    
                    {/* Glossy Reflection Highlight */}
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white opacity-20 blur-[2px]" />
                </div>
            </div>

            {/* Middle: Vote Title */}
            <h1 className="mt-8 text-4xl md:text-5xl font-black text-white leading-[0.9] tracking-tight uppercase drop-shadow-xl max-w-[90%]">
                {title}
            </h1>
        </div>

        {/* 3. Bottom Status */}
        <div className="relative z-10 flex flex-col items-center gap-6 w-full pt-6 border-t border-white/10">
            <div 
                className={cn(
                    "px-8 py-3 rounded-full text-xl font-bold tracking-widest uppercase border backdrop-blur-md shadow-lg",
                    isAccepted 
                        ? "bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)]" 
                        : "bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]"
                )}
            >
                {outcome}
            </div>

            {/* 4. Watermark */}
            <div className="text-white/30 font-bold text-sm tracking-[0.2em] mix-blend-overlay">
                SKAIDRUS SEIMAS V.2
            </div>
        </div>
      </div>
    </div>
  );
}
