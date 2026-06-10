"use client";

import { useEffect } from "react";
import {
  isNative,
  initPushNotifications,
  initDeepLinks,
  restoreSession,
  unlockWithBiometricIfEnabled,
  saveSession,
  clearSession,
  onSessionEstablished,
  cacheLastView,
  readLastView,
  hideSplash,
  navigateToDeepLink,
  type NativeSession,
} from "@/lib/native-bridge";

// NativeBridge — mounts inside the /app route and wires the Capacitor native
// value layer (push, biometric session, deep links, offline cache, splash).
//
// CRITICAL: this renders nothing and is INERT on web. Every effect first checks
// isNative(); on greekstack.vercel.app in a browser nothing here runs, so the
// live web app is unchanged. It only activates inside the iOS/Android shell.
//
// It also exposes a tiny `window.GreekStackNative` bridge so the existing /app
// client (or the future authenticated client) can, when running natively:
//   • persist the member session on-device (saveSession)
//   • trigger the push-token upload after sign-in (onSessionEstablished)
//   • snapshot the last view for offline boot (cacheLastView)
// On web these are still defined but every underlying call no-ops, so callers
// don't need their own platform checks.

declare global {
  interface Window {
    GreekStackNative?: {
      isNative: boolean;
      saveSession: (s: NativeSession) => Promise<void>;
      clearSession: () => Promise<void>;
      onSignedIn: () => void;
      cacheLastView: (snapshot: unknown) => Promise<void>;
      readLastView: () => Promise<{ at: number; data: unknown } | null>;
      restoredSession?: NativeSession | null;
    };
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
      onSignedIn: onSessionEstablished,
      cacheLastView,
      readLastView,
      restoredSession: null,
    };

    if (!isNative()) {
      // Web: nothing native to do. The web app behaves exactly as before.
      return;
    }

    let teardownPush: (() => void) | null = null;
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

      // 2) Push notifications (events + announcements). The token is uploaded
      //    once both the APNs token AND a chapter session exist.
      try {
        teardownPush = await initPushNotifications(() => {
          const s = window.GreekStackNative?.restoredSession;
          return s ? { subdomain: s.subdomain, token: s.token } : null;
        });
      } catch {
        /* ignore */
      }

      // 3) Deep links / universal links into a specific chapter.
      try {
        teardownLinks = await initDeepLinks();
      } catch {
        /* ignore */
      }

      // 4) Honor a cold-start deep link passed as a launch query param.
      try {
        const launchUrl = window.location.href;
        if (/[?&]chapter=/.test(launchUrl)) {
          // already on the right /app?chapter=… target; nothing to do
        }
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
        teardownPush?.();
      } catch {
        /* ignore */
      }
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
