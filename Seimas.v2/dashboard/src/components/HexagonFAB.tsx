import React from 'react';
import { Command } from 'lucide-react';

interface HexagonFABProps {
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
}

export function HexagonFAB({ onClick, icon: Icon = Command, label = 'Command' }: HexagonFABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 group"
      aria-label={label}
    >
      {/* Glow effect layer */}
      <div 
        className="absolute inset-0 animate-pulse"
        style={{
          filter: 'blur(12px)',
          opacity: 0.6,
        }}
      >
        <svg viewBox="0 0 100 115" className="w-16 h-16">
          <polygon
            points="50 0, 93.3 28.75, 93.3 86.25, 50 115, 6.7 86.25, 6.7 28.75"
            fill="#3B82F6"
          />
        </svg>
      </div>
      
      {/* Main hexagon */}
      <div className="relative">
        <svg viewBox="0 0 100 115" className="w-16 h-16">
          {/* Outer hexagon - border */}
          <polygon
            points="50 0, 93.3 28.75, 93.3 86.25, 50 115, 6.7 86.25, 6.7 28.75"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            className="group-hover:stroke-blue-400 transition-colors"
          />
          
          {/* Inner hexagon - fill */}
          <polygon
            points="50 5, 88.3 31.25, 88.3 83.75, 50 110, 11.7 83.75, 11.7 31.25"
            fill="#0a0a0c"
            className="group-hover:fill-[#0f0f12] transition-colors"
          />
          
          {/* Center highlight */}
          <polygon
            points="50 15, 78.3 36.25, 78.3 78.75, 50 100, 21.7 78.75, 21.7 36.25"
            fill="url(#hexGradient)"
            opacity="0.3"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="hexGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-7 h-7 text-blue-400 group-hover:text-blue-300 transition-colors group-hover:scale-110 transform" />
        </div>
      </div>
      
      {/* Ripple effect on click */}
      <div className="absolute inset-0 rounded-full group-active:animate-ping pointer-events-none">
        <svg viewBox="0 0 100 115" className="w-16 h-16 opacity-0 group-active:opacity-20">
          <polygon
            points="50 0, 93.3 28.75, 93.3 86.25, 50 115, 6.7 86.25, 6.7 28.75"
            fill="#3B82F6"
          />
        </svg>
      </div>
    </button>
  );
}
