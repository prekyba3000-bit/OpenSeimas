import React, { useState } from 'react';
import { AlignmentScore } from './AlignmentScore';
import { MpSelector } from './MpSelector';

interface MpData {
  name: string;
  party: string;
  avatarUrl?: string;
}

interface ComparisonViewProps {
  mp1?: MpData;
  mp2?: MpData;
  alignmentScore?: number;
  isLoading?: boolean;
  onSelectMp1?: () => void;
  onSelectMp2?: () => void;
}

export function ComparisonView({
  mp1,
  mp2,
  alignmentScore = 0,
  isLoading = false,
  onSelectMp1,
  onSelectMp2,
}: ComparisonViewProps) {
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Main Comparison Grid */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center">
        {/* Left MP Selector */}
        <div className="flex justify-end">
          <div className="w-full max-w-md">
            <MpSelector mp={mp1} onClick={onSelectMp1} placeholder="Select first MP..." />
          </div>
        </div>

        {/* VS Badge (Center) */}
        <div className="relative flex items-center justify-center">
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center z-10"
            style={{
              backgroundColor: 'var(--primary-500)',
              boxShadow: `0 10px 20px rgba(59, 130, 246, 0.5), 0 0 0 4px var(--background-base)`,
            }}
          >
            <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
              VS
            </span>
          </div>
        </div>

        {/* Right MP Selector */}
        <div className="flex justify-start">
          <div className="w-full max-w-md">
            <MpSelector mp={mp2} onClick={onSelectMp2} placeholder="Select second MP..." />
          </div>
        </div>
      </div>

      {/* Alignment Score (Below) */}
      {(mp1 && mp2) && (
        <div className="mt-12 flex justify-center">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
              Voting Alignment
            </h3>
            <AlignmentScore score={alignmentScore} isLoading={isLoading} size={200} />
            {!isLoading && (
              <p className="mt-6 text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
                These members voted the same way on {alignmentScore}% of bills
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
