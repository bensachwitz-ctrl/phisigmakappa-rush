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
 * and crosses to the far side via a large horizontal `--dx` plus a randomized
 * vertical `--dy` (in vh) — so every letter follows its own random diagonal,
 * entering → crossing → exiting. Most go left→right; a minority right→left.
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
  /** vertical travel amplitude (vh) over the journey — the random path angle */
  dyAmp: number;
};

const TIERS: Tier[] = [
  // NEAR — large, most visible, and FAST enough that the traversal clearly
  // reads as letters drifting across the screen (owner feedback: the field
  // must visibly travel, not sit as a near-static texture). Opacity tuned to
  // clearly read on the marketing bg while staying well under card text.
  { count: 11, sizeMin: 34, sizeRange: 22, durMin: 14, durRange: 10, opMin: 0.26, opRange: 0.10, dyAmp: 20 },
  // MID — medium size / opacity, slower
  { count: 14, sizeMin: 19, sizeRange: 14, durMin: 22, durRange: 12, opMin: 0.17, opRange: 0.07, dyAmp: 28 },
  // FAR — small, slowest, faint (the deep backdrop layer) — still visibly moving
  { count: 14, sizeMin: 12, sizeRange: 8, durMin: 32, durRange: 16, opMin: 0.09, opRange: 0.06, dyAmp: 36 },
];

/** Damping presets. `calm` (chapter sites / onboard): slightly slower + softer,
 *  still clearly traveling. `whisper` (the interactive DEMO shell): much slower
 *  + much fainter — the demo is for INTERACTING, so its ambient motion budget is
 *  a fraction of the marketing site's (owner round-5: "moves too much"). */
type Damping = { durMul: number; opMul: number; dyMul: number };
const DAMPING: Record<"none" | "calm" | "whisper", Damping> = {
  none: { durMul: 1, opMul: 1, dyMul: 1 },
  calm: { durMul: 1.35, opMul: 0.8, dyMul: 1 },
  whisper: { durMul: 2.3, opMul: 0.5, dyMul: 0.65 },
};

/** Total letters at full density (sum of tier counts). */
const DEFAULT_TOTAL = TIERS.reduce((n, t) => n + t.count, 0); // 44

function buildLetters(glyphs: string[], seed: number, total: number, damping: Damping): Letter[] {
  const rng = makeRng(seed);
  const out: Letter[] = [];
  // Scale each tier's count to honor a caller-supplied density while keeping the
  // near/mid/far proportions intact (≥1 per tier so depth never collapses).
  const scale = total / DEFAULT_TOTAL;
  const { durMul, opMul, dyMul } = damping;

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
        delay: -Math.round(rng() * 48), // widely staggered → no synchronized "pop"
        dx: Math.round(dx),
        dy: Math.round((rng() - 0.5) * 2 * tier.dyAmp * dyMul), // randomized path angle (vh of vertical travel)
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
  whisper = false,
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
  /** Slightly slower drift + softer opacity — chapter sites / onboard. */
  calm?: boolean;
  /** MUCH slower + fainter — the interactive demo shell, where the visitor is
   *  reading and tapping and ambient motion must never compete. Wins over calm. */
  whisper?: boolean;
}) {
  const damping = DAMPING[whisper ? "whisper" : calm ? "calm" : "none"];
  const letters = React.useMemo(
    () => buildLetters(glyphs && glyphs.length ? glyphs : FULL_ALPHABET, seed, count, damping),
    [glyphs, seed, count, damping],
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
              ["--dy" as string]: `${l.dy}vh`,
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
