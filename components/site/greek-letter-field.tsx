"use client";

/**
 * GreekLetterField — an engaging, depth-layered background of Greek letters that
 * travel across the screen (predominantly one side to the other) at random
 * speeds, each fading gently in and out. Letters are split into three PARALLAX
 * TIERS — near (large/fast/more opaque), mid, and far (small/slow/faint) — so
 * the field reads as a sense of distance behind the UI rather than flat noise.
 * Sits fixed over the page (incl. the white cards) as a tasteful animated
 * texture; pointer-events-none + aria-hidden so it never touches the UI.
 *
 * Travel: each letter starts at a scattered position INCLUDING off-screen edges
 * and crosses to the far side via a large horizontal `--dx` (with a small
 * vertical `--dy` wobble), so it appears to enter → cross → exit. Most go
 * left→right; a minority go right→left for variety.
 *
 * Determinism: layout generated once with a seeded PRNG (not Math.random) so SSR
 * === CSR (no hydration mismatch). Motion is pure transform/opacity (GPU), linear
 * + long-duration = smooth (never "spazzy"), and is disabled under
 * prefers-reduced-motion (letters become a faint static wash).
 *
 * `glyphs` can be overridden so a TENANT site can drift ITS chapter's letters
 * (e.g. "ΦΣΚ") instead of the full alphabet.
 */

import React from "react";

const FULL_ALPHABET =
  "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω".split("");

function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Letter = {
  ch: string;
  left: number;
  top: number;
  size: number;
  dur: number;
  delay: number;
  dx: number;
  dy: number;
  rot: number;
  op: number;
};

/**
 * Per-tier ranges. Size ↔ opacity ↔ speed are correlated so the field reads as
 * parallax depth: NEAR letters are big, fast (short dur) and most opaque; FAR
 * letters are small, slow (long dur) and faint.
 */
type Tier = {
  count: number;
  sizeMin: number;
  sizeRange: number;
  durMin: number;
  durRange: number;
  opMin: number;
  opRange: number;
  /** vertical wobble amplitude (px) over the journey */
  dyAmp: number;
};

const TIERS: Tier[] = [
  // NEAR — large, most visible. Durations are LONG (slow, calm drift) so the
  // field reads as a serene texture, never a busy/distracting swarm. Opacity
  // tuned to clearly read as drifting letters on the marketing bg while staying
  // well under card text.
  { count: 11, sizeMin: 30, sizeRange: 18, durMin: 34, durRange: 18, opMin: 0.15, opRange: 0.07, dyAmp: 44 },
  // MID — medium size / opacity, slower still
  { count: 14, sizeMin: 17, sizeRange: 12, durMin: 50, durRange: 22, opMin: 0.10, opRange: 0.05, dyAmp: 64 },
  // FAR — small, very slow, faint (the deep backdrop layer)
  { count: 14, sizeMin: 10, sizeRange: 7, durMin: 74, durRange: 32, opMin: 0.05, opRange: 0.04, dyAmp: 86 },
];

/** A calmer multiplier set applied when `calm` is requested (the demo): even
 *  slower drift + softer opacity so the chapter shell is easy to read/interact. */
const CALM = { durMul: 1.4, opMul: 0.7, dyMul: 0.7 } as const;

/** Total letters at full density (sum of tier counts). */
const DEFAULT_TOTAL = TIERS.reduce((n, t) => n + t.count, 0); // 44

