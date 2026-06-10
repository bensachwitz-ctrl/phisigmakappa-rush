import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor config for the "Greek Stack" companion iOS app.
//
// Greek Stack is a Next.js SSR + Prisma SaaS, so (unlike DailyTool/BCG which
// bundle a static Vite build) the companion loads the responsive mobile client
// at /app from the hosted deployment, wrapped in a native shell.
//
// ⚠️ Apple Guideline 4.2/4.7: a *pure* webview wrapper risks rejection. This
// app qualifies by adding genuine native value:
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
  },
  ios: {
    contentInset: 'never', // app manages safe-areas in CSS via env(safe-area-inset-*)
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#0b1220' },
  },
};

export default config;
