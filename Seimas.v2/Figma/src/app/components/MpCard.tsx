import React, { useState } from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';

// Party colors from Political Parties token collection
const PARTY_COLORS: Record<string, string> = {
  'Tėvynės sąjunga': '#3b82f6', // Blue 500
  'LSDP': '#ef4444', // Red 500
  'Liberalų sąjūdis': '#f59e0b', // Amber 500
  'Demokratų sąjunga': '#10b981', // Emerald 500
  'Laisvės partija': '#8b5cf6', // Violet 500
  'Lietuvos valstiečių ir žaliųjų sąjunga': '#22c55e', // Green 500
  'Darbo partija': '#06b6d4', // Cyan 500
  'Nemuno aušra': '#ec4899', // Pink 500
};

interface MpCardProps {
  name?: string;
  party?: string;
  avatarUrl?: string;
  onClick?: () => void;
}

export function MpCard({
  name = 'Andrius Kubilius',
  party = 'Tėvynės sąjunga',
  avatarUrl,
  onClick,
}: MpCardProps) {
  const partyColor = PARTY_COLORS[party] || '#6b7280'; // Default to gray-500
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20"
      onClick={onClick}
    >
      {/* Avatar with Party Indicator */}
      <div className="relative">
        <Avatar className="w-14 h-14 border border-border">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Party Color Indicator */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card"
          style={{ backgroundColor: partyColor }}
        />
      </div>

      {/* Text Container */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {name}
        </h3>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{party}</span>
        </div>
      </div>

      {/* ChevronRight Icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}
