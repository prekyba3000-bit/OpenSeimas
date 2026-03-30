import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TickerItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function TickerItem({ icon: Icon, label, value, trend, trendValue }: TickerItemProps) {
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500';
  
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-r border-white/10 min-w-[200px] flex-shrink-0">
      <div className="flex items-center justify-center w-8 h-8">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono">
          {label}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white font-mono tabular-nums">
            {value}
          </span>
          {trendValue && (
            <span className={`text-xs font-mono tabular-nums ${trendColor}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface TickerTapeProps {
  items: TickerItemProps[];
  autoScroll?: boolean;
}

export function TickerTape({ items, autoScroll = true }: TickerTapeProps) {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.02) 3px)',
        }}
      />
      
      {/* Edge fade gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#141517] to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#141517] to-transparent z-20 pointer-events-none" />
      
      {/* Ticker content */}
      <div 
        className="flex"
        style={{
          animation: autoScroll ? 'ticker-scroll 30s linear infinite' : 'none',
        }}
      >
        {items.map((item, i) => (
          <TickerItem key={i} {...item} />
        ))}
        {/* Duplicate for seamless loop */}
        {items.map((item, i) => (
          <TickerItem key={`duplicate-${i}`} {...item} />
        ))}
      </div>
      
      {/* CSS animation keyframes */}
      <style>{`
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}