function buildLetters(glyphs: string[], seed: number, total: number, calm: boolean): Letter[] {
  const rng = makeRng(seed);
  const out: Letter[] = [];
  // Scale each tier's count to honor a caller-supplied density while keeping the
  // near/mid/far proportions intact (≥1 per tier so depth never collapses).
  const scale = total / DEFAULT_TOTAL;
  const durMul = calm ? CALM.durMul : 1;
  const opMul = calm ? CALM.opMul : 1;
  const dyMul = calm ? CALM.dyMul : 1;

  for (const tier of TIERS) {
    const n = Math.max(1, Math.round(tier.count * scale));
    for (let i = 0; i < n; i++) {
      // Direction: ~75% travel left→right, ~25% right→left (variety).
      const leftToRight = rng() > 0.25;
      // How far across the viewport it travels (vw). Enough to fully cross +
      // exit regardless of where it started.
      const travel = 120 + rng() * 60; // 120–180vw of horizontal motion
      const dx = leftToRight ? travel : -travel;
      // Start scattered, including off-screen edges, biased to the entry side so
      // it visibly enters → crosses → exits.
      const left = leftToRight
        ? Math.round((-22 + rng() * 100) * 10) / 10 // -22%..78% (enters from left/mid)
        : Math.round((22 + rng() * 100) * 10) / 10; //  22%..122% (enters from right/mid)
      out.push({
        ch: glyphs[Math.floor(rng() * glyphs.length)],
        left,
        top: Math.round((-6 + rng() * 112) * 10) / 10, // vary vertical position, -6%..106%
        size: tier.sizeMin + Math.round(rng() * tier.sizeRange),
        dur: Math.round((tier.durMin + rng() * tier.durRange) * durMul), // random speeds within tier
        delay: -Math.round(rng() * 80), // widely staggered → no synchronized "pop"
        dx: Math.round(dx),
        dy: Math.round((rng() - 0.5) * 2 * tier.dyAmp * dyMul), // gentle vertical wobble
        rot: Math.round((rng() - 0.5) * 12),
        op: Math.round((tier.opMin + rng() * tier.opRange) * opMul * 1000) / 1000,
      });
    }
  }

  return out;
}

export function GreekLetterField({
  glyphs,
  count = DEFAULT_TOTAL,
  seed = 0x51ed270b,
  className,
  color,
  position = "fixed",
  calm = false,
}: {
  /** Override the glyph set (e.g. a chapter's Greek letters). Defaults to the full alphabet. */
  glyphs?: string[];
  /** Total letter density across all three depth tiers (defaults to the full 44). */
  count?: number;
  seed?: number;
  className?: string;
  /** Tint the drifting letters (e.g. a chapter's primary brand color). Defaults
   *  to the neutral slate ink used on the marketing site. Letters inherit
   *  `currentColor` so this paints the whole field in one go. */
  color?: string;
  /** `fixed` (viewport-pinned, default — used by the marketing site) or
   *  `absolute` (pinned to the nearest positioned ancestor — used inside the
   *  demo's brand-themed shell so the field stays within the demo container). */
  position?: "fixed" | "absolute";
  /** Even slower drift + softer opacity — used inside the demo so the chapter
   *  shell stays calm + easy to read/interact with. */
  calm?: boolean;
}) {
  const letters = React.useMemo(
    () => buildLetters(glyphs && glyphs.length ? glyphs : FULL_ALPHABET, seed, count, calm),
    [glyphs, seed, count, calm],
  );

  return (
    <div
      aria-hidden="true"
      className={
        `pointer-events-none ${position} inset-0 -z-10 overflow-hidden ` +
        // Only fall back to the default slate ink when no brand color is supplied,
        // so a chapter-tinted field paints purely from `currentColor`.
        (color ? "" : "text-slate-700 ") +
        (className || "")
      }
      style={color ? { color } : undefined}
    >
      {letters.map((l, i) => (
        <span
          key={i}
          className="gs-greek-letter absolute select-none font-serif font-semibold"
          style={
            {
              left: `${l.left}%`,
              top: `${l.top}%`,
              fontSize: `${l.size}px`,
              lineHeight: 1,
              ["--dx" as string]: `${l.dx}vw`,
              ["--dy" as string]: `${l.dy}px`,
              ["--gr" as string]: `${l.rot}deg`,
              ["--go" as string]: `${l.op}`,
              ["--dur" as string]: `${l.dur}s`,
              ["--delay" as string]: `${l.delay}s`,
            } as React.CSSProperties
          }
        >
          {l.ch}
        </span>
      ))}
    </div>
  );
}

export default GreekLetterField;
