// lib/native-bridge.ts — the Greek Stack native (Capacitor) value layer.
//
// WHY THIS EXISTS (Apple Guideline 4.2 / 4.7):
// The iOS app ships the bundled Capacitor "mobile-shell" webDir. A *pure* webview
// wrapper risks App Store rejection, so this module adds the native value Apple
// wants:
//   1. Native sign-in + biometric unlock (session persists on-device, Face/Touch ID)
//   2. Deep links / universal links into a specific chapter
//   3. Offline cache of the last view (graceful when the network drops)
//   4. Native haptics + splash/status-bar chrome
//
// NOTE: push notifications are intentionally NOT wired — the shipped shell does
// not register for or consume push (no aps-environment entitlement, no
// remote-notification background mode, no @capacitor/push-notifications plugin).
// Re-add the push capability (Info.plist + App.entitlements + the plugin + an
// /api/mobile/push/register endpoint) together if a future build truly uses it.
//
// HARD DESIGN RULE — INERT ON WEB:
// The web app (greekstack.vercel.app) must be byte-for-byte unchanged by this
// code. We therefore NEVER statically `import "@capacitor/*"` (those packages
// are not installed in the web build and would break `next build`). Instead we
// reach the plugins through the runtime global the native shell injects on
// `window.Capacitor`. On web that global is absent, every function early-returns,
// and nothing here ever runs. This is the same "guard to native, access at
// runtime" pattern used by the DailyTool / Bar Crawl Golf companions.
//
// All exports are safe to call unconditionally from a React effect — they
// self-guard and never throw into the caller.

// ── Minimal runtime shapes (no @capacitor/* type imports on purpose) ─────────
type PluginListener = { remove: () => void | Promise<void> };

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, any>;
}

const STORAGE_KEYS = {
  session: 'gs.session', // { token, user, subdomain } JSON
  biometric: 'gs.biometric.enabled', // "1" when the member opted into Face/Touch ID
  lastView: 'gs.lastView', // offline snapshot of the last rendered chapter data
} as const;

// ── Platform detection ───────────────────────────────────────────────────────

/** The injected Capacitor runtime, or undefined on web / during SSR. */
function cap(): CapacitorGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/**
 * True ONLY inside the native iOS/Android shell. Every native feature below
 * gates on this; on the web it is always false so the whole module is inert.
 */
export function isNative(): boolean {
  const c = cap();
  try {
    return !!c && typeof c.isNativePlatform === 'function' && c.isNativePlatform();
  } catch {
    return false;
  }
}

/** Grab a named Capacitor plugin from the runtime, or null if unavailable. */
function plugin<T = any>(name: string): T | null {
  const c = cap();
  if (!c || !c.Plugins) return null;
  const p = c.Plugins[name];
  return (p as T) ?? null;
}

// ── 1. Native session persistence + biometric unlock ─────────────────────────

export interface NativeSession {
  token: string;
  user: unknown;
  subdomain: string;
}

/** Read a Capacitor Preference value, or null. No-op (null) on web. */
async function prefGet(key: string): Promise<string | null> {
  if (!isNative()) return null;
  const Pref = plugin('Preferences');
  if (!Pref) return null;
  try {
    const r = await Pref.get?.({ key });
    return r?.value ?? null;
  } catch {
    return null;
  }
}

/** Write a Capacitor Preference value. No-op on web. */
async function prefSet(key: string, value: string): Promise<void> {
  if (!isNative()) return;
  const Pref = plugin('Preferences');
  if (!Pref) return;
  try {
    await Pref.set?.({ key, value });
  } catch {
    /* ignore */
  }
}

/** Remove a Capacitor Preference value. No-op on web. */
async function prefRemove(key: string): Promise<void> {
  if (!isNative()) return;
  const Pref = plugin('Preferences');
  if (!Pref) return;
  try {
    await Pref.remove?.({ key });
  } catch {
    /* ignore */
  }
}

/**
 * Persist the member session on-device so the app opens straight into their
 * chapter next launch (no re-typing creds). No-op on web — the web app keeps
 * using its HttpOnly cookie exactly as before.
 */
export async function saveSession(session: NativeSession): Promise<void> {
  if (!isNative()) return;
  await prefSet(STORAGE_KEYS.session, JSON.stringify(session));
}

/** Restore the on-device session (after an optional biometric gate). null on web. */
export async function restoreSession(): Promise<NativeSession | null> {
  if (!isNative()) return null;
  const raw = await prefGet(STORAGE_KEYS.session);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NativeSession;
  } catch {
    return null;
  }
}

/** Clear the on-device session (sign-out). No-op on web. */
export async function clearSession(): Promise<void> {
  if (!isNative()) return;
  await prefRemove(STORAGE_KEYS.session);
}

