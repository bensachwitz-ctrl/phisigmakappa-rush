"use client";

import { useEffect } from "react";
import {
  isNative,
  initDeepLinks,
  restoreSession,
  unlockWithBiometricIfEnabled,
  saveSession,
  clearSession,
  cacheLastView,
  readLastView,
  hideSplash,
  applyStatusBarStyle,
  hapticImpact,
  hapticSelection,
  hapticNotify,
  openExternalUrl,
  navigateToDeepLink,
  type NativeSession,
} from "@/lib/native-bridge";

// NativeBridge — mounts inside the /app route and wires the Capacitor native
// value layer (biometric session, deep links, offline cache, splash, haptics).
//
// CRITICAL: this renders nothing and is INERT on web. Every effect first checks
// isNative(); on greekstack.vercel.app in a browser nothing here runs, so the
// live web app is unchanged. It only activates inside the iOS/Android shell.
//
// It also exposes a tiny `window.GreekStackNative` bridge so the existing /app
// client (or the future authenticated client) can, when running natively:
//   • persist the member session on-device (saveSession)
//   • snapshot the last view for offline boot (cacheLastView)
//   • fire native haptics on taps/actions (hapticImpact/Selection/Notify)
// On web these are still defined but every underlying call no-ops, so callers
// don't need their own platform checks.
//
// PUSH: the server side of push is now wired — an APNs "push" notify channel
// (lib/notify/apns.ts) plus a per-user device-token store + /api/push/register.
// The bridge exposes `registerPushToken(token)`: the native shell obtains the
// APNs device token from the OS (didRegisterForRemoteNotifications) and calls
// this to bind it to the signed-in member. On web there is no device token, so
// it is simply never called. Collecting the token requires the native shell's own
// APNs registration (Info.plist aps-environment + registerForRemoteNotifications).

declare global {
  interface Window {
    GreekStackNative?: {
      isNative: boolean;
      saveSession: (s: NativeSession) => Promise<void>;
      clearSession: () => Promise<void>;
      cacheLastView: (snapshot: unknown) => Promise<void>;
      readLastView: () => Promise<{ at: number; data: unknown } | null>;
      // Haptics — tactile feedback the client fires on taps/actions. No-ops on web.
      hapticImpact: (style?: "light" | "medium" | "heavy") => void;
      hapticSelection: () => void;
      hapticNotify: (type?: "success" | "warning" | "error") => void;
      // Open an absolute http(s) URL externally (system browser natively, new
      // tab on web). Used by the picker's "greekstack.com" website link.
      openExternalUrl: (url: string) => boolean;
      // Register an APNs device token for push. The native shell calls this from
      // its didRegisterForRemoteNotifications callback; binds the token to the
      // signed-in member via /api/push/register. Resolves false on web / no token.
      registerPushToken: (token: string) => Promise<boolean>;
      restoredSession?: NativeSession | null;
    };
  }
}

/**
 * POST an APNs device token to the server, bound to the current portal session
 * (same-origin cookie). Best-effort — never throws; resolves true only on a 2xx.
 */
async function registerPushToken(token: string): Promise<boolean> {
  const t = (token || "").trim();
  if (!t) return false;
  try {
    const res = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token: t }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function NativeBridge() {
  useEffect(() => {
    // Always publish the bridge so client code can call it unconditionally.
    // On web these resolve to no-ops (the lib self-guards on isNative()).
    window.GreekStackNative = {
      isNative: isNative(),
      saveSession,
      clearSession,
      cacheLastView,
      readLastView,
      hapticImpact,
      hapticSelection,
      hapticNotify,
      openExternalUrl,
      registerPushToken,
      restoredSession: null,
    };

    if (!isNative()) {
      // Web: nothing native to do. The web app behaves exactly as before.
      return;
    }

    let teardownLinks: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      // 1) Restore on-device session (Face/Touch ID gated when opted in) so the
      //    app opens straight into the member's chapter.
      try {
        const session =
          (await unlockWithBiometricIfEnabled()) ?? (await restoreSession());
        if (!cancelled && session && window.GreekStackNative) {
          window.GreekStackNative.restoredSession = session;
        }
      } catch {
        /* ignore — fall back to the normal sign-in surface */
      }

      // 2) Deep links / universal links into a specific chapter.
      try {
        teardownLinks = await initDeepLinks();
      } catch {
        /* ignore */
      }

      // 3) Honor a cold-start deep link passed as a launch query param.
      try {
        const launchUrl = window.location.href;
        if (/[?&]chapter=/.test(launchUrl)) {
          // already on the right /app?chapter=… target; nothing to do
        }
      } catch {
        /* ignore */
      }

      // 4) Re-assert the dark-chrome status bar (light text on navy).
      try {
        await applyStatusBarStyle();
      } catch {
        /* ignore */
      }

      // 5) Drop the native splash now that the client is interactive.
      try {
        await hideSplash();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      try {
        teardownLinks?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return null;
}

// Re-export for callers that want the parser directly (kept tree-shakeable).
export { navigateToDeepLink };
