import React, { useState } from 'react';
import { Link } from 'react-router';
import { Building2, ChevronRight, TrendingUp, Vote } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { getPartyColor, getPartyShort } from '../utils/partyColors';
import { formatAttendance } from '../utils/attendance';
import { factionLabel } from '../utils/faction';

interface MpCardProps {
  name?: string;
  party?: string;
  avatarUrl?: string;
  /** Where the card goes. Prefer this over `onClick` for navigation: a link
   *  can be opened in a new tab, copied, and read as a destination. */
  to?: string;
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
    attendance?: number | null;
  };
}

export function MpCard({ name, party, avatarUrl, to, onClick, mp }: MpCardProps) {
  const displayName = name || mp?.display_name || mp?.name || 'Unknown';
  const displayParty = factionLabel(party || mp?.current_party || mp?.party);
  const photoUrl = avatarUrl || mp?.photo_url;
  const voteCount = mp?.vote_count ?? 0;
  const attendance = mp?.attendance ?? null;

  const [isHovered, setIsHovered] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const partyColor = getPartyColor(displayParty);
  const partyShort = getPartyShort(displayParty);
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // A link when it navigates, a button when it merely does something, a plain
  // card when it does neither. It was a div with an onClick in every case,
  // which made the entire members grid — the primary way to browse the
  // Seimas — unreachable without a pointer: no tab stop, no Enter, no focus
  // ring, no accessible name. A button fixed that and still could not be
  // opened in a new tab, which is a normal thing to want from a list of 141
  // people.
  const interactive = !!(to || onClick);
  const Root: React.ElementType = to ? Link : onClick ? 'button' : 'div';

  return (
    <Root
      {...(to ? { to } : {})}
      {...(!to && onClick ? { type: 'button' as const } : {})}
      className={
        'w-full text-left flex items-center gap-4 p-4 rounded-xl transition-all duration-200 backdrop-blur-sm border' +
        (interactive
          ? ' cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          : '')
      }
      style={{
        backgroundColor: 'hsl(var(--card))',
        borderColor: isHovered ? partyColor + '40' : 'hsl(var(--border))',
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
              backgroundColor: 'hsl(var(--muted))',
            }}
          >
            <AvatarFallback
              className="text-sm"
              style={{ backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2"
          style={{ backgroundColor: partyColor, borderColor: 'hsl(var(--card))' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className="font-bold transition-colors duration-200 truncate text-sm"
          style={{ color: isHovered ? partyColor : 'hsl(var(--foreground))' }}
        >
          {displayName}
        </h3>
        <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <span
            className="px-1.5 py-0.5 rounded text-xs font-bold text-white"
            style={{ backgroundColor: partyColor }}
          >
            {partyShort}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <span className="flex items-center gap-1">
            <Vote className="w-3 h-3" />
            {voteCount}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {formatAttendance(attendance)}
          </span>
        </div>
      </div>

      <div
        className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
        style={{ backgroundColor: isHovered ? `${partyColor}15` : 'hsl(var(--muted))' }}
      >
        <ChevronRight
          className="w-4 h-4 transition-all duration-200"
          style={{ color: isHovered ? partyColor : 'hsl(var(--muted-foreground))' }}
        />
      </div>
    </Root>
  );
}
