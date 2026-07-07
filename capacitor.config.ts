import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor config for the "Greek Stack" companion iOS app.
//
// BUILT-OUT (no longer a remote shell): the member UI now SHIPS INSIDE the
// binary. `webDir` ('mobile-shell') is a real bundled client — School→Chapter
// picker → themed login → per-chapter dashboard — that talks to each chapter's
// backend over the EXISTING tenant-bound mobile APIs (/api/mobile/auth +
// /api/mobile/data?subdomain=…) at an absolute API base. NOTE: for the BUNDLED
// shell that base is a HARDCODED constant in mobile-shell/index.html
// (default https://greekstack.vercel.app), overridable only by swapping
// `window.__GS_API_BASE__` or the `<meta name="gs-api-base">` tag in that HTML.
// `NEXT_PUBLIC_GS_API_BASE` does NOT affect the bundled binary — it is read only
// by lib/mobile-api-base.ts, which powers the separate Next.js /app web route.
// Because the primary UI is bundled (not a webview pointed at the website), this
// clears the Apple Guideline 4.2/4.7 "pure webview wrapper" rejection risk the
// old server.url carried.
//
// Genuine native value wired into the bundled shell (mobile-shell/index.html),
// all inert on web / active only when native:
//   • Session persistence  • Offline cache of the last view
//   • Deep links (universal links into a chapter)  • Haptics
// (Biometric unlock is NOT in the bundled shell — it lives in the separate
//  app/app/NativeBridge.tsx /app web route, whose plugin isn't even bundled.
//  Do not advertise biometric as shipped native value for this binary.)
// NOTE: the bundled shell does NOT use push notifications, so the push
// background mode + aps-environment entitlement are intentionally omitted from
// the native project (Apple 2.3.1 — declare only capabilities actually used).
//
// NOTE: `server.url` is intentionally REMOVED. With no server.url, Capacitor
// serves the bundled webDir from capacitor://localhost — that's what makes this
// an installed app instead of a hosted-site wrapper. `npx cap sync` copies
// mobile-shell/ into ios/App/App/public.
const config: CapacitorConfig = {
  appId: 'com.greekstack.app',
  appName: 'Greek Stack',
  webDir: 'mobile-shell', // bundled native client (ships in the binary) — see mobile-shell/index.html
  ios: {
    contentInset: 'never', // app manages safe-areas in CSS via env(safe-area-inset-*)
    // App-bound-domains restriction is intentionally DISABLED. The app must open
    // external Stripe Checkout (checkout.stripe.com) for dues/donations in the
    // system browser / web view, and that host is NOT one of our own
    // WKAppBoundDomains (the repo declares no WKAppBoundDomains array and does not
    // ship @capacitor/browser). With the limit ON, navigation to Stripe Checkout
    // would be blocked. Transport security is UNCHANGED: ATS stays fully on
    // (NSAllowsArbitraryLoads=false in Info.plist), so all traffic is still
    // HTTPS-pinned — only the app-bound-domains *navigation* gate is relaxed.
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#0b1220',
    // Identifies our requests server-side so the mobile APIs can recognise the
    // native shell (defense-in-depth alongside Capacitor.isNativePlatform()).
    appendUserAgent: 'GreekStackiOS',
  },
  plugins: {
    // PushNotifications intentionally NOT configured — the bundled shell does not
    // use push (see the note above + Info.plist / App.entitlements). Re-add the
    // config block together with the entitlement if a future build wires push.
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
