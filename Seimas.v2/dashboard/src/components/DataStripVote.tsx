import React from 'react';
import { formatLtDateShort } from '../utils/ltDate';

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
  // Outcome edge configuration. The colours are theme tokens, not literals:
  // the strip used to be signal green / alarm red / warning yellow with a
  // matching glow, which framed a parliamentary decision as a build status.
  // The label was also English („PASSED“) on a Lithuanian page.
  const outcomeConfig = {
    PASSED: {
      edge: 'bg-vote-for',
      badgeBg: 'bg-vote-for/10',
      badgeText: 'text-vote-for',
      label: 'Priimta',
    },
    FAILED: {
      edge: 'bg-vote-against',
      badgeBg: 'bg-vote-against/10',
      badgeText: 'text-vote-against',
      label: 'Nepriimta',
    },
    DEFERRED: {
      edge: 'bg-vote-abstain',
      badgeBg: 'bg-vote-abstain/10',
      badgeText: 'text-vote-abstain',
      label: 'Atidėta',
    },
  };

  const config = outcome ? outcomeConfig[outcome] : null;

  return (
    <button
      className="relative w-full min-h-14 flex items-center gap-4 px-4 bg-card hover:bg-muted transition-colors border-b border-border last:border-b-0"
    >
      {/* The "Outcome Edge" — a 4px colour bar reading as a verdict, so it is
          drawn only when there is a verdict to read. */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config ? config.edge : 'bg-transparent'}`} />

      {/* Data Column 1 - Timestamp (Mono-Spaced) */}
      <div className="flex-shrink-0 w-16 pl-3">
        <span className="text-xs font-mono text-muted-foreground">
          {formatLtDateShort(timestamp) ?? timestamp}
        </span>
      </div>

      {/* Data Column 2 - Title (Medium Weight, Truncate) */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-card-foreground truncate">
          {title}
        </p>
      </div>

      {/* Data Column 3 - Vote Counts (only if available) */}
      {(votesFor > 0 || votesAgainst > 0) && (
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-xs font-mono text-vote-for">{votesFor}</span>
          <span className="text-xs font-mono text-muted-foreground">–</span>
          <span className="text-xs font-mono text-vote-against">{votesAgainst}</span>
        </div>
      )}

      {/* Result badge — omitted entirely when the source publishes no result.
          A neutral "unknown" chip would still occupy the slot where readers
          have learned to find a verdict; absence is the honest rendering. */}
      {config && (
        <div className={`flex-shrink-0 h-6 px-2 flex items-center justify-center rounded-md ${config.badgeBg}`}>
          <span className={`text-xs font-semibold ${config.badgeText}`}>
            {config.label}
          </span>
        </div>
      )}
    </button>
  );
}