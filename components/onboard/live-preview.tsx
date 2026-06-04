"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Globe, Lock, Sparkles } from "lucide-react";
import { Tilt3DCard } from "@/components/site/anim";
import { cn } from "@/lib/utils";

/**
 * LIVE PREVIEW — the heart of the "see your site being built" moment on the
 * Greekstack signup. As the founder types in the wizard, this panel renders
 * their chapter identity forming in real time: greek glyphs, fraternity +
 * chapter name, school, and the three brand colors driving a mock site hero.
 *
 * Purely presentational — it owns no form state, it only mirrors what the
 * wizard already collects. Decorative chrome is aria-hidden; the substantive
 * text (name/school) is real DOM so it reads sensibly to assistive tech.
 *
 * Motion notes:
 *   • Brand recolor is driven by CSS transitions (transform/opacity/background)
 *     rather than a React remount, so typing/dragging the color pickers morphs
 *     the mock site smoothly with zero jank and no re-animation per keystroke.
 *   • The mock browser tilts toward the cursor (Tilt3DCard) and idly floats, so
 *     the preview feels like a living, tangible site coming together.
 *   • The crest glyph "pops" only when the glyph string changes (a rare event),
 *     never on every keystroke. Reduced-motion collapses every flourish; the
 *     preview still updates instantly.
 */
export function LivePreview({
  fraternityName,
  fraternityShort,
  greekLetters,
  greekLettersGlyphs,
  fraternityLetters,
  schoolName,
  schoolShort,
  primaryColor,
  darkColor,
  softColor,
  subdomain,
}: {
  fraternityName: string;
  fraternityShort: string;
  greekLetters: string;
  greekLettersGlyphs: string;
  fraternityLetters: string;
  schoolName: string;
  schoolShort: string;
  primaryColor: string;
  darkColor: string;
  softColor: string;
  subdomain: string;
}) {
  const reduce = useReducedMotion();
  const displayName = fraternityName.trim() || "Your Fraternity";
  const displayChapter = greekLetters.trim() || "Your Chapter";
  const displaySchool = schoolName.trim() || "Your University";
  const glyphs = (fraternityLetters.trim() || greekLettersGlyphs.trim() || "ΦΣ").slice(0, 4);
  const host = (subdomain.trim() || "your-chapter") + ".greeklifesystems.vercel.app";

  // Smooth color morph: shared inline transition so every brand-driven surface
  // eases between palettes instead of snapping. Honors reduced-motion.
  const colorTween = reduce ? undefined : "background 520ms ease, color 420ms ease";

  return (
    <div className="lg:sticky lg:top-8">
      {/* Eyebrow */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Live Preview
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {/* Tiny "live" pulse dot to reinforce that this is reacting in real time. */}
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            {!reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Updates as you type
        </span>
      </div>

      {/* Idle float wrapper — gentle "alive" drift, disabled under reduced-motion. */}
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="will-change-transform"
      >
        {/* Tilt toward the cursor for tangibility (touch/reduced-motion safe). */}
        <Tilt3DCard max={7} glareColor="rgba(99,102,241,0.22)" className="rounded-2xl">
          {/* Mock browser window */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-2xl shadow-indigo-950/40 ring-1 ring-white/5 backdrop-blur-md">
            {/* Browser chrome */}
            <div
              aria-hidden="true"
              className="flex items-center gap-2 border-b border-white/5 bg-slate-900/70 px-3 py-2.5"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <div className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1 text-[11px] text-slate-400">
                <Lock className="h-3 w-3 shrink-0 text-emerald-400/80" />
                <span className="truncate font-mono">{host}</span>
              </div>
            </div>

            {/* Rendered "site" hero — driven entirely by the chosen brand colors.
                Recolors smoothly via colorTween (no remount, so it never replays
                an entrance animation on each keystroke). */}
            <div
              className="relative overflow-hidden px-6 pb-7 pt-8"
              style={{
                background: `radial-gradient(120% 90% at 50% -10%, ${primaryColor}33, transparent 60%), linear-gradient(160deg, ${darkColor} 0%, #0b1020 70%)`,
                transition: colorTween,
              }}
            >
              {/* Crest / glyph badge — pops only when the glyph string changes. */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={glyphs}
                    initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 8 }}
                    transition={
                      reduce
                        ? { duration: 0.15 }
                        : { type: "spring", stiffness: 340, damping: 20 }
                    }
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black tracking-tight shadow-lg ring-1 ring-white/20 will-change-transform"
                    style={{
                      background: `linear-gradient(160deg, ${primaryColor}, ${darkColor})`,
                      color: "#fff",
                      transition: colorTween,
                    }}
                  >
                    {glyphs}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-4 text-center">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: softColor, transition: colorTween }}
                >
                  {displaySchool}
                  {schoolShort.trim() ? ` · ${schoolShort.trim()}` : ""}
                </p>
                <h3 className="mt-1.5 text-xl font-extrabold leading-tight text-white">
                  {displayName}
                </h3>
                <p className="text-sm font-medium" style={{ color: softColor, transition: colorTween }}>
                  {greekLetters.trim() ? `${displayChapter} Chapter` : displayChapter}
                </p>
              </div>

              {/* Mock CTA — uses the primary brand color */}
              <div className="mt-5 flex justify-center">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-md ring-1 ring-white/20"
                  style={{ background: primaryColor, transition: colorTween }}
                >
                  <Globe className="h-3.5 w-3.5" /> Start Recruitment
                </span>
              </div>
            </div>

            {/* Mock content strip on the soft tint */}
            <div className="px-6 py-5" style={{ backgroundColor: softColor, transition: colorTween }}>
              <div className="space-y-2.5">
                <div className="h-2 w-2/3 rounded-full" style={{ backgroundColor: darkColor, opacity: 0.85, transition: colorTween }} />
                <div className="h-2 w-full rounded-full" style={{ backgroundColor: darkColor, opacity: 0.18, transition: colorTween }} />
                <div className="h-2 w-5/6 rounded-full" style={{ backgroundColor: darkColor, opacity: 0.18, transition: colorTween }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Rush", "Events", "Brothers"].map((t) => (
                  <div
                    key={t}
                    className="rounded-lg px-2 py-2 text-center text-[10px] font-semibold"
                    style={{ backgroundColor: "#ffffff", color: darkColor, transition: colorTween }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Tilt3DCard>
      </motion.div>

      {/* Brand swatch legend */}
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Brand palette
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Swatch label="Primary" value={primaryColor} />
          <Swatch label="Dark" value={darkColor} />
          <Swatch label="Soft" value={softColor} />
        </div>
      </div>
    </div>
  );
}

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-950/40 p-1.5">
      <span
        className={cn("h-7 w-7 shrink-0 rounded-md ring-1 ring-white/15 transition-colors duration-500")}
        style={{ backgroundColor: value }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold leading-tight text-slate-200">{label}</p>
        <p className="truncate font-mono text-[9px] uppercase leading-tight text-slate-400">{value}</p>
      </div>
    </div>
  );
}
