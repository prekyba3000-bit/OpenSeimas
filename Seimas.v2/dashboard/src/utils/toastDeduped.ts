import { toast } from "sonner";

const DEFAULT_WINDOW_MS = 500;

const lastByKey = new Map<string, number>();

/**
 * Shows an error toast but skips duplicates for the same key within windowMs
 * (e.g. React 18 Strict Mode double-mounting effects in dev).
 */
export function toastErrorDeduped(key: string, message: string, windowMs = DEFAULT_WINDOW_MS): void {
  const now = Date.now();
  const prev = lastByKey.get(key);
  if (prev !== undefined && now - prev < windowMs) {
    return;
  }
  lastByKey.set(key, now);
  toast.error(message);
}
