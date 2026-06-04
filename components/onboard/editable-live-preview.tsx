"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  IconSubdomain,
  IconSecurity,
  IconSpark,
  IconArrowRight,
  IconCheckCircle,
} from "@/components/brand/icons";
import {
  IconPencil,
  IconSettingsGear,
} from "@/components/brand/icons/onboarding-wizard";
import { Tilt3DCard } from "@/components/site/anim";
import { cn } from "@/lib/utils";

/**
 * EDITABLE LIVE PREVIEW — the "design your site while you watch it" surface of
 * the Greekstack signup. It is the read-only {@link LivePreview} grown a set of
 * INLINE editors: the founder edits the brand colors, the chapter/org name, and
 * the hero headline + tagline RIGHT ON the mock site, and every surface recolors
 * / retitles in real time (no remount, so the hero never replays an entrance
 * animation per keystroke).
 *
 * Single source of truth stays the WIZARD — this component is fully controlled:
 * it renders the wizard's current values and calls the matching setter on every
 * edit. Nothing here is persisted; a clear note tells the founder they can fully
 * edit all of it later in Admin → Settings.
 *
 * ACCESSIBILITY
 *   • The editable display name / headline / tagline are real text inputs with
 *     visible labels (sr-only where the design reads obviously), 44px+ targets on
 *     the color pickers, and a "Live preview — editable" caption.
 *   • Decorative chrome (browser dots, glyph badge, swatches) is aria-hidden.
 *   • Reduced-motion collapses every flourish; the preview still updates live.
 *
 * MOTION
 *   • Brand recolor is a CSS transition on background/color, so dragging a color
 *     picker morphs the whole mock smoothly.
 *   • The card tilts toward the cursor and idly floats (both disabled under
 *     reduced-motion / on touch).
 */
