// PostHog client wiring. The SDK is LAZY-LOADED via dynamic import only when a
// key is actually configured, so the (common) unconfigured tenant never pulls
// posthog-js into the shared root-layout chunk shipped to every page.

import type posthogType from 'posthog-js';

// Cached instance once initialized, so captureEvent can fire without re-importing.
let ph: typeof posthogType | null = null;

export async function initPostHog() {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || (typeof window !== "undefined" ? (window as any).gs_posthog_key : undefined);
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    // Silent no-op when unconfigured — the default (no-key) tenant must not log
    // on every page load (zero-console GOTY bar) and never loads the SDK.
    return;
  }

  if (typeof window !== 'undefined') {
    const mod = await import('posthog-js');
    ph = mod.default;
    ph.init(apiKey, {
      api_host: apiHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
    });
  }
}

export function captureEvent(name: string, properties = {}) {
  // No-op until/unless initPostHog actually loaded + initialized the SDK.
  if (typeof window !== 'undefined' && ph) {
    ph.capture(name, properties);
  }
}
