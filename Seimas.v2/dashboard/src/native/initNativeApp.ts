/**
 * Native app-shell setup. No-op on the web (the Vercel site): every call is
 * guarded by Capacitor.isNativePlatform(), and the plugins' web implementations
 * do nothing anyway. Called once from main.jsx.
 */
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export async function initNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Match the dashboard's dark chrome: light icons on the near-black
    // (--background #020817) header. The app is dark-only (index.html forces it).
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#020817' });
  } catch {
    // Status bar theming is cosmetic; never let it block startup.
  }

  try {
    // The React tree has mounted by the time this runs, so the splash can go.
    await SplashScreen.hide();
  } catch {
    // If hiding fails the launchShowDuration fallback still applies.
  }
}