export function EditableLivePreview({
  fraternityName,
  onFraternityName,
  greekLetters,
  greekLettersGlyphs,
  fraternityLetters,
  schoolName,
  schoolShort,
  primaryColor,
  onPrimaryColor,
  darkColor,
  onDarkColor,
  softColor,
  onSoftColor,
  heroHeadline,
  onHeroHeadline,
  heroTagline,
  onHeroTagline,
  subdomain,
}: {
  fraternityName: string;
  onFraternityName: (v: string) => void;
  greekLetters: string;
  greekLettersGlyphs: string;
  fraternityLetters: string;
  schoolName: string;
  schoolShort: string;
  primaryColor: string;
  onPrimaryColor: (v: string) => void;
  darkColor: string;
  onDarkColor: (v: string) => void;
  softColor: string;
  onSoftColor: (v: string) => void;
  heroHeadline: string;
  onHeroHeadline: (v: string) => void;
  heroTagline: string;
  onHeroTagline: (v: string) => void;
  subdomain: string;
}) {
  const reduce = useReducedMotion();

  const displayName = fraternityName.trim() || "Your Chapter";
  const displaySchool = schoolName.trim() || "Your University";
  const glyphs = (fraternityLetters.trim() || greekLettersGlyphs.trim() || "ΦΣ").slice(0, 4);
  const host = (subdomain.trim() || "your-chapter") + ".greekstack.vercel.app";

  // Placeholder hero copy mirrors the launched site's neutral defaults so an
  // untouched preview still reads like a finished page (the real defaults live in
  // lib/site-config.ts: hero.h1.lead / hero.subline).
  const headlinePlaceholder = "Rush starts this fall";
  const taglinePlaceholder =
    "Meet the brotherhood, see what we’re about, and drop your number to get rushed.";

  const colorTween = reduce ? undefined : "background 520ms ease, color 420ms ease";

  return (
    <div className="lg:sticky lg:top-8">
      {/* Eyebrow — now explicitly EDITABLE so the founder knows to type here. */}
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300 ring-1 ring-sky-400/20">
          <IconSpark className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" /> Live Preview
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
          <IconPencil className="h-3.5 w-3.5" aria-hidden="true" /> Editable
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            {!reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Edit it right here
        </span>
      </div>

      {/* Device stage — a brand-tinted glow halo that morphs with the primary
          color sits behind the floating browser mock, grounding it as the visual
          centerpiece. The halo + float are decorative and reduced-motion-safe. */}
      <div className="relative">
        {/* Morphing brand glow halo (decorative). Recolors with the primary +
            dark brand colors via colorTween so the whole stage feels alive. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-2xl"
          style={{
            background: `radial-gradient(60% 55% at 50% 32%, ${primaryColor}33, transparent 70%), radial-gradient(50% 50% at 70% 80%, ${darkColor}26, transparent 75%)`,
            transition: colorTween,
          }}
        />

        {/* Idle float wrapper — gentle drift, disabled under reduced-motion. */}
        <motion.div
          animate={reduce ? undefined : { y: [0, -6, 0] }}
          transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="will-change-transform"
        >
          <Tilt3DCard max={6} glareColor="rgba(56,189,248,0.22)" className="rounded-2xl">
            {/* Mock browser window — grounded with a deep floating shadow so it
                reads as a real device hovering above the page. */}
            <div className="gs-float-shadow relative overflow-hidden rounded-2xl border border-white/12 bg-slate-950/60 ring-1 ring-white/5 backdrop-blur-md">
              {/* Browser chrome — traffic lights, nav affordances, a secure URL
                  pill, and a tiny live dot, so the mock reads as a real browser. */}
              <div
                aria-hidden="true"
                className="flex items-center gap-2 border-b border-white/8 bg-gradient-to-b from-slate-900/85 to-slate-900/60 px-3 py-2.5"
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80 ring-1 ring-inset ring-black/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 ring-1 ring-inset ring-black/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 ring-1 ring-inset ring-black/10" />
                </span>
                {/* Back / forward chevrons (purely decorative chrome). */}
                <span className="ml-1 hidden items-center gap-0.5 text-slate-500 sm:flex">
                  <IconArrowRight className="h-3.5 w-3.5 rotate-180 opacity-60" />
                  <IconArrowRight className="h-3.5 w-3.5 opacity-30" />
                </span>
                <div className="ml-1.5 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-white/5">
                  <IconSecurity className="h-3 w-3 shrink-0 text-emerald-400/80" />
                  <span className="truncate font-mono">{host}</span>
                  <span className="ml-auto hidden items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300 sm:inline-flex">
                    <span className="h-1 w-1 rounded-full bg-emerald-400" /> Live
                  </span>
                </div>
              </div>

            {/* Rendered "site" hero — driven by the chosen brand colors. Recolors
                smoothly via colorTween. The headline + name + tagline are inline
                <input>s styled to read as the live hero text. */}
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
                      reduce ? { duration: 0.15 } : { type: "spring", stiffness: 340, damping: 20 }
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

                {/* Editable display name — reads as the hero <h3>. */}
                <HeroEditable
                  label="Chapter / organization name"
                  value={fraternityName}
                  onChange={onFraternityName}
                  placeholder={displayName}
                  className="mt-1.5 text-xl font-extrabold leading-tight text-white"
                  align="center"
                />

                {/* Editable headline — the punchy single-beat hero line. */}
                <HeroEditable
                  label="Hero headline"
                  value={heroHeadline}
                  onChange={onHeroHeadline}
                  placeholder={headlinePlaceholder}
                  className="mt-1 text-sm font-semibold"
                  style={{ color: softColor, transition: colorTween }}
                  align="center"
                />
              </div>

              {/* Editable tagline — the supporting hero subline. */}
              <HeroEditable
                label="Hero tagline"
                value={heroTagline}
                onChange={onHeroTagline}
                placeholder={taglinePlaceholder}
                className="mx-auto mt-2 max-w-[18rem] text-center text-[11px] leading-relaxed text-white/70"
                align="center"
                multiline
              />

              {/* Mock CTA — uses the primary brand color */}
              <div className="mt-5 flex justify-center">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-md ring-1 ring-white/20"
                  style={{ background: primaryColor, transition: colorTween }}
                >
                  <IconSubdomain className="h-3.5 w-3.5" /> Start Recruitment
                </span>
              </div>
            </div>

            {/* Mock content strip on the soft tint */}
            <div className="px-6 py-5" style={{ backgroundColor: softColor, transition: colorTween }}>
              <div className="space-y-2.5">
                <div
                  className="h-2 w-2/3 rounded-full"
                  style={{ backgroundColor: darkColor, opacity: 0.85, transition: colorTween }}
                />
                <div
                  className="h-2 w-full rounded-full"
                  style={{ backgroundColor: darkColor, opacity: 0.18, transition: colorTween }}
                />
                <div
                  className="h-2 w-5/6 rounded-full"
                  style={{ backgroundColor: darkColor, opacity: 0.18, transition: colorTween }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Rush", "Events", "Members"].map((t) => (
                  <div
                    key={t}
                    className="rounded-lg px-2 py-2 text-center text-[10px] font-semibold shadow-sm ring-1 ring-black/[0.04]"
                    style={{ backgroundColor: "#ffffff", color: darkColor, transition: colorTween }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Screen reflection — a faint diagonal sheen across the whole device
                glass, sitting above the rendered "site". Decorative, no motion. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.08]"
            />
            </div>
          </Tilt3DCard>
        </motion.div>
      </div>

      {/* ── Inline editor rail — brand colors as real controls ──────────────── */}
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
        <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            <IconPencil className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" /> Edit your brand colors
          </p>
          {/* Live palette read — a tiny strip mirroring the three chosen colors so
              the founder sees their whole brand at a glance. Morphs with edits. */}
          <span className="flex items-center gap-1" aria-hidden="true">
            {[primaryColor, darkColor, softColor].map((c, i) => (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded-full ring-1 ring-white/25 shadow-sm"
                style={{ backgroundColor: c, transition: colorTween }}
              />
            ))}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ColorEditable label="Primary" value={primaryColor} onChange={onPrimaryColor} />
          <ColorEditable label="Dark" value={darkColor} onChange={onDarkColor} />
          <ColorEditable label="Soft" value={softColor} onChange={onSoftColor} />
        </div>
      </div>

      {/* "You can change anything later" reassurance. */}
      <p className="mt-3 flex items-start gap-2 rounded-xl border border-sky-400/15 bg-sky-500/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-slate-300">
        <IconSettingsGear className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
        <span>
          This is just a starting point — you can fully edit everything (colors, text, photos,
          and more) anytime in <strong className="font-semibold text-sky-100">Admin → Settings</strong>.
        </span>
      </p>
    </div>
  );
}

/* ── Inline-editable hero text ────────────────────────────────────────────────
   Renders as the live hero text but is a real, labelled control. A subtle
   dashed underline + a pencil on focus signals "click to edit" without adding
   chrome that fights the design. `multiline` swaps to a auto-growing textarea for
   the tagline. */
function HeroEditable({
  label,
  value,
  onChange,
  placeholder,
  className,
  style,
  align = "left",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
  align?: "left" | "center";
  multiline?: boolean;
}) {
  const id = React.useId();
  const shared = cn(
    "w-full rounded-md bg-transparent outline-none transition-colors placeholder:text-current/45",
    // A faint dashed border at rest signals "editable" without adding chrome;
    // it brightens to a solid sky ring + soft tint on hover/focus. Border lives
    // in the box at all states (transparent→colored) so there is zero layout shift.
    "border border-dashed border-white/10 hover:border-white/25 focus:border-solid focus:border-sky-300/70 focus:bg-white/5 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)]",
    "px-1.5 py-0.5",
    align === "center" ? "text-center" : "text-left",
    className,
  );

  return (
    <div className={cn("group relative", align === "center" && "mx-auto")}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          aria-label={label}
          className={cn(shared, "resize-none")}
          style={style}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          autoComplete="off"
          spellCheck={false}
          className={shared}
          style={style}
        />
      )}
      {/* Pencil affordance — appears on hover/focus, decorative. */}
      <IconPencil
        className={cn(
          "pointer-events-none absolute -right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40 opacity-0 transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
        )}
        aria-hidden="true"
      />
    </div>
  );
}

/* ── Inline-editable color control — a 44px swatch picker + a hex input ──────── */
function ColorEditable({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = React.useId();
  // The native color input demands a valid #rrggbb; fall back so a partial hex
  // mid-type doesn't reset the swatch to black.
  const swatchValue = /^#([0-9a-fA-F]{6})$/.test(value.trim()) ? value.trim() : "#2563eb";
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-950/40 p-1.5 ring-1 ring-white/5 transition-all hover:bg-slate-950/60 hover:ring-white/10 focus-within:ring-2 focus-within:ring-sky-400/50">
      <input
        id={`${id}-swatch`}
        type="color"
        value={swatchValue}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} color`}
        // A soft glow ring in the current color makes each swatch feel "lit".
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.12), 0 2px 8px -2px ${swatchValue}99` }}
        className="h-9 w-9 min-h-[36px] shrink-0 cursor-pointer rounded-md border border-white/15 bg-transparent p-0.5 transition-transform hover:scale-105"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="block text-[10px] font-semibold leading-tight text-slate-200"
        >
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex value`}
          spellCheck={false}
          className="w-full truncate bg-transparent font-mono text-[10px] uppercase leading-tight text-slate-400 outline-none focus:text-slate-200"
        />
      </div>
    </div>
  );
}
