import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from './ui/utils';
import {
  type ThemeChoice,
  resolveTheme,
  setThemeChoice,
  storedChoice,
  watchSystemTheme,
} from '../lib/theme';

const OPTIONS: Array<{ value: ThemeChoice; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Šviesi', Icon: Sun },
  { value: 'dark', label: 'Tamsi', Icon: Moon },
  { value: 'system', label: 'Kaip sistemoje', Icon: Monitor },
];

/**
 * Three-state theme control. "System" is a real option rather than an implicit
 * default: a reader whose OS switches at dusk should not have to switch twice.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [choice, setChoice] = React.useState<ThemeChoice>('system');

  React.useEffect(() => {
    setChoice(storedChoice());
    return watchSystemTheme(() => setChoice(storedChoice()));
  }, []);

  return (
    <div
      className={cn('inline-flex items-center rounded-md border border-border p-0.5', className)}
      role="group"
      aria-label="Spalvų režimas"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              setThemeChoice(value);
              setChoice(value);
            }}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded transition-colors',
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

export { resolveTheme };
