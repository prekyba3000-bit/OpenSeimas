import React from 'react';
import { Sun, X, CircleDot, LucideIcon } from 'lucide-react';

type VoteResultVariant = 'Accepted' | 'Rejected' | 'Other';

interface VoteStatusIconProps {
  variant: VoteResultVariant;
  size?: number;
}

export function VoteStatusIcon({ variant, size = 24 }: VoteStatusIconProps) {
  // Symbolic mapping:
  // Accepted -> The Sun (Saulė) -> Gold/White
  // Rejected -> The Thunder Cross -> Crimson
  // Other -> The Eye/Circle -> Iron/Neutral

  const getIconConfig = (): { Icon: LucideIcon; color: string; bgColor: string; borderColor: string } => {
    switch (variant) {
      case 'Accepted':
        return {
          Icon: Sun,
          color: 'text-royal-gold',
          bgColor: 'bg-royal-gold/10',
          borderColor: 'border-royal-gold/30',
        };
      case 'Rejected':
        return {
          Icon: X, // Represents the Thunder Cross (X shape)
          color: 'text-crimson',
          bgColor: 'bg-crimson/10',
          borderColor: 'border-crimson/30',
        };
      case 'Other':
        return {
          Icon: CircleDot,
          color: 'text-zinc-400',
          bgColor: 'bg-zinc-800',
          borderColor: 'border-zinc-700',
        };
    }
  };

  const { Icon, color, bgColor, borderColor } = getIconConfig();

  return (
    <div className={`flex items-center justify-center w-10 h-10 border ${bgColor} ${borderColor} shadow-inner`}>
      <Icon className={`${color}`} size={size} strokeWidth={variant === 'Rejected' ? 3 : 2} />
    </div>
  );
}
