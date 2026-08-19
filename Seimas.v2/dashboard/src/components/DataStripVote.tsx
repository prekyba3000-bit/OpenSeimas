import React from 'react';

export type VoteOutcome = 'PASSED' | 'FAILED' | 'DEFERRED';

interface DataStripVoteProps {
  title: string;
  /**
   * null when the source does not publish a result.
   *
   * The LRS vote-results XML carries tallies (už/prieš/susilaikė) but no
   * pass/fail field, so most votes genuinely have no recorded outcome. This
   * previously defaulted to 'DEFERRED', which asserted the Seimas had deferred
   * a vote when the source said nothing at all. Unknown renders as unknown.
   */
  outcome: VoteOutcome | null;
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

  const config = outcome ? outcomeConfig[outcome] : null;

  return (
    <button
      className="relative w-full h-14 flex items-center gap-4 px-4 bg-[#141517] hover:bg-[#1C1D21] transition-colors border-b border-white/5 last:border-b-0"
      style={{ fontFamily: 'Inter, Geist Sans, sans-serif' }}
    >
      {/* The "Outcome Edge" — a 4px colour bar reading as a verdict, so it is
          drawn only when there is a verdict to read. */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          backgroundColor: config ? config.color : 'transparent',
          boxShadow: config && outcome !== 'DEFERRED' ? `0 0 8px ${config.glowColor}` : 'none',
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

      {/* Result badge — omitted entirely when the source publishes no result.
          A neutral "unknown" chip would still occupy the slot where readers
          have learned to find a verdict; absence is the honest rendering. */}
      {config && (
        <div className={`flex-shrink-0 h-5 px-2 flex items-center justify-center rounded-md ${config.badgeBg}`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${config.badgeText}`}>
            {outcome}
          </span>
        </div>
      )}
    </button>
  );
}