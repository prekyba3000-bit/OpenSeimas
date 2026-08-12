/**
 * Device connectivity — distinguishes "no connection" from "server unreachable".
 *
 * On a real device the two are different situations with different remedies: if
 * the phone is offline the citizen can fix it; if the phone is online but our
 * API did not answer, the fault is ours (Render cold start, an outage) and the
 * message should say so rather than blame their connection.
 *
 * Native (Capacitor) uses @capacitor/network. On the web — the Vercel site and
 * the dev server — it falls back to navigator.onLine, which the Capacitor web
 * implementation wraps anyway.
 */
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export async function isDeviceOnline(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      // If the plugin call fails, assume online and let the API attempt decide.
      return true;
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/**
 * Subscribe to connectivity changes. Returns an unsubscribe function.
 * Uses the native listener where available, window events on the web.
 */
export function onNetworkChange(handler: (online: boolean) => void): () => void {
  if (Capacitor.isNativePlatform()) {
    const handle = Network.addListener('networkStatusChange', (status) =>
      handler(status.connected),
    );
    return () => {
      void handle.then((h) => h.remove());
    };
  }
  if (typeof window === 'undefined') return () => {};
  const online = () => handler(true);
  const offline = () => handler(false);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  return () => {
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}
