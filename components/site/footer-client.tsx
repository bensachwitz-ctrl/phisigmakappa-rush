"use client";

import * as React from "react";
import { PublicFooterView } from "./footer";

/**
 * Client-safe footer for "use client" pages (alumni onboard redemption, portal
 * password reset, alumni self-registration).
 *
 * WHY: <PublicFooter/> is an async Server Component (it awaits getSiteConfig(),
 * which reads the DB + request headers). Rendering it from inside a client tree
 * throws "Error: Not implemented." at request time — which 500'd the whole
 * /alumni/onboard/[token] route and broke the footer on reset-password and
 * alumni/register. This component renders the SAME presentational footer but
 * sources its config from a public GET (/api/site-config/public) after mount,
 * so nothing async-server ever runs in the browser.
 *
 * To avoid a footer "pop-in" / layout shift, it renders immediately with a
 * NEUTRAL white-label seed (the same blank-default behavior PublicFooterView
 * already falls back to for unset keys), then swaps in the real chapter config
 * once the fetch resolves. The seed mirrors the server DEFAULTS for the handful
 * of keys with a non-empty neutral default; everything else is intentionally
 * blank so PublicFooterView's own fallbacks render correctly.
 */

// Neutral seed — matches lib/site-config DEFAULTS for the keys the footer reads
// that have a non-empty white-label default. Kept inline (not imported from
// lib/site-config) so this client bundle never pulls in the server-only Prisma
// module that file imports.
const FOOTER_SEED: Record<string, string> = {
  "contact.advisorName": "Our Chapter Advisor",
  "contact.advisorTitle": "Alumni Advisor",
  "antiHazing.hotline": "1-888-NOT-HAZE",
  "antiHazing.hotlineUrl": "https://hazingprevention.org/help/",
};

export function PublicFooterClient() {
  const [cfg, setCfg] = React.useState<Record<string, string>>(FOOTER_SEED);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/site-config/public", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!active || !data?.ok || !data.config) return;
        // Merge over the seed so any key the API omits keeps a sensible default.
        setCfg((prev) => ({ ...prev, ...data.config }));
      } catch {
        // Network/parse failure → keep the neutral seed. The footer still
        // renders (degrades gracefully) rather than disappearing or crashing.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return <PublicFooterView cfg={cfg} />;
}
