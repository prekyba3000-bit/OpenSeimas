import React from 'react';
import { Minus, Scale, Zap } from 'lucide-react';

type AxisTone = 'good' | 'neutral' | 'evil';

const axisToneClass: Record<AxisTone, string> = {
  good: 'bg-green-800 text-green-200',
  neutral: 'bg-gray-700 text-gray-200',
  evil: 'bg-red-900 text-red-200',
};

const lawIconClass = 'w-4 h-4';

function getMethodAxis(alignment: string): 'lawful' | 'neutral' | 'chaotic' {
  const value = alignment.toLowerCase();
  if (value.includes('lawful')) return 'lawful';
  if (value.includes('chaotic')) return 'chaotic';
  return 'neutral';
}

function getTone(alignment: string): AxisTone {
  const value = alignment.toLowerCase();
  if (value.includes('good')) return 'good';
  if (value.includes('evil')) return 'evil';
  return 'neutral';
}

export function AlignmentBadge({ alignment }: { alignment: string }) {
  const tone = getTone(alignment);
  const methodAxis = getMethodAxis(alignment);

  const icon =
    methodAxis === 'lawful' ? (
      <Scale className={lawIconClass} />
    ) : methodAxis === 'chaotic' ? (
      <Zap className={lawIconClass} />
    ) : (
      <Minus className={lawIconClass} />
    );

  return (
    <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold ${axisToneClass[tone]}`}>
      {icon}
      <span>{alignment}</span>
    </div>
  );
}

export default AlignmentBadge;
