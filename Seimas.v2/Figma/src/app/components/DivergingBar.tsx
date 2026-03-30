import React from 'react';

interface DivergingBarProps {
  labelA: string; // Left side label (e.g., "MP A" or name)
  labelB: string; // Right side label (e.g., "MP B" or name)
  valueA: number; // 0-100 percentage for left bar
  valueB: number; // 0-100 percentage for right bar
  title?: string; // Optional title above the bar
  synergy?: boolean; // If true, applies cyan "overdrive" effect
}

export function DivergingBar({ 
  labelA, 
  labelB, 
  valueA, 
  valueB, 
  title,
  synergy = false 
}: DivergingBarProps) {
  // Normalize values to ensure they don't exceed container
  const normalizedA = Math.min(Math.max(valueA, 0), 100);
  const normalizedB = Math.min(Math.max(valueB, 0), 100);
  
  // Determine colors based on synergy state
  const colorA = synergy ? '#06B6D4' : '#EF4444'; // Cyan or Red
  const colorB = synergy ? '#06B6D4' : '#22C55E'; // Cyan or Green
  
  return (
    <div className="w-full">
      {/* Optional Title */}
      {title && (
        <div className="mb-3 text-center">
          <h4 className="text-sm font-medium text-white">{title}</h4>
        </div>
      )}

      {/* Labels Row */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="text-xs font-medium text-gray-400">{labelA}</div>
        <div className="text-xs font-medium text-gray-400">{labelB}</div>
      </div>

      {/* The Track Container */}
      <div 
        className="relative h-16 rounded-full bg-black overflow-hidden"
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* The "Neutral" Zone (Center Line) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2 z-10" />

        {/* Power Bars Container */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Left Bar (MP A) - Grows from center to left */}
          <div 
            className="absolute left-1/2 top-0 bottom-0 origin-right"
            style={{ 
              width: `${normalizedA / 2}%`,
              transform: 'translateX(-100%)',
            }}
          >
            <div 
              className="h-full relative"
              style={{
                background: synergy 
                  ? `linear-gradient(to left, ${colorA}, transparent)`
                  : `linear-gradient(to left, ${colorA}, transparent)`,
              }}
            >
              {/* Synergy Glow Layer */}
              {synergy && (
                <div 
                  className="absolute inset-0"
                  style={{
                    background: colorA,
                    filter: 'blur(20px)',
                    opacity: 0.4,
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Bar (MP B) - Grows from center to right */}
          <div 
            className="absolute left-1/2 top-0 bottom-0 origin-left"
            style={{ 
              width: `${normalizedB / 2}%`,
            }}
          >
            <div 
              className="h-full relative"
              style={{
                background: synergy 
                  ? `linear-gradient(to right, ${colorB}, transparent)`
                  : `linear-gradient(to right, ${colorB}, transparent)`,
              }}
            >
              {/* Synergy Glow Layer */}
              {synergy && (
                <div 
                  className="absolute inset-0"
                  style={{
                    background: colorB,
                    filter: 'blur(20px)',
                    opacity: 0.4,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* 50% Label at Bottom Center */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
          <span 
            className="text-[9px] text-white/40 font-mono font-bold"
          >
            50%
          </span>
        </div>

        {/* Value Labels on Bars */}
        <div className="absolute inset-0 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-2">
            {normalizedA > 10 && (
              <span 
                className="text-xs font-bold font-mono"
                style={{ color: synergy ? '#22D3EE' : '#FCA5A5' }}
              >
                {normalizedA.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {normalizedB > 10 && (
              <span 
                className="text-xs font-bold font-mono"
                style={{ color: synergy ? '#22D3EE' : '#86EFAC' }}
              >
                {normalizedB.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Synergy Badge (if active) */}
      {synergy && (
        <div className="mt-3 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <div 
              className="w-2 h-2 rounded-full bg-cyan-400"
              style={{
                boxShadow: '0 0 8px rgba(6, 182, 212, 0.6)',
              }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Synergy Overdrive
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