/** Whether the member has turned on Face/Touch ID unlock. false on web. */
export async function isBiometricEnabled(): Promise<boolean> {
  if (!isNative()) return false;
  return (await prefGet(STORAGE_KEYS.biometric)) === '1';
}

/** Toggle the biometric-unlock preference. No-op on web. */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (!isNative()) return;
  await prefSet(STORAGE_KEYS.biometric, enabled ? '1' : '0');
}

/**
 * Gate restoring the session behind a biometric (Face/Touch ID) check when the
 * member has opted in. Uses the community NativeBiometric plugin if present;
 * if it isn't bundled, we fail OPEN to the stored session (still better than
 * forcing re-login) — the biometric is an unlock convenience, not the auth
 * boundary (the tenant-bound Bearer token is). No-op (null) on web.
 */
export async function unlockWithBiometricIfEnabled(): Promise<NativeSession | null> {
  if (!isNative()) return null;
  const session = await restoreSession();
  if (!session) return null;
  if (!(await isBiometricEnabled())) return session;

  const Bio = plugin('NativeBiometric');
  if (!Bio) return session; // plugin not bundled → don't lock the member out
  try {
    const available = await Bio.isAvailable?.();
    if (!available?.isAvailable) return session;
    await Bio.verifyIdentity?.({
      reason: 'Unlock Greek Stack',
      title: 'Greek Stack',
      subtitle: 'Verify to open your chapter',
    });
    return session; // verifyIdentity resolves only on success
  } catch {
    return null; // failed/cancelled biometric → require manual sign-in
  }
}

// ── 2. Deep links / universal links into a chapter ───────────────────────────

/** Parse a Greek Stack deep link into a chapter subdomain + in-app path. */
export function parseDeepLink(
  url: string,
): { subdomain: string | null; path: string } | null {
  try {
    const u = new URL(url);
    // Custom scheme: greekstack://chapter/<subdomain>[/path]
    if (u.protocol === 'greekstack:') {
      const segs = u.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
      const host = u.hostname; // e.g. "chapter"
      if (host === 'chapter' && segs[0]) {
        return { subdomain: segs[0], path: '/' + segs.slice(1).join('/') };
      }
      return { subdomain: null, path: '/' + segs.join('/') };
    }
    // Universal link: https://greekstack.vercel.app/app?chapter=<subdomain>
    // or a per-chapter subdomain host (<subdomain>.greekstack.com).
    const chapterParam = u.searchParams.get('chapter');
    if (chapterParam) return { subdomain: chapterParam, path: u.pathname || '/app' };
    const hostParts = u.hostname.split('.');
    if (hostParts.length >= 3 && !u.hostname.startsWith('www.')) {
      return { subdomain: hostParts[0], path: u.pathname || '/app' };
    }
    return { subdomain: null, path: u.pathname || '/app' };
  } catch {
    return null;
  }
}

/** Navigate the webview to a parsed deep link (chapter pre-selected via query). */
export function navigateToDeepLink(url: string): void {
  if (typeof window === 'undefined') return;
  const parsed = parseDeepLink(url);
  if (!parsed) return;
  const target = parsed.subdomain
    ? `/app?chapter=${encodeURIComponent(parsed.subdomain)}`
    : parsed.path || '/app';
  try {
    window.location.assign(target);
  } catch {
    /* ignore */
  }
}

/**
 * Listen for deep links (universal links / custom scheme) opened while the app
 * is running and route them into the right chapter. Returns a teardown fn.
 * No-op on web.
 */
export async function initDeepLinks(): Promise<() => void> {
  if (!isNative()) return () => {};
  const App = plugin('App');
  if (!App) return () => {};
  let listener: PluginListener | null = null;
  try {
    listener = await App.addListener?.('appUrlOpen', (event: { url: string }) => {
      if (event?.url) navigateToDeepLink(event.url);
    });
  } catch {
    /* ignore */
  }
  return () => {
    try {
      void listener?.remove?.();
    } catch {
      /* ignore */
    }
  };
}

// ── 3. Offline cache of the last view ────────────────────────────────────────

/**
 * Persist a snapshot of the last successfully rendered chapter data so the app
 * can show *something* when launched offline. No-op on web. Stored payload is
 * size-bounded so a huge roster never bloats device storage.
 */
export async function cacheLastView(snapshot: unknown): Promise<void> {
  if (!isNative()) return;
  try {
    const json = JSON.stringify({ at: Date.now(), data: snapshot });
    // Bound to ~256KB; skip oversized payloads rather than risk a write failure.
    if (json.length > 256_000) return;
    await prefSet(STORAGE_KEYS.lastView, json);
  } catch {
    /* ignore */
  }
}

