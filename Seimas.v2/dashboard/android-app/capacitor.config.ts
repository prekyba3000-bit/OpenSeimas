import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The web build lives one level up in the dashboard package; this project points
 * at its output rather than duplicating it. Run the dashboard's `vite build`
 * (with VITE_API_URL=https://seimas-api.onrender.com) before `cap sync` —
 * build-apk.sh does exactly that.
 */
const config: CapacitorConfig = {
  appId: 'lt.openseimas.app',
  appName: 'Atviras Seimas',
  webDir: '../dist',
  // https so the WebView origin is https://localhost — the origin the backend
  // CORS allowlist now covers (Seimas.v2/backend/core.py). A capacitor:// scheme
  // would need its own allowlist entry; there is no iOS build, so we use https.
  server: {
    androidScheme: 'https',
  },
  android: {
    // No cleartext: the app only ever talks to https://seimas-api.onrender.com.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Themed to the dashboard's near-black background; the JS hides it once the
      // first paint is ready (see main.jsx).
      launchShowDuration: 0,
      backgroundColor: '#020817',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
