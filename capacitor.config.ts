import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor config for the "Greek Stack" companion iOS app.
//
// Greek Stack is a Next.js SSR + Prisma SaaS, so (unlike DailyTool/BCG which
// bundle a static Vite build) the companion loads the responsive mobile client
// at /app from the hosted deployment, wrapped in a native shell.
//
// ⚠️ Apple Guideline 4.2/4.7: a *pure* webview wrapper risks rejection. This
// app qualifies by adding genuine native value (wired in app/app/NativeBridge.tsx,
// all inert on web / active only when Capacitor.isNativePlatform()):
//   • Push notifications (events + announcements)  • Native sign-in / biometric unlock
//   • Deep links (universal links into a chapter)  • Offline cache of the last view
// LONG-TERM (preferred): replace `server.url` with a bundled static export of the
// /app mobile SPA (set webDir to that export) so the primary UI ships in the binary.
const config: CapacitorConfig = {
  appId: 'com.greekstack.app',
  appName: 'Greek Stack',
  webDir: 'mobile-shell', // minimal bundled shell (splash + boot) — see GS-MOBILE-APP.md
  server: {
    // The member-facing mobile client (sign in → your chapter, same data as web).
    url: 'https://greekstack.vercel.app/app',
    cleartext: false,
    // Keep in-webview navigation on Greek Stack origins (OAuth/Stripe return
    // pages, per-chapter subdomains). Anything else opens in the system browser.
    allowNavigation: [
      'greekstack.vercel.app',
      '*.greekstack.vercel.app',
      'greekstack.com',
      '*.greekstack.com',
      'greeklifesystems.vercel.app',
    ],
  },
  ios: {
    contentInset: 'never', // app manages safe-areas in CSS via env(safe-area-inset-*)
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: '#0b1220',
    // Identifies our requests server-side so /app can detect the native shell
    // even before the JS bridge boots (defense-in-depth alongside Capacitor.isNativePlatform()).
    appendUserAgent: 'GreekStackiOS',
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0b1220',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK', // light text on the dark navy chrome
      backgroundColor: '#0b1220',
    },
  },
};

export default config;
