import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface Hotspot {
  x: number; // Percentage position (0-100)
  y: number; // Percentage position (0-100)
  label: string;
  intensity: 'high' | 'medium' | 'low';
}

interface SeatingMapProps {
  hotspots?: Hotspot[];
}

export function SeatingMap({ hotspots = [] }: SeatingMapProps) {
  const [hoveredHotspot, setHoveredHotspot] = useState<number | null>(null);
  
  return (
    <div className="relative w-full h-full bg-[#0a0a0c] rounded-xl overflow-hidden border border-white/10">
      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.02) 3px)',
        }}
      />
      
      {/* Grid pattern background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Map placeholder - Seimas seating arrangement */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[80%] h-[80%]">
          {/* Semicircular seating visualization */}
          <svg viewBox="0 0 400 300" className="w-full h-full">
            {/* Outer arc */}
            <path
              d="M 50 250 Q 50 50, 200 30 T 350 250"
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="2"
            />
            {/* Middle arc */}
            <path
              d="M 80 240 Q 80 80, 200 60 T 320 240"
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="2"
            />
            {/* Inner arc */}
            <path
              d="M 110 230 Q 110 110, 200 90 T 290 230"
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="2"
            />
            
            {/* Radial lines */}
            {Array.from({ length: 9 }).map((_, i) => {
              const angle = (i * 20 - 80) * (Math.PI / 180);
              const x1 = 200 + Math.cos(angle) * 80;
              const y1 = 240 + Math.sin(angle) * 80;
              const x2 = 200 + Math.cos(angle) * 160;
              const y2 = 240 + Math.sin(angle) * 160;
              
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(59, 130, 246, 0.2)"
                  strokeWidth="1"
                />
              );
            })}
            
            {/* Center podium */}
            <rect
              x="180"
              y="250"
              width="40"
              height="30"
              fill="rgba(59, 130, 246, 0.2)"
              stroke="rgba(59, 130, 246, 0.4)"
              strokeWidth="2"
            />
            
            {/* Seat markers */}
            {Array.from({ length: 141 }).map((_, i) => {
              // Distribute seats across 3 arcs
              const arcIndex = Math.floor(i / 47);
              const seatInArc = i % 47;
              const totalSeatsInArc = 47;
              
              const radius = 85 + arcIndex * 30;
              const angleSpread = 160;
              const startAngle = -80;
              const angle = (startAngle + (seatInArc / totalSeatsInArc) * angleSpread) * (Math.PI / 180);
              
              const cx = 200 + Math.cos(angle) * radius;
              const cy = 240 + Math.sin(angle) * radius;
              
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="2"
                  fill="rgba(59, 130, 246, 0.4)"
                />
              );
            })}
          </svg>
        </div>
        
        {/* Center label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider">
            Seimas Chamber
          </div>
          <div className="text-[10px] text-gray-700 font-mono">
            141 Seats
          </div>
        </div>
      </div>
      
      {/* Hotspot overlays */}
      {hotspots.map((hotspot, i) => {
        const intensityConfig = {
          high: { color: '#EF4444', size: 'w-6 h-6', pulseOpacity: '0.6' },
          medium: { color: '#F59E0B', size: 'w-5 h-5', pulseOpacity: '0.4' },
          low: { color: '#3B82F6', size: 'w-4 h-4', pulseOpacity: '0.3' },
        };
        
        const config = intensityConfig[hotspot.intensity];
        const isHovered = hoveredHotspot === i;
        
        return (
          <div
            key={i}
            className="absolute z-10 cursor-pointer"
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseEnter={() => setHoveredHotspot(i)}
            onMouseLeave={() => setHoveredHotspot(null)}
          >
            {/* Pulsing ring */}
            <div 
              className={`absolute inset-0 ${config.size} rounded-full animate-ping`}
              style={{
                backgroundColor: config.color,
                opacity: config.pulseOpacity,
              }}
            />
            
            {/* Core dot */}
            <div 
              className={`relative ${config.size} rounded-full flex items-center justify-center`}
              style={{
                backgroundColor: config.color,
                boxShadow: `0 0 20px ${config.color}`,
              }}
            >
              <AlertCircle className="w-3 h-3 text-white" />
            </div>
            
            {/* Tooltip on hover */}
            {isHovered && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg whitespace-nowrap z-50">
                <div className="text-xs text-white font-medium">{hotspot.label}</div>
                <div className="text-[10px] text-gray-400 font-mono uppercase">
                  {hotspot.intensity} activity
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Status indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm border border-green-500/20 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-green-400 font-mono uppercase tracking-wider">
          Live
        </span>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-gray-400 font-mono">High Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-gray-400 font-mono">Medium Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-gray-400 font-mono">Low Activity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
