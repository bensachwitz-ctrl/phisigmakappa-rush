import posthog from 'posthog-js';

export function initPostHog() {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || (typeof window !== "undefined" ? (window as any).gs_posthog_key : undefined);
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    console.log("[PostHog] No API Key provided, skipping initialization.");
    return;
  }

  if (typeof window !== 'undefined') {
    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
    });
    console.log("[PostHog] Initialized successfully.");
  }
}

export function captureEvent(name: string, properties = {}) {
  if (typeof window !== 'undefined') {
    posthog.capture(name, properties);
  }
}
