import React, { useState } from 'react';
import { Building2, ChevronRight, TrendingUp, Vote } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { getPartyColor, getPartyShort } from '../utils/partyColors';

interface MpCardProps {
  name?: string;
  party?: string;
  avatarUrl?: string;
  onClick?: () => void;
  mp?: {
    id: string;
    name?: string;
    display_name?: string;
    party?: string;
    current_party?: string;
    photo_url?: string;
    is_active?: boolean;
    vote_count?: number;
    attendance?: number;
  };
}

export function MpCard({ name, party, avatarUrl, onClick, mp }: MpCardProps) {
  const displayName = name || mp?.display_name || mp?.name || 'Unknown';
  const displayParty = party || mp?.current_party || mp?.party || 'Unknown';
  const photoUrl = avatarUrl || mp?.photo_url;
  const voteCount = mp?.vote_count ?? 0;
  const attendance = mp?.attendance ?? 0;

  const [isHovered, setIsHovered] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const partyColor = getPartyColor(displayParty);
  const partyShort = getPartyShort(displayParty);
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-sm border"
      style={{
        backgroundColor: 'var(--background-surface)',
        borderColor: isHovered ? partyColor + '40' : 'var(--glass-border)',
        boxShadow: isHovered ? `0 4px 12px ${partyColor}20` : '0 1px 3px rgba(0, 0, 0, 0.2)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative">
        {!photoFailed && photoUrl ? (
          <div
            className="w-14 h-14 rounded-full border-2 overflow-hidden transition-all duration-200 flex items-center justify-center"
            style={{
              borderColor: isHovered ? partyColor : 'transparent',
              boxShadow: isHovered ? `0 0 0 3px ${partyColor}40` : 'none',
            }}
          >
            <img
              src={photoUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={() => setPhotoFailed(true)}
            />
          </div>
        ) : (
          <Avatar
            className="w-14 h-14 transition-all duration-200"
            style={{
              boxShadow: isHovered ? `0 0 0 3px ${partyColor}40` : 'none',
              backgroundColor: 'var(--background-elevated)',
            }}
          >
            <AvatarFallback
              className="text-sm"
              style={{ backgroundColor: 'var(--background-elevated)', color: 'var(--text-primary)' }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2"
          style={{ backgroundColor: partyColor, borderColor: 'var(--background-surface)' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className="font-bold transition-colors duration-200 truncate text-sm"
          style={{ color: isHovered ? partyColor : 'var(--text-primary)' }}
        >
          {displayName}
        </h3>
        <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
            style={{ backgroundColor: partyColor }}
          >
            {partyShort}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1">
            <Vote className="w-3 h-3" />
            {voteCount}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {attendance > 0 ? `${attendance.toFixed(0)}%` : '—'}
          </span>
        </div>
      </div>

      <div
        className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
        style={{ backgroundColor: isHovered ? `${partyColor}15` : 'var(--glass-background)' }}
      >
        <ChevronRight
          className="w-4 h-4 transition-all duration-200"
          style={{ color: isHovered ? partyColor : 'var(--text-tertiary)' }}
        />
      </div>
    </div>
  );
}
