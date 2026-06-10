"use client";

import * as React from "react";
import { IconExternal, IconSpark } from "@/components/brand/icons";
import { IconChip } from "@/components/ui/icon-chip";
import { IllustrationCelebrate } from "@/components/brand/illustrations";

/**
 * Celebratory success screen shown the instant /api/onboard provisions the
 * chapter site, immediately before the wizard hands off to the live subdomain.
 * Conveys the "live in seconds" magic; the parent still owns the actual
 * redirect (window.location.href = data.url).
 *
 * Motion is confetti-free and transform/opacity based, so prefers-reduced-motion
 * collapses it to the final state (handled globally in globals.css).
 */
export function SuccessState({
  fraternityName,
  greekLetters,
  url,
}: {
  fraternityName: string;
  greekLetters: string;
  url: string;
}) {
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* keep raw url if it isn't parseable */
  }

  const name = [fraternityName.trim(), greekLetters.trim()].filter(Boolean).join(" ") || "Your chapter";

  // Day-one resilience: the parent auto-redirects after a short beat, but if that
  // navigation is slow (or the freshly provisioned host is briefly unreachable)
  // the admin should never be stranded on a perpetual spinner. Reveal a manual
  // "Go to my dashboard" link a few seconds in so they always have an escape.
  const [showManual, setShowManual] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShowManual(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="animate-soft-enter py-6 text-center">
      {/* Bespoke celebration illustration — a laurel-wreathed success medallion
          with a confetti burst — over a soft pinging halo. The illustration's
          linework follows `currentColor` (emerald here so it reads on the dark
          success panel); its accent fill follows the same colour. Static shapes
          convey the celebration, so it's reduced-motion-safe (the surrounding
          halo + soft-enter are decorative and collapse under reduced-motion). */}
      <div className="relative mx-auto mb-6 flex h-32 w-36 items-center justify-center text-emerald-300">
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-glow rounded-full bg-gradient-to-br from-emerald-400/40 via-sky-400/30 to-blue-500/30 blur-xl"
        />
        <IllustrationCelebrate className="relative h-32 w-36 drop-shadow-[0_8px_24px_rgba(16,185,129,0.35)]" aria-hidden="true" />
      </div>

      <div className="mb-2 flex items-center justify-center gap-2">
        <IconSpark className="h-5 w-5 text-amber-300" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
          Live in seconds
        </span>
      </div>

      <h2 className="text-3xl font-extrabold tracking-tight text-white">
        Your site is <span className="gs-gradient-text">live!</span>
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
        <span className="font-semibold text-white">{name}</span> is provisioned with its own
        branded site, admin dashboard, and database. Taking you there now.
      </p>

      {/* The new live URL */}
      <div className="mx-auto mt-6 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 backdrop-blur-md">
        <IconChip icon={IconExternal} tone="platform" size="sm" />
        <span className="truncate font-mono text-sm text-slate-200">{host}</span>
      </div>

      <p className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-slate-400">
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        Redirecting to your dashboard…
      </p>

      {/* Manual fallback — appears a few seconds in so a slow/unreachable
          auto-redirect never strands the new admin on a spinner. */}
      {showManual && url && (
        <div className="mt-4 animate-soft-enter text-xs text-slate-400">
          Not redirected automatically?{" "}
          <a
            href={url}
            className="font-semibold text-emerald-300 underline-offset-2 hover:underline"
          >
            Go to my dashboard
          </a>
        </div>
      )}
    </div>
  );
}
