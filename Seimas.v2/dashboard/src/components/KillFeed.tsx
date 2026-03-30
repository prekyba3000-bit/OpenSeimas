import React from 'react';
import { DataStripVote } from './DataStripVote';

export interface KillFeedEvent {
  title: string;
  outcome: 'PASSED' | 'FAILED' | 'DEFERRED';
  votesFor: number;
  votesAgainst: number;
  timestamp: string;
}

interface KillFeedProps {
  events: KillFeedEvent[];
  maxItems?: number;
}

export function KillFeed({ events, maxItems = 8 }: KillFeedProps) {
  const displayedEvents = events.slice(0, maxItems);
  
  return (
    <div className="relative">
      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.02) 3px)',
        }}
      />
      
      {/* Kill feed list */}
      <div className="space-y-2">
        {displayedEvents.map((event, i) => (
          <div 
            key={i}
            className="animate-fadeIn"
            style={{
              animationDelay: `${i * 50}ms`,
            }}
          >
            <DataStripVote
              title={event.title}
              outcome={event.outcome}
              votesFor={event.votesFor}
              votesAgainst={event.votesAgainst}
              timestamp={event.timestamp}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
