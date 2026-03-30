import React from 'react';
import { cn } from './ui/utils';

interface AlignmentScoreProps {
  score: number; // 0-100
  isLoading?: boolean;
  size?: number;
  className?: string;
}

export function AlignmentScore({ score, isLoading = false, size = 200, className }: AlignmentScoreProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  // Color based on alignment score
  const getScoreColor = () => {
    if (score >= 80) return '#22c55e'; // Green-500
    if (score >= 60) return '#3b82f6'; // Blue-500
    if (score >= 40) return '#f59e0b'; // Amber-500
    return '#ef4444'; // Red-500
  };

  const scoreColor = getScoreColor();

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
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
          className="stroke-muted"
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
            className="stroke-primary animate-spin"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference * 0.25}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ 
              animationDuration: '2s',
            }}
          />
        )}
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              <div 
                className="w-2 h-2 rounded-full bg-primary animate-bounce" 
                style={{ animationDelay: '0ms', animationDuration: '1s' }}
              />
              <div 
                className="w-2 h-2 rounded-full bg-primary animate-bounce" 
                style={{ animationDelay: '150ms', animationDuration: '1s' }}
              />
              <div 
                className="w-2 h-2 rounded-full bg-primary animate-bounce" 
                style={{ animationDelay: '300ms', animationDuration: '1s' }}
              />
            </div>
            <div className="text-muted-foreground text-sm font-medium animate-pulse">Skaičiuojama</div>
          </div>
        ) : (
          <>
            <div
              className="font-bold text-foreground"
              style={{ fontSize: size * 0.24, lineHeight: 1 }}
            >
              {score}%
            </div>
            <div
              className="text-muted-foreground font-semibold tracking-wider mt-2 uppercase"
              style={{ fontSize: size * 0.06 }}
            >
              Sutapimas
            </div>
          </>
        )}
      </div>
    </div>
  );
}
