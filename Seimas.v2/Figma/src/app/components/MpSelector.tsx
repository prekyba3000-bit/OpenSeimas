import React from 'react';
import { Users, Check, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';

interface MpData {
  name: string;
  party: string;
  avatarUrl?: string;
}

type MpSelectorVariant = 'empty' | 'active' | 'locked';

interface MpSelectorProps {
  mp?: MpData;
  variant?: MpSelectorVariant;
  placeholder?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function MpSelector({
  mp,
  variant,
  placeholder = 'Pasirinkite narį...',
  onClick,
  disabled = false,
}: MpSelectorProps) {
  // Determine variant based on state
  const currentVariant = variant || (mp ? 'active' : 'empty');
  const isActive = currentVariant === 'active' && mp;
  const isLocked = currentVariant === 'locked' || disabled;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <button
      className={cn(
        "w-full h-[72px] rounded-xl transition-all duration-200 flex items-center gap-4 px-6 border",
        isLocked 
          ? "opacity-50 cursor-not-allowed bg-muted border-transparent" 
          : "cursor-pointer",
        !isLocked && isActive 
          ? "bg-primary/5 border-primary ring-1 ring-primary/20" 
          : "bg-card border-border hover:border-primary/50 hover:bg-accent/50",
        !isLocked && !isActive && "text-muted-foreground hover:text-foreground"
      )}
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
    >
      {isActive ? (
        <>
          {/* Avatar */}
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={mp.avatarUrl} alt={mp.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
              {getInitials(mp.name)}
            </AvatarFallback>
          </Avatar>

          {/* MP Info */}
          <div className="flex-1 text-left min-w-0">
            <div className="font-semibold text-foreground truncate">{mp.name}</div>
            <div className="text-sm text-muted-foreground truncate">{mp.party}</div>
          </div>

          {/* Check Icon or Lock Icon */}
          {isLocked ? (
            <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          ) : (
            <Check className="w-5 h-5 text-primary flex-shrink-0" />
          )}
        </>
      ) : (
        <>
          {/* Empty State Icon */}
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            isLocked ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground"
          )}>
            {isLocked ? (
              <Lock className="w-5 h-5" />
            ) : (
              <Users className="w-5 h-5" />
            )}
          </div>

          {/* Placeholder Text */}
          <div className="flex-1 text-left">
            <div className={cn("text-sm", isLocked ? "text-muted-foreground" : "text-muted-foreground/70")}>
              {placeholder}
            </div>
          </div>
        </>
      )}
    </button>
  );
}
