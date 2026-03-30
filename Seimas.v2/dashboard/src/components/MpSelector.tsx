import React from 'react';
import { Users, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface MpData {
  name: string;
  party: string;
  avatarUrl?: string;
}

type MpSelectorState = 'empty' | 'populated';

interface MpSelectorProps {
  mp?: MpData;
  state?: MpSelectorState;
  placeholder?: string;
  onClick?: () => void;
}

export function MpSelector({
  mp,
  state,
  placeholder = 'Select MP...',
  onClick,
}: MpSelectorProps) {
  const currentState = state || (mp ? 'populated' : 'empty');
  const isPopulated = currentState === 'populated' && mp;

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
      className="w-full h-[72px] rounded-xl transition-all duration-200 flex items-center gap-4 px-6 border-2"
      style={
        isPopulated
          ? {
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'var(--primary-500)',
            }
          : {
              backgroundColor: 'var(--background-elevated)',
              borderColor: 'var(--glass-border)',
            }
      }
      onClick={onClick}
    >
      {isPopulated ? (
        <>
          {/* Avatar */}
          <Avatar className="w-10 h-10">
            <AvatarImage src={mp.avatarUrl} alt={mp.name} />
            <AvatarFallback
              className="text-sm"
              style={{
                backgroundColor: 'var(--primary-500)',
                color: 'var(--text-primary)',
              }}
            >
              {getInitials(mp.name)}
            </AvatarFallback>
          </Avatar>

          {/* MP Info */}
          <div className="flex-1 text-left min-w-0">
            <div className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {mp.name}
            </div>
            <div className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
              {mp.party}
            </div>
          </div>

          {/* Check Icon */}
          <Check
            className="w-5 h-5 flex-shrink-0"
            style={{ color: 'var(--primary-500)' }}
          />
        </>
      ) : (
        <>
          {/* Empty State Icon */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ backgroundColor: 'var(--background-surface)' }}
          >
            <Users
              className="w-5 h-5"
              style={{ color: 'var(--text-secondary)' }}
            />
          </div>

          {/* Placeholder Text */}
          <div className="flex-1 text-left">
            <div style={{ color: 'var(--text-secondary)' }}>{placeholder}</div>
          </div>
        </>
      )}
    </button>
  );
}
