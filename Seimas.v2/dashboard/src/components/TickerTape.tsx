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
  const trendColor = trend === 'up' ? 'text-vote-for' : trend === 'down' ? 'text-vote-against' : 'text-muted-foreground';
  
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-r border-border min-w-[200px] flex-shrink-0">
      <div className="flex items-center justify-center w-8 h-8">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">
          {label}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-foreground font-mono tabular-nums">
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
      {/* The CRT scanline overlay that used to sit here was removed: a fake
          cathode-ray artefact is set dressing, and it was drawn in white over
          a page that is now paper. The edge fades stay — they hide the marquee
          seam — but they fade to the actual page colour instead of a literal
          dark hex. */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />
      
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
        {/* Second copy exists only to make the marquee loop seamlessly: the
            animation translates by -50%, so the duplicate slides in as the
            original slides out. With autoScroll off there is no animation to
            hide it, and it renders as a visible second set of stat cards —
            which is exactly how the landing page came to show each metric
            twice. Render it only when it is actually doing that job. */}
        {autoScroll && items.map((item, i) => (
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