/** Read the cached last-view snapshot (for offline boot). null on web. */
export async function readLastView<T = unknown>(): Promise<{ at: number; data: T } | null> {
  if (!isNative()) return null;
  const raw = await prefGet(STORAGE_KEYS.lastView);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { at: number; data: T };
  } catch {
    return null;
  }
}

/** True when the device currently has no network (for offline-fallback UX). */
export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.onLine === false;
}

// ── 4. Haptics (native tactile feedback) ─────────────────────────────────────
//
// Adds the small tap/selection feedback an iOS user expects from a native app
// (tab switches, primary actions, success/error toasts). All no-ops on web, so
// the existing /app client can call these unconditionally. We map our intents
// onto the @capacitor/haptics API the native shell injects.

type HapticStyle = 'light' | 'medium' | 'heavy';
type HapticNotify = 'success' | 'warning' | 'error';

/** Light/medium/heavy impact (e.g. button press). No-op on web. */
export function hapticImpact(style: HapticStyle = 'light'): void {
  if (!isNative()) return;
  const H = plugin('Haptics');
  if (!H) return;
  try {
    // ImpactStyle enum values are the capitalized strings ('Light'|'Medium'|'Heavy').
    const map: Record<HapticStyle, string> = {
      light: 'Light',
      medium: 'Medium',
      heavy: 'Heavy',
    };
    void H.impact?.({ style: map[style] });
  } catch {
    /* ignore */
  }
}

/** Selection tick (e.g. switching tabs / segmented controls). No-op on web. */
export function hapticSelection(): void {
  if (!isNative()) return;
  const H = plugin('Haptics');
  if (!H) return;
  try {
    // selectionStart()/selectionChanged()/selectionEnd() — a single changed tick
    // is the right feel for a discrete tab tap.
    void H.selectionStart?.();
    void H.selectionChanged?.();
    void H.selectionEnd?.();
  } catch {
    /* ignore */
  }
}

/** Notification haptic for success/warning/error outcomes. No-op on web. */
export function hapticNotify(type: HapticNotify = 'success'): void {
  if (!isNative()) return;
  const H = plugin('Haptics');
  if (!H) return;
  try {
    const map: Record<HapticNotify, string> = {
      success: 'Success',
      warning: 'Warning',
      error: 'Error',
    };
    void H.notification?.({ type: map[type] });
  } catch {
    /* ignore */
  }
}

// ── External links (open the marketing site / any URL) ───────────────────────

/**
 * Open an absolute http(s) URL in the right place for the platform:
 *   • NATIVE shell → the Capacitor `Browser` plugin (system in-app browser),
 *     falling back to `App.openUrl` (hands the URL to the OS) — so a link to the
 *     marketing site never tries to navigate the bundled webview away from /app.
 *   • WEB → a new tab via `window.open(url, "_blank", "noopener,noreferrer")`.
 *
 * Only opens absolute http/https URLs (guards against javascript:/data: and
 * accidental in-app relative navigations). Safe to call unconditionally; never
 * throws into the caller. Returns true when an open was attempted.
 */
export function openExternalUrl(url: string): boolean {
  const target = (url || '').trim();
  // Hard allow-list: only real web URLs leave the app.
  if (!/^https?:\/\//i.test(target)) return false;

  if (isNative()) {
    const Browser = plugin('Browser');
    if (Browser?.open) {
      try {
        void Browser.open({ url: target });
        return true;
      } catch {
        /* fall through to App.openUrl */
      }
    }
    const App = plugin('App');
    if (App?.openUrl) {
      try {
        void App.openUrl({ url: target });
        return true;
      } catch {
        /* fall through to window.open */
      }
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.open(target, '_blank', 'noopener,noreferrer');
      return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

// ── Splash / status bar polish (native chrome) ───────────────────────────────

/** Hide the native splash once the web client has booted. No-op on web. */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  const Splash = plugin('SplashScreen');
  try {
    await Splash?.hide?.();
  } catch {
    /* ignore */
  }
}

/**
 * Apply the dark-chrome status bar (light text) once native. The plugin config
 * in capacitor.config.ts sets the initial style; this re-asserts it after the
 * web client boots so a route that fiddled with the bar can't leave it wrong.
 * No-op on web.
 */
export async function applyStatusBarStyle(): Promise<void> {
  if (!isNative()) return;
  const Bar = plugin('StatusBar');
  if (!Bar) return;
  try {
    // Style.Dark => light text/icons (correct on the navy chrome).
    await Bar.setStyle?.({ style: 'DARK' });
  } catch {
    /* ignore */
  }
}
