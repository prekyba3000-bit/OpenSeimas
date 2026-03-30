import React from 'react';
import { Menu, Command } from 'lucide-react';

interface MenuTriggerProps {
  onClick?: () => void;
  variant?: 'hamburger' | 'command';
}

export function MenuTrigger({ onClick, variant = 'hamburger' }: MenuTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="fixed top-6 left-6 z-40 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141517] border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200 group"
      style={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
    >
      {variant === 'hamburger' ? (
        <Menu className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
      ) : (
        <Command className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
      )}
      <span className="text-sm text-gray-400 group-hover:text-white transition-colors font-medium" style={{ letterSpacing: '-0.01em' }}>
        Menu
      </span>
      <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] text-gray-600 bg-black/40 rounded border border-white/10 font-mono">
        ⌘K
      </kbd>
    </button>
  );
}
