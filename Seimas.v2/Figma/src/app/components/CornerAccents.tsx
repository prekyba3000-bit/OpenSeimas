import React from 'react';

interface CornerAccentsProps {
  color?: string;
  size?: number; // Size of the L-brackets in pixels
  thickness?: number; // Thickness of the lines
  className?: string;
}

export function CornerAccents({ 
  color = 'rgba(59, 130, 246, 0.4)',
  size = 16,
  thickness = 2,
  className = ''
}: CornerAccentsProps) {
  const bracketStyle = {
    stroke: color,
    strokeWidth: thickness,
    fill: 'none',
  };
  
  return (
    <>
      {/* Top-left corner */}
      <svg 
        className={`absolute top-0 left-0 pointer-events-none ${className}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <path
          d={`M ${size} 0 L 0 0 L 0 ${size}`}
          style={bracketStyle}
        />
      </svg>
      
      {/* Top-right corner */}
      <svg 
        className={`absolute top-0 right-0 pointer-events-none ${className}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <path
          d={`M 0 0 L ${size} 0 L ${size} ${size}`}
          style={bracketStyle}
        />
      </svg>
      
      {/* Bottom-left corner */}
      <svg 
        className={`absolute bottom-0 left-0 pointer-events-none ${className}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <path
          d={`M ${size} ${size} L 0 ${size} L 0 0`}
          style={bracketStyle}
        />
      </svg>
      
      {/* Bottom-right corner */}
      <svg 
        className={`absolute bottom-0 right-0 pointer-events-none ${className}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <path
          d={`M 0 ${size} L ${size} ${size} L ${size} 0`}
          style={bracketStyle}
        />
      </svg>
    </>
  );
}
