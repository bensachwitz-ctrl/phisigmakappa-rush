import Script from "next/script";
import {
  resolveChatwootConfig,
  buildChatwootBootstrap,
  type ChatwootEnv,
} from "@/lib/chatwoot";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * CHATWOOT LIVE-CHAT SUPPORT WIDGET — inert-by-default mount
 * ────────────────────────────────────────────────────────────────────────────
 * Renders the floating Chatwoot support bubble so chapter officers can field
 * recruit + member questions live, OR returns `null` (renders NOTHING) when the
 * platform hasn't configured a Chatwoot install. Drop it once near the end of
 * the root layout body.
 *
 *   • INERT WITHOUT CONFIG. With CHATWOOT_BASE_URL / CHATWOOT_WEBSITE_TOKEN
 *     unset, `resolveChatwootConfig` → null and this component emits no script,
 *     no markup, no network call. The gates stay green and the page is unchanged.
 *
 *   • ON-BRAND LAUNCHER. When configured, the floating bubble + header are
 *     tinted to the chapter's primary color (passed in from layout's resolved
 *     brand hex) so the support entry point matches the rest of the product
 *     instead of Chatwoot's default blue.
 *
 *   • SERVER COMPONENT. No "use client" — the bootstrap is a static string
 *     injected via next/script (strategy="afterInteractive"), so there's zero
 *     client bundle cost beyond the (deferred, async) SDK the snippet loads.
 *
 * The validated values come straight from `lib/chatwoot.ts`, which is unit
 * tested; this component is the thin render shell around it.
 */
export function ChatwootWidget({
  launcherColor,
  position = "right",
  locale = "en",
  env,
}: {
  /** Chapter brand hex for the launcher bubble. Falls back to royal-blue. */
  launcherColor?: string;
  /** Which side the bubble floats on. */
  position?: "left" | "right";
  /** BCP-47-ish locale for the widget chrome. */
  locale?: string;
  /** Test seam — defaults to process.env on the server. */
  env?: ChatwootEnv;
}) {
  const cfg = resolveChatwootConfig(env);
  // Inert: no install configured → render nothing at all.
  if (!cfg) return null;

  const bootstrap = buildChatwootBootstrap(cfg, { launcherColor, position, locale });
  return (
    <Script
      id="chatwoot-support-widget"
      strategy="afterInteractive"
      // The bootstrap is built entirely from VALIDATED config + a safe hex in
      // lib/chatwoot.ts, so this dangerouslySetInnerHTML carries no injectable
      // input (no path/scheme/token reaches it unchecked).
      dangerouslySetInnerHTML={{ __html: bootstrap }}
    />
  );
}
