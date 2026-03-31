// ORPHANED(v4): not imported by any production route. Safe to delete in hygiene pass.
import React from 'react';

interface EffectCardProps {
  title: string;
  description: string;
  effectType: 'glow-blue' | 'blur-background';
}

export function EffectCard({ title, description, effectType }: EffectCardProps) {
  const effectStyles = {
    'glow-blue': {
      shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/10',
    },
    'blur-background': {
      backdrop: 'backdrop-blur-[40px]',
      bg: 'bg-white/10',
      border: 'border-white/20',
    },
  };

  const styles = effectStyles[effectType];

  return (
    <div
      className={`
        p-6 rounded-xl border
        ${styles.bg || ''}
        ${styles.border || 'border-gray-700'}
        ${styles.shadow || ''}
        ${styles.backdrop || ''}
      `}
    >
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
      <div className="mt-4 flex gap-2">
        <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 font-mono">
          {effectType === 'glow-blue' ? 'Blur: 15px' : 'Blur: 40px'}
        </span>
        <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 font-mono">
          {effectType === 'glow-blue' ? 'Color: #3B82F6' : 'Layer Blur'}
        </span>
      </div>
    </div>
  );
}
