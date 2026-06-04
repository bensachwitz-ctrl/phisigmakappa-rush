"use client";

/**
 * BOOK-A-CALL — the optional "want a hand?" beat at the very end of the signup
 * wizard (Stage 4: Launch). The chapter is already live by the time this shows;
 * this is a no-pressure offer to grab 15 minutes with the owner.
 *
 * THREE STATES, picked by config + interaction (never a broken embed):
 *   1. NEXT_PUBLIC_CAL_LINK set + opened → a responsive Cal.com booker iframe
 *      (same shape as the apex /contact <CalEmbed>; a plain iframe keeps us off
 *      the @calcom/embed-react dependency while giving the full inline flow).
 *   2. NEXT_PUBLIC_CAL_LINK set, not yet opened → a tasteful CTA card; clicking
 *      "Book a 15-min call" reveals the embed inline (lazy — the iframe only
 *      mounts on demand so it never costs the launch screen a cold network hit).
 *   3. NEXT_PUBLIC_CAL_LINK UNSET → a warm "we'll reach out" card with a mailto,
 *      so the surface is always graceful — no empty frame, no dead button.
 *
 * NEXT_PUBLIC_* is inlined by Next at build, so this client island can read it
 * directly; there is no server round-trip and no untrusted interpolation (the
 * link is owner-controlled env, not user input).
 *
 * ACCESSIBILITY / MOTION
 *   • The reveal is a height/opacity spring that fully collapses under
 *     prefers-reduced-motion (the iframe still mounts; only the flourish stops).
 *   • The toggle is a real <button> with aria-expanded/aria-controls; the iframe
 *     has a descriptive title; decorative chrome is aria-hidden.
 *   • Big tap targets (44px+), generous spacing, responsive 375 → 1024.
 */

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconSpark, IconCheckCircle } from "@/components/brand/icons";
import { IconCalendar } from "@/components/brand/icons/onboarding-wizard";

/** Owner sales inbox — mirrors the /contact fallback so the copy stays on-brand. */
const SALES_EMAIL =
  (process.env.NEXT_PUBLIC_SALES_EMAIL || "bensachwitz@gmail.com").trim();

/**
 * Responsive Cal.com booker iframe. Mirrors the apex /contact <CalEmbed>: a
 * plain iframe (no extra bundle), light Cal theme inside a clean white card so it
 * reads crisply against the wizard's deep-ink chrome.
 */
function CalBooker({ calLink }: { calLink: string }) {
  // Trim any leading slash so both "yourname/15min" and "/yourname/15min" work.
  const slug = calLink.replace(/^\/+/, "");
  const src = `https://cal.com/${slug}?embed=true&theme=light`;
  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-white shadow-inner ring-1 ring-white/10">
      <iframe
        title="Book a 15-minute call with the Greekstack team"
        src={src}
        loading="lazy"
        className="h-[560px] w-full sm:h-[620px]"
        style={{ border: 0 }}
        allow="camera; microphone; fullscreen; clipboard-write"
      />
    </div>
  );
}

export function BookACall() {
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);

  // Inlined at build; whitespace-trimmed so an accidental " " never counts as set.
  const calLink = (process.env.NEXT_PUBLIC_CAL_LINK || "").trim();
  const hasCal = calLink.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.10] via-blue-500/[0.05] to-transparent p-4 sm:p-5">
      {/* Header row — icon chip + headline + sub. */}
      <div className="flex items-start gap-3">
        <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-400/10 text-sky-300 ring-1 ring-sky-400/25">
          {!reduce && (
            <motion.span
              className="absolute inset-0 rounded-xl bg-sky-400/15 blur-md"
              animate={{ opacity: [0.3, 0.65, 0.3] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
          )}
          <IconCalendar className="relative h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-white">
            Want a hand getting set up?
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200 ring-1 ring-sky-400/20">
              Optional
            </span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Grab a free 15-minute call with the owner — we&apos;ll help you import members, theme
            your page, and launch recruitment. Totally optional; your site is already live.
          </p>
        </div>
      </div>

      {/* Action area — branches on whether a Cal link is configured. */}
      <div className="mt-4">
        {hasCal ? (
          <>
            {/* CTA toggle → reveals the embed inline (lazy mount). */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="onboard-cal-embed"
              className={cn(
                "group inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 sm:w-auto",
                open
                  ? "border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
                  : "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:-translate-y-0.5 hover:border-sky-300/60 hover:bg-sky-500/25",
              )}
            >
              <IconCalendar className="h-4 w-4" aria-hidden="true" />
              {open ? "Hide scheduler" : "Book a 15-min call"}
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id="onboard-cal-embed"
                  key="cal"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={reduce ? { duration: 0.15 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <CalBooker calLink={calLink} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* No Cal link configured → warm "we'll reach out" card (never a broken
             embed). A mailto keeps the path open without any external dependency. */
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
              <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span>
                We&apos;ll reach out by email to offer a hand getting set up — no action needed.
                Prefer to reach us first? Email{" "}
                <a
                  href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent("Help getting our chapter set up on Greekstack")}`}
                  className="font-semibold text-sky-200 underline-offset-2 hover:underline"
                >
                  {SALES_EMAIL}
                </a>
                .
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Tiny reassurance footer — present in both branches. */}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
        <IconSpark className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
        No pressure — you can always book later from your admin, or skip and head straight in.
      </p>
    </div>
  );
}
