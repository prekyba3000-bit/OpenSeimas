import React from 'react';
import { ThumbsUp, ThumbsDown, MinusCircle } from 'lucide-react';

interface VoteDiffRowProps {
  title: string;
  choiceA: 'For' | 'Against' | 'Abstain';
  choiceB: 'For' | 'Against' | 'Abstain';
  date?: string;
}

export function VoteDiffRow({ title, choiceA, choiceB, date }: VoteDiffRowProps) {
  const getVoteColor = (choice: string) => {
    switch (choice) {
      case 'For':
        return 'text-green-400 bg-green-500/10';
      case 'Against':
        return 'text-red-400 bg-red-500/10';
      case 'Abstain':
        return 'text-yellow-400 bg-yellow-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getVoteIcon = (choice: string) => {
    switch (choice) {
      case 'For':
        return <ThumbsUp className="w-3 h-3" />;
      case 'Against':
        return <ThumbsDown className="w-3 h-3" />;
      case 'Abstain':
        return <MinusCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-4 py-4 px-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
      {/* Vote Title */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white truncate">{title}</h4>
        {date && <p className="text-xs text-gray-500 mt-0.5">{date}</p>}
      </div>

      {/* Vote Choices */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Choice A */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${getVoteColor(choiceA)}`}>
          {getVoteIcon(choiceA)}
          <span className="text-xs font-semibold">{choiceA}</span>
        </div>

        {/* Divider */}
        <div className="text-gray-600">vs</div>

        {/* Choice B */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${getVoteColor(choiceB)}`}>
          {getVoteIcon(choiceB)}
          <span className="text-xs font-semibold">{choiceB}</span>
        </div>
      </div>
    </div>
  );
}
