import React from 'react';
import { AlignmentScore } from './AlignmentScore';
import { VoteDiffRow } from './VoteDiffRow';

interface VoteDifference {
  title: string;
  choiceA: 'For' | 'Against' | 'Abstain';
  choiceB: 'For' | 'Against' | 'Abstain';
  date?: string;
}

interface AlignmentResultCardProps {
  score: number;
  isLoading?: boolean;
  showDivergences?: boolean;
  divergences?: VoteDifference[];
  mp1Name?: string;
  mp2Name?: string;
}

export function AlignmentResultCard({
  score,
  isLoading = false,
  showDivergences = true,
  divergences = [],
  mp1Name = 'MP 1',
  mp2Name = 'MP 2',
}: AlignmentResultCardProps) {
  // Default divergences for demo
  const defaultDivergences: VoteDifference[] = [
    {
      title: 'Healthcare Reform Bill 2026-A',
      choiceA: 'For',
      choiceB: 'Against',
      date: 'Jan 15, 2026',
    },
    {
      title: 'Education Budget Amendment',
      choiceA: 'Against',
      choiceB: 'For',
      date: 'Jan 8, 2026',
    },
    {
      title: 'Environmental Protection Act',
      choiceA: 'For',
      choiceB: 'Abstain',
      date: 'Dec 20, 2025',
    },
    {
      title: 'Tax Reform Proposal',
      choiceA: 'Abstain',
      choiceB: 'For',
      date: 'Dec 12, 2025',
    },
  ];

  const displayDivergences = divergences.length > 0 ? divergences : defaultDivergences;
  const divergenceCount = displayDivergences.length;
  const totalVotes = Math.round((divergenceCount / (100 - score)) * 100);

  return (
    <div className="rounded-xl overflow-hidden bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-white/5">
      {/* Gradient Header */}
      <div
        className="h-1 w-full"
        style={{
          background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)',
        }}
      />

      {/* Card Content */}
      <div className="p-8">
        {/* Alignment Score Section */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">Voting Alignment</h3>
          <p className="text-sm text-gray-400 mb-6">
            {mp1Name} <span className="text-blue-400">vs</span> {mp2Name}
          </p>
          
          <div className="flex justify-center mb-6">
            <AlignmentScore score={score} isLoading={isLoading} size={200} />
          </div>

          {!isLoading && (
            <div className="flex items-center justify-center gap-8 text-sm">
              <div>
                <div className="text-2xl font-bold text-white">{totalVotes}</div>
                <div className="text-gray-500">Total Votes</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-green-400">{Math.round(totalVotes * (score / 100))}</div>
                <div className="text-gray-500">Agreed</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div>
                <div className="text-2xl font-bold text-red-400">{divergenceCount}</div>
                <div className="text-gray-500">Diverged</div>
              </div>
            </div>
          )}
        </div>

        {/* Divergence List */}
        {showDivergences && !isLoading && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Key Divergences</h4>
              <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                {divergenceCount} votes
              </span>
            </div>

            <div className="bg-black/20 rounded-lg overflow-hidden border border-white/5">
              {displayDivergences.map((diff, index) => (
                <VoteDiffRow
                  key={index}
                  title={diff.title}
                  choiceA={diff.choiceA}
                  choiceB={diff.choiceB}
                  date={diff.date}
                />
              ))}
            </div>
          </div>
        )}

        {/* Loading State Message */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '200ms' }} />
                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <p className="text-gray-400 font-medium">Analyzing voting patterns...</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500/30 animate-pulse" />
                  <span>Comparing votes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500/30 animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span>Calculating alignment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-500/30 animate-pulse" style={{ animationDelay: '600ms' }} />
                  <span>Finding divergences</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}