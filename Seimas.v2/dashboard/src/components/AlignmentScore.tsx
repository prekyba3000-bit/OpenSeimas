import React from 'react';

interface AlignmentScoreProps {
  score: number; // 0-100
  isLoading?: boolean;
  size?: number;
}

export function AlignmentScore({ score, isLoading = false, size = 200 }: AlignmentScoreProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  // Color based on alignment score using CSS variables
  const getScoreColor = () => {
    if (score >= 80) return 'var(--status-success)';      // Green
    if (score >= 60) return 'var(--party-tevynes-sajunga)'; // Blue
    if (score >= 40) return 'var(--party-darbo-partija)';  // Amber
    return 'var(--status-danger)';                         // Red
  };

  const scoreColor = getScoreColor();

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background Ring */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress Arc */}
        {!isLoading && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.75}
            strokeLinecap="round"
            className="animate-spin"
            style={{ animationDuration: '1.5s' }}
          />
        )}

        {/* Gradient for loading state */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Loading...
          </div>
        ) : (
          <>
            <div
              className="font-bold"
              style={{
                fontSize: size * 0.24,
                lineHeight: 1,
                color: 'var(--text-primary)',
              }}
            >
              {score}%
            </div>
            <div
              className="font-semibold tracking-[0.2em] mt-2"
              style={{
                fontSize: size * 0.06,
                color: 'var(--text-secondary)',
              }}
            >
              AGREEMENT
            </div>
          </>
        )}
      </div>
    </div>
  );
}
