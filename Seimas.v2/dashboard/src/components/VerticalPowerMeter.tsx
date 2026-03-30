import React from 'react';

interface VerticalPowerMeterProps {
  nameA: string;
  nameB: string;
  valueA: number; // 0-100
  valueB: number; // 0-100
  labelA?: string;
  labelB?: string;
  colorA?: string;
  colorB?: string;
}

export function VerticalPowerMeter({
  nameA,
  nameB,
  valueA,
  valueB,
  labelA,
  labelB,
  colorA = '#3B82F6',
  colorB = '#8B5CF6',
}: VerticalPowerMeterProps) {
  // Normalize values to percentage
  const total = valueA + valueB;
  const percentA = total > 0 ? (valueA / total) * 100 : 50;
  const percentB = total > 0 ? (valueB / total) * 100 : 50;
  
  // Determine dominance for "Synergy Overdrive" effect
  const difference = Math.abs(percentA - percentB);
  const hasOverdrive = difference > 60; // Trigger when one side has 80%+ dominance
  const dominantColor = percentA > percentB ? colorA : colorB;
  
  return (
    <div className="w-full h-full flex flex-col bg-[#0B0C0E] rounded-xl border border-white/10 p-4">
      {/* Player A - Top */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <div className="text-sm font-semibold text-white truncate">{nameA}</div>
            {labelA && (
              <div className="text-xs text-gray-500 font-mono">{labelA}</div>
            )}
          </div>
          <div 
            className="text-2xl font-bold tabular-nums ml-2"
            style={{ color: colorA }}
          >
            {valueA}
          </div>
        </div>
      </div>
      
      {/* Vertical Power Meter */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="relative h-full w-16">
          {/* Background track */}
          <div className="absolute inset-0 bg-white/5 rounded-full overflow-hidden">
            {/* Player A bar (from top) */}
            <div
              className="absolute top-0 left-0 right-0 transition-all duration-500 ease-out"
              style={{
                height: `${percentA}%`,
                background: `linear-gradient(to bottom, ${colorA}, ${colorA}99)`,
                boxShadow: hasOverdrive && percentA > percentB 
                  ? `0 0 20px ${colorA}, 0 0 40px ${colorA}80` 
                  : `0 0 10px ${colorA}80`,
              }}
            >
              {/* Synergy Overdrive effect */}
              {hasOverdrive && percentA > percentB && (
                <div 
                  className="absolute inset-0 animate-pulse"
                  style={{
                    background: `linear-gradient(to bottom, transparent, ${colorA}40)`,
                  }}
                />
              )}
            </div>
            
            {/* Player B bar (from bottom) */}
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
              style={{
                height: `${percentB}%`,
                background: `linear-gradient(to top, ${colorB}, ${colorB}99)`,
                boxShadow: hasOverdrive && percentB > percentA 
                  ? `0 0 20px ${colorB}, 0 0 40px ${colorB}80` 
                  : `0 0 10px ${colorB}80`,
              }}
            >
              {/* Synergy Overdrive effect */}
              {hasOverdrive && percentB > percentA && (
                <div 
                  className="absolute inset-0 animate-pulse"
                  style={{
                    background: `linear-gradient(to top, transparent, ${colorB}40)`,
                  }}
                />
              )}
            </div>
            
            {/* Center divider line */}
            <div 
              className="absolute left-0 right-0 h-0.5 bg-white/20 transition-all duration-500"
              style={{
                top: `${percentA}%`,
                transform: 'translateY(-50%)',
              }}
            />
          </div>
          
          {/* Percentage labels */}
          <div className="absolute left-full ml-3 top-0 text-xs font-mono text-gray-500 tabular-nums">
            {Math.round(percentA)}%
          </div>
          <div className="absolute left-full ml-3 bottom-0 text-xs font-mono text-gray-500 tabular-nums">
            {Math.round(percentB)}%
          </div>
          
          {/* Overflow indicator */}
          {hasOverdrive && (
            <div 
              className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider rotate-90 origin-center whitespace-nowrap"
              style={{ color: dominantColor }}
            >
              Overdrive
            </div>
          )}
        </div>
      </div>
      
      {/* Player B - Bottom */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mt-2">
          <div className="flex-1">
            <div className="text-sm font-semibold text-white truncate">{nameB}</div>
            {labelB && (
              <div className="text-xs text-gray-500 font-mono">{labelB}</div>
            )}
          </div>
          <div 
            className="text-2xl font-bold tabular-nums ml-2"
            style={{ color: colorB }}
          >
            {valueB}
          </div>
        </div>
      </div>
    </div>
  );
}
