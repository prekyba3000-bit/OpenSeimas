import React from 'react';

interface DataStripVoteProps {
  title: string;
  outcome: 'PASSED' | 'FAILED' | 'DEFERRED';
  votesFor: number;
  votesAgainst: number;
  timestamp: string;
}

export function DataStripVote({ title, outcome, votesFor, votesAgainst, timestamp }: DataStripVoteProps) {
  // Outcome edge configuration
  const outcomeConfig = {
    PASSED: {
      color: '#22C55E',
      glowColor: 'rgba(34, 197, 94, 0.5)',
      badgeBg: 'bg-green-500/5',
      badgeText: 'text-green-400',
    },
    FAILED: {
      color: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.5)',
      badgeBg: 'bg-red-500/5',
      badgeText: 'text-red-400',
    },
    DEFERRED: {
      color: '#EAB308',
      glowColor: 'rgba(234, 179, 8, 0)',
      badgeBg: 'bg-yellow-500/5',
      badgeText: 'text-yellow-400',
    },
  };

  const config = outcomeConfig[outcome] || outcomeConfig.PASSED; // Fallback to PASSED if undefined

  return (
    <button
      className="relative w-full h-14 flex items-center gap-4 px-4 bg-[#141517] hover:bg-[#1C1D21] transition-colors border-b border-white/5 last:border-b-0"
      style={{ fontFamily: 'Inter, Geist Sans, sans-serif' }}
    >
      {/* The "Outcome Edge" - Critical 4px Indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          backgroundColor: config.color,
          boxShadow: outcome !== 'DEFERRED' ? `0 0 8px ${config.glowColor}` : 'none',
        }}
      />

      {/* Data Column 1 - Timestamp (Mono-Spaced) */}
      <div className="flex-shrink-0 w-16 pl-3">
        <span
          className="text-[11px] text-gray-500"
          style={{ fontFamily: 'Geist Mono, monospace' }}
        >
          {timestamp}
        </span>
      </div>

      {/* Data Column 2 - Title (Medium Weight, Truncate) */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-white truncate">
          {title}
        </p>
      </div>

      {/* Data Column 3 - Vote Counts (only if available) */}
      {(votesFor > 0 || votesAgainst > 0) && (
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-xs font-mono text-green-400">{votesFor}</span>
          <span className="text-xs font-mono text-gray-600">-</span>
          <span className="text-xs font-mono text-red-400">{votesAgainst}</span>
        </div>
      )}

      {/* Data Column 4 - Result Badge */}
      <div className={`flex-shrink-0 h-5 px-2 flex items-center justify-center rounded-md ${config.badgeBg}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${config.badgeText}`}>
          {outcome}
        </span>
      </div>
    </button>
  );
}