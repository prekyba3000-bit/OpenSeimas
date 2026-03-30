import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

type NavItemState = 'default' | 'hover' | 'active';

interface NavItemProps {
  label?: string;
  icon?: LucideIcon;
  state?: NavItemState;
  isActive?: boolean;
  onClick?: () => void;
}

export function NavItem({
  label = 'Dashboard',
  icon: Icon,
  state,
  isActive = false,
  onClick,
}: NavItemProps) {
  const [internalState, setInternalState] = useState<NavItemState>('default');
  
  // Use controlled state if provided, otherwise use internal hover state
  const currentState = state || (isActive ? 'active' : internalState);

  const getStyles = () => {
    switch (currentState) {
      case 'active':
        return {
          container: 'bg-transparent border-l-2 border-l-blue-500 pl-[14px]',
          text: 'text-blue-400',
          icon: 'text-blue-400',
          shadow: '',
        };
      case 'hover':
        return {
          container: 'bg-transparent border-l-2 border-l-[rgba(255,255,255,0.08)] pl-[14px]',
          text: 'text-white',
          icon: 'text-white',
          shadow: '',
        };
      default:
        return {
          container: 'bg-transparent border-l-2 border-l-transparent pl-[14px]',
          text: 'text-gray-400',
          icon: 'text-gray-400',
          shadow: '',
        };
    }
  };

  const styles = getStyles();

  return (
    <button
      className={`
        flex items-center gap-3 py-3 rounded-r-xl
        transition-all duration-200 cursor-pointer
        ${styles.container}
        ${styles.shadow}
      `}
      onMouseEnter={() => !state && setInternalState('hover')}
      onMouseLeave={() => !state && setInternalState('default')}
      onClick={onClick}
    >
      {Icon && <Icon className={`w-5 h-5 ${styles.icon} transition-colors duration-200`} />}
      <span className={`font-medium ${styles.text} transition-colors duration-200`}>
        {label}
      </span>
    </button>
  );
}