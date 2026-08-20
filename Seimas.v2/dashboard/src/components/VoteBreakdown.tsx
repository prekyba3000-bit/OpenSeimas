import React from 'react';

// The three vote choices, on the theme's own tokens. These pointed at
// --status-success / --status-danger / --status-warning, none of which is
// defined anywhere — so the bars rendered with no colour at all.
const VOTING_STATUS_COLORS = {
  'Už': 'hsl(var(--vote-for))',
  'Prieš': 'hsl(var(--vote-against))',
  'Susilaikė': 'hsl(var(--vote-abstain))',
};

interface VoteStats {
  for: number;
  against: number;
  abstain: number;
}

interface VoteSegmentProps {
  percentage: number;
  color: string;
  label: string;
}

function VoteSegment({ percentage, color, label }: VoteSegmentProps) {
  const showText = percentage > 10;
  
  return (
    <div
      className="h-full flex items-center justify-center transition-all duration-300 first:rounded-l-xl last:rounded-r-xl overflow-hidden"
      style={{
        width: `${percentage}%`,
        backgroundColor: color,
      }}
    >
      {showText && (
        <span
          className="font-semibold text-sm px-2"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

interface LegendItemProps {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

function LegendItem({ label, count, percentage, color }: LegendItemProps) {
  return (
    <div
      className="flex-1 min-w-[200px] flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{ backgroundColor: 'hsl(var(--muted))' }}
    >
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            {label}
          </span>
          <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {count} votes
          </span>
        </div>
      </div>
      <div className="font-bold text-lg flex-shrink-0" style={{ color: 'hsl(var(--foreground))' }}>
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}

interface VoteBreakdownProps {
  title?: string;
  stats: VoteStats;
  totalVotes?: number;
}

export function VoteBreakdown({ title, stats, totalVotes }: VoteBreakdownProps) {
  const total = totalVotes || stats.for + stats.against + stats.abstain;
  
  const forPercentage = (stats.for / total) * 100;
  const againstPercentage = (stats.against / total) * 100;
  const abstainPercentage = (stats.abstain / total) * 100;

  return (
    <div
      className="space-y-4 p-6 rounded-xl"
      style={{ backgroundColor: 'hsl(var(--card))' }}
    >
      {/* Title */}
      {title && (
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {title}
        </h3>
      )}
      
      {/* Multi-Segment Progress Bar */}
      <div
        className="h-12 rounded-xl overflow-hidden flex"
        style={{ backgroundColor: 'hsl(var(--muted))' }}
      >
        <VoteSegment
          percentage={forPercentage}
          color={VOTING_STATUS_COLORS['Už']}
          label="Už"
        />
        <VoteSegment
          percentage={againstPercentage}
          color={VOTING_STATUS_COLORS['Prieš']}
          label="Prieš"
        />
        <VoteSegment
          percentage={abstainPercentage}
          color={VOTING_STATUS_COLORS['Susilaikė']}
          label="Susilaikė"
        />
      </div>

      {/* Legend Section */}
      <div className="flex flex-wrap gap-3">
        <LegendItem
          label="Už"
          count={stats.for}
          percentage={forPercentage}
          color={VOTING_STATUS_COLORS['Už']}
        />
        <LegendItem
          label="Prieš"
          count={stats.against}
          percentage={againstPercentage}
          color={VOTING_STATUS_COLORS['Prieš']}
        />
        <LegendItem
          label="Susilaikė"
          count={stats.abstain}
          percentage={abstainPercentage}
          color={VOTING_STATUS_COLORS['Susilaikė']}
        />
      </div>
    </div>
  );
}