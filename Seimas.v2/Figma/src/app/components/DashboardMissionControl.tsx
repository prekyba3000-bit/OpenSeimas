import React from 'react';
import { TickerTape } from './TickerTape';
import { KillFeed, KillFeedEvent } from './KillFeed';
import { SeatingMap } from './SeatingMap';
import { CornerAccents } from './CornerAccents';
import { Vote, Users, TrendingUp, Activity } from 'lucide-react';

interface DashboardMissionControlProps {
  liveMetrics?: Array<{
    icon: any;
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }>;
  recentEvents?: KillFeedEvent[];
  hotspots?: Array<{
    x: number;
    y: number;
    label: string;
    intensity: 'high' | 'medium' | 'low';
  }>;
}

export function DashboardMissionControl({
  liveMetrics,
  recentEvents,
  hotspots,
}: DashboardMissionControlProps) {
  // Default live metrics
  const defaultMetrics = [
    { icon: Vote, label: 'Active Votes', value: '3', trend: 'neutral' as const, trendValue: 'LIVE' },
    { icon: Users, label: 'Members Present', value: '127', trend: 'up' as const, trendValue: '+12' },
    { icon: TrendingUp, label: 'Bills This Week', value: '18', trend: 'up' as const, trendValue: '+3' },
    { icon: Activity, label: 'Debates Active', value: '5', trend: 'neutral' as const, trendValue: 'NOW' },
  ];
  
  // Default recent events
  const defaultEvents: KillFeedEvent[] = [
    {
      title: 'Healthcare Reform Bill 2026-A',
      outcome: 'PASSED',
      votesFor: 84,
      votesAgainst: 42,
      timestamp: '2m ago',
    },
    {
      title: 'Education Budget Amendment',
      outcome: 'PASSED',
      votesFor: 92,
      votesAgainst: 35,
      timestamp: '8m ago',
    },
    {
      title: 'Tax Reform Proposal LR-2026-003',
      outcome: 'FAILED',
      votesFor: 48,
      votesAgainst: 78,
      timestamp: '15m ago',
    },
    {
      title: 'Environmental Protection Act',
      outcome: 'PASSED',
      votesFor: 105,
      votesAgainst: 28,
      timestamp: '22m ago',
    },
    {
      title: 'Digital Infrastructure Package',
      outcome: 'DEFERRED',
      votesFor: 65,
      votesAgainst: 65,
      timestamp: '35m ago',
    },
    {
      title: 'Labor Law Amendment 2026-B',
      outcome: 'PASSED',
      votesFor: 88,
      votesAgainst: 45,
      timestamp: '41m ago',
    },
    {
      title: 'Transportation Budget Allocation',
      outcome: 'PASSED',
      votesFor: 96,
      votesAgainst: 38,
      timestamp: '1h ago',
    },
    {
      title: 'Energy Policy Reform Initiative',
      outcome: 'FAILED',
      votesFor: 52,
      votesAgainst: 82,
      timestamp: '1h ago',
    },
  ];
  
  // Default hotspots
  const defaultHotspots = [
    { x: 35, y: 45, label: 'Coalition Debate', intensity: 'high' as const },
    { x: 65, y: 50, label: 'Budget Discussion', intensity: 'high' as const },
    { x: 50, y: 35, label: 'Committee Meeting', intensity: 'medium' as const },
    { x: 25, y: 60, label: 'Opposition Bloc', intensity: 'low' as const },
  ];
  
  const metrics = liveMetrics || defaultMetrics;
  const events = recentEvents || defaultEvents;
  const spots = hotspots || defaultHotspots;
  
  return (
    <div className="w-full h-screen bg-[#0B0C0E] p-6">
      {/* Global scanline overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.015) 3px)',
        }}
      />
      
      {/* Bento Box Grid Layout */}
      <div className="grid grid-cols-2 grid-rows-2 gap-6 h-full">
        {/* Zone A: Top Left (25%) - Live Metrics Ticker Tape */}
        <div className="relative bg-[#141517] rounded-xl border border-white/10 overflow-hidden">
          <CornerAccents />
          
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
                Live Metrics
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Ticker content */}
          <div className="absolute top-14 left-0 right-0 bottom-0 flex items-center">
            <TickerTape items={metrics} />
          </div>
        </div>
        
        {/* Zone B: Bottom Left (25%) - Recent Events Kill Feed */}
        <div className="relative bg-[#141517] rounded-xl border border-white/10 overflow-hidden">
          <CornerAccents />
          
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-green-400 font-mono">
                Recent Events
              </h2>
              <span className="text-[10px] text-gray-500 font-mono">
                Kill Feed
              </span>
            </div>
          </div>
          
          {/* Kill feed content */}
          <div className="absolute top-14 left-0 right-0 bottom-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-4">
            <KillFeed events={events} maxItems={8} />
          </div>
        </div>
        
        {/* Zone C: Right (50%) - The Map */}
        <div className="relative bg-[#141517] rounded-xl border border-white/10 overflow-hidden row-span-2">
          <CornerAccents size={20} thickness={2} />
          
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Seimas Chamber - Live View
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[10px] text-red-400 font-mono font-bold">
                    {spots.filter(s => s.intensity === 'high').length} ACTIVE
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {spots.length} Hotspots
                </span>
              </div>
            </div>
          </div>
          
          {/* Map content */}
          <div className="absolute top-14 left-0 right-0 bottom-0">
            <SeatingMap hotspots={spots} />
          </div>
        </div>
      </div>
      
      {/* System status bar */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-black/80 backdrop-blur-sm border-t border-white/10 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-6 text-[10px] font-mono text-gray-500">
          <span>SYSTEM: OPERATIONAL</span>
          <span>•</span>
          <span>REFRESH: AUTO</span>
          <span>•</span>
          <span>LATENCY: 23ms</span>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-mono text-gray-500">
          <span>Dashboard_Mission_Control v2.1</span>
          <span>•</span>
          <span>SEIMAS LT</span>
        </div>
      </div>
    </div>
  );
}
