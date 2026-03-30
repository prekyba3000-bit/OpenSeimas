import React from 'react';

interface MobileVoteStripProps {
  title: string;
  outcome: 'PASSED' | 'FAILED' | 'DEFERRED';
  votesFor?: number;
  votesAgainst?: number;
  onClick?: () => void;
}

export function MobileVoteStrip({ title, outcome, votesFor, votesAgainst, onClick }: MobileVoteStripProps) {
  // Outcome edge configuration
  const outcomeConfig = {
    PASSED: {
      color: '#22C55E',
      glowColor: 'rgba(34, 197, 94, 0.5)',
      badgeText: 'text-green-400',
    },
    FAILED: {
      color: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.5)',
      badgeText: 'text-red-400',
    },
    DEFERRED: {
      color: '#EAB308',
      glowColor: 'rgba(234, 179, 8, 0)',
      badgeText: 'text-yellow-400',
    },
  };

  const config = outcomeConfig[outcome] || outcomeConfig.PASSED;

  return (
    <button
      className="relative w-full h-12 flex items-center gap-3 px-3 bg-[#141517] active:bg-[#1C1D21] transition-colors touch-manipulation"
      onClick={onClick}
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

      {/* Title (Truncated, No Date/ID) */}
      <div className="flex-1 min-w-0 pl-2">
        <p className="text-sm font-medium text-white truncate">
          {title}
        </p>
      </div>

      {/* Optional compact vote counts */}
      {votesFor !== undefined && votesAgainst !== undefined && (
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="text-xs font-mono text-green-400 tabular-nums">{votesFor}</span>
          <span className="text-xs font-mono text-gray-600">:</span>
          <span className="text-xs font-mono text-red-400 tabular-nums">{votesAgainst}</span>
        </div>
      )}

      {/* Chevron indicator */}
      <div className="flex-shrink-0">
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
