"use client";

import * as React from "react";
import { CheckCircle2, ExternalLink, Loader2, PartyPopper } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";

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
      {/* Decorative pinging halo behind the check */}
      <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-glow rounded-full bg-gradient-to-br from-emerald-400/40 via-cyan-400/30 to-indigo-500/30 blur-xl"
        />
        <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-500/40 ring-4 ring-emerald-300/30">
          <CheckCircle2 className="h-10 w-10" />
        </span>
      </div>

      <div className="mb-2 flex items-center justify-center gap-2">
        <PartyPopper className="h-5 w-5 text-indigo-300" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
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
        <IconChip icon={ExternalLink} tone="platform" size="sm" />
        <span className="truncate font-mono text-sm text-slate-200">{host}</span>
      </div>

      <p className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting to your dashboard…
      </p>
    </div>
  );
}
