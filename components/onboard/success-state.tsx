"use client";

import * as React from "react";
import { IconExternal } from "@/components/brand/icons";
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

      {/* Manual go-to-dashboard action — ALWAYS present (not gated on a timer) so a
          slow auto-redirect or a briefly-unreachable fresh host never strands the
          new admin on a spinner. The auto-redirect (owned by the parent) still
          fires; this is the guaranteed escape hatch right at the finish line. */}
      {url && (
        <a
          href={url}
          className="group mx-auto mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-300/30 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
        >
          Open my dashboard
          <IconExternal className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </a>
      )}

      <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-400">
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        Taking you there automatically…
      </p>
    </div>
  );
}
