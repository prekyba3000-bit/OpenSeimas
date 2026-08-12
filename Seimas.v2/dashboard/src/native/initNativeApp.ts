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
    // Don't draw the WebView under the status bar — otherwise the app header
    // (hamburger, page title) sits behind it. A solid dark bar above the content
    // instead, matching the dashboard's near-black chrome (--background #020817)
    // with light icons. The app is dark-only (index.html forces it).
    await StatusBar.setOverlaysWebView({ overlay: false });
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
