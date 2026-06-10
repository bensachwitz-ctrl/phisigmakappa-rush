"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { BrandGlyph } from "@/components/site/brand-glyph";
import { IconClose, IconCheck, IconArrowRight, type IconProps } from "@/components/brand/icons";

/** Custom Greekstack icon component type. */
type GsIcon = (props: IconProps) => React.JSX.Element;

/** The shape a feature must provide to open in the detail modal. */
export type FeatureDetail = {
  icon: GsIcon;
  /**
   * Bespoke pre-rendered feature tile served from /brand/gen/<img>.png — a
   * self-contained frosted-glass app-icon. When present it REPLACES the SVG
   * `icon` glyph + its chip wrapper everywhere this feature renders (the grid
   * card and this modal's header), since the image is already a finished tile.
   * `icon` is kept on the type for back-compat / non-image surfaces.
   */
  img?: string;
  title: string;
  /** Short eyebrow shown above the title in the modal (e.g. "Recruitment"). */
  eyebrow: string;
  /** Card-grid one-liner. */
  desc: string;
  /** Richer paragraph shown only in the modal. */
  long: string;
  /** 3–4 concrete capability bullets. */
  bullets: string[];
  /** The div-built in-app preview screenshot for this feature. */
  preview: React.ReactNode;
};

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.97,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

/**
 * FeatureDetailModal — a polished, accessible detail overlay for a feature card.
 *
 * Behaviour:
 *   • Spring/scale entrance + fade backdrop (framer-motion AnimatePresence).
 *     Collapses to an instant show/hide under prefers-reduced-motion.
 *   • Closes on Escape, on backdrop click, and on the close button.
 *   • Focus-trap: focus moves into the dialog on open, Tab/Shift-Tab cycle
 *     within it, and focus is restored to the trigger on close.
 *   • Locks body scroll while open (and compensates for the scrollbar width so
 *     the page behind doesn't shift — zero CLS).
 *   • role="dialog" + aria-modal + aria-labelledby/`-describedby`.
 *
 * Rendered through a portal to <body> so it escapes any transformed/clipped
 * ancestor (the feature cards live inside 3D-tilt + overflow-hidden wrappers).
 */
export function FeatureDetailModal({
  feature,
  open,
  onClose,
}: {
  feature: FeatureDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => setMounted(true), []);

  // Body-scroll lock + scrollbar-width compensation (no layout shift).
  React.useEffect(() => {
    if (!open) return;
    const { body, documentElement: html } = document;
    const scrollbar = window.innerWidth - html.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, [open]);

  // Escape to close + focus management (trap + restore).
  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog after the panel mounts.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (first ?? panel).focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === panel) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      // Restore focus to the element that opened the dialog.
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const Icon = feature?.icon;

  return createPortal(
    <AnimatePresence>
      {open && feature && (
        <motion.div
          key="feature-modal"
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? {} : { opacity: 1 }}
          exit={reduce ? {} : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop — click to close. Frosted + dimmed. */}
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm"
          />

          {/* Dialog panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            variants={reduce ? undefined : panelVariants}
            initial={reduce ? false : "hidden"}
            animate={reduce ? {} : "show"}
            exit={reduce ? {} : "exit"}
            className="relative z-10 m-0 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-0 shadow-[0_-8px_40px_-12px_rgba(15,23,42,0.35)] outline-none sm:m-4 sm:max-w-3xl sm:rounded-3xl sm:shadow-[0_40px_100px_-30px_rgba(15,23,42,0.5)]"
          >
            {/* Top accent edge (blue→sky→gold) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-blue-600 via-sky-500 to-amber-400"
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            >
              <IconClose className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.05fr_1fr]">
              {/* Left: copy */}
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  {feature.img ? (
                    // The bespoke BrandGlyph tile is already a finished brand
                    // app-icon — it stands alone (no IconChip wrapper).
                    <BrandGlyph name={feature.img} size="lg" />
                  ) : (
                    Icon && <IconChip icon={Icon} tone="platform" size="lg" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                    {feature.eyebrow}
                  </span>
                </div>
                <h2
                  id={titleId}
                  className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  {feature.title}
                </h2>
                <p id={descId} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {feature.long}
                </p>

                <ul className="mt-5 space-y-2.5" aria-label={`${feature.title} capabilities`}>
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-sky-500/10 ring-1 ring-blue-500/25">
                        <IconCheck className="h-3 w-3 text-blue-700" />
                      </span>
                      <span className="text-sm leading-relaxed text-foreground/90">{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                  <Button asChild variant="platform" size="lg" className="gs-sheen w-full sm:w-auto">
                    <Link href="/onboard" className="group/btn">
                      Start free
                      <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <Link href="/contact">Ask a question</Link>
                  </Button>
                </div>
              </div>

              {/* Right: the in-app preview screenshot on a tinted depth panel */}
              <div className="relative flex items-center justify-center overflow-hidden border-t border-border bg-gradient-to-br from-blue-500/[0.07] via-sky-500/[0.04] to-secondary/40 p-6 sm:p-8 md:border-l md:border-t-0">
                {/* soft radial glow behind the mock */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,rgba(37,99,235,0.14),transparent_60%)]"
                />
                {/* faint masked grid for depth */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
                />
                <div className="relative w-full max-w-sm">
                  <span className="mb-2.5 ml-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="h-2 w-2 rounded-full bg-border" />
                      <span className="h-2 w-2 rounded-full bg-border" />
                      <span className="h-2 w-2 rounded-full bg-border" />
                    </span>
                    Inside the app
                  </span>
                  {feature.preview}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
