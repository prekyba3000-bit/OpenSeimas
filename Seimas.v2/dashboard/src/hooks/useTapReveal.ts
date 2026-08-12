import { useCallback, useEffect, useState } from 'react';

/**
 * Two-step activation for controls whose detail is only revealed on hover.
 *
 * A pointer device shows the detail before the click, so activation can go
 * straight through. Touch has no hover state: one tap both reveals and commits,
 * which commits before the user has seen what they picked. On the seat map that
 * meant tapping a 7px dot and landing on an MP you had no way to identify.
 *
 * Here the first tap on an item reveals it and the second commits.
 */
export interface TapReveal {
  /** True when the primary input cannot hover — i.e. the reveal step is needed. */
  isTouch: boolean;
  revealedId: string | null;
  /**
   * Register a tap. Returns true when the caller should commit (navigate,
   * submit); false when this tap only revealed the item.
   */
  activate: (id: string) => boolean;
  dismiss: () => void;
}

/** Pointer devices match; touch screens and pen-only devices do not. */
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

export function useTapReveal(): TapReveal {
  const [isTouch, setIsTouch] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(HOVER_QUERY);
    const sync = () => setIsTouch(!query.matches);
    sync();
    // Not merely theoretical: a tablet gains a pointer when a mouse or keyboard
    // case is attached, and loses it again when detached.
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const activate = useCallback(
    (id: string): boolean => {
      if (!isTouch) return true;
      if (revealedId === id) {
        setRevealedId(null);
        return true;
      }
      setRevealedId(id);
      return false;
    },
    [isTouch, revealedId],
  );

  const dismiss = useCallback(() => setRevealedId(null), []);

  return { isTouch, revealedId, activate, dismiss };
}
