import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface UniversalButtonProps {
  variant?: ButtonVariant;
  children?: React.ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}

export function UniversalButton({
  variant = 'primary',
  children = 'Button',
  icon: Icon,
  onClick,
  disabled = false,
}: UniversalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: 'bg-blue-600',
          text: 'text-white',
          shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
          hoverBg: 'hover:bg-blue-700',
        };
      case 'secondary':
        return {
          bg: 'bg-white/10 border border-white/10',
          text: 'text-white',
          shadow: '',
          hoverBg: 'hover:bg-white/15',
        };
      case 'ghost':
        return {
          bg: 'bg-transparent',
          text: 'text-gray-300',
          shadow: '',
          hoverBg: 'hover:bg-white/5',
        };
      case 'danger':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-500',
          shadow: '',
          hoverBg: 'hover:bg-red-500/30',
        };
      default:
        return {
          bg: 'bg-blue-600',
          text: 'text-white',
          shadow: '',
          hoverBg: 'hover:bg-blue-700',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <button
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-xl
        font-medium transition-all duration-200
        ${styles.bg} ${styles.text} ${styles.shadow} ${styles.hoverBg}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        transform: isHovered && !disabled ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
