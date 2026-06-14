"use client";

/**
 * GreekLetterField — an engaging, depth-layered background of Greek letters that
 * travel across the screen (predominantly one side to the other) at random
 * speeds, each fading gently in and out. Letters are split into three PARALLAX
 * TIERS — near (large/fast/more opaque), mid, and far (small/slow/faint) — so
 * the field reads as a sense of distance behind the UI rather than flat noise.
 *
 * Z-STACK CONTRACT: the field renders at zIndex -5 by default (`z` prop),
 * painting BEHIND pages with opaque backgrounds (portal dashboards, admin,
 * onboard wizard) and VISIBLE on pages with translucent/gradient surfaces
 * (marketing hero, login entry). This is intentional — the global instance in
 * app/layout.tsx lets the field show through on brand-awareness pages while
 * staying invisible on task-focused surfaces. Pages that want the field visible
 * MUST use transparent or semi-transparent backgrounds.
 * pointer-events-none + aria-hidden so it never touches the UI.
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
  /** Static scatter fraction (-0.5..0.5 of the travel path) used ONLY by the
   *  prefers-reduced-motion fallback so the frozen field stays scattered along
   *  each letter's would-be path instead of clustering at the midpoints. */
  scatter: number;
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
  { count: 11, sizeMin: 34, sizeRange: 22, durMin: 14, durRange: 10, opMin: 0.08, opRange: 0.04, dyAmp: 20 },
  // MID — medium size / opacity, slower
  { count: 14, sizeMin: 19, sizeRange: 14, durMin: 22, durRange: 12, opMin: 0.05, opRange: 0.03, dyAmp: 28 },
  // FAR — small, slowest, faint (the deep backdrop layer) — still visibly moving
  { count: 14, sizeMin: 12, sizeRange: 8, durMin: 32, durRange: 16, opMin: 0.03, opRange: 0.02, dyAmp: 36 },
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

function buildLetters(
  glyphs: string[],
  seed: number,
  total: number,
  damping: Damping,
  fromSides: boolean,
): Letter[] {
  const rng = makeRng(seed);
  const out: Letter[] = [];
  // Scale each tier's count to honor a caller-supplied density while keeping the
  // near/mid/far proportions intact (≥1 per tier so depth never collapses).
  const scale = total / DEFAULT_TOTAL;
  const { durMul, opMul, dyMul } = damping;

  for (const tier of TIERS) {
    const n = Math.max(1, Math.round(tier.count * scale));
    for (let i = 0; i < n; i++) {
      if (fromSides) {
        // SIDE-ENTRY mode (the demo shell): every letter's journey BEGINS just
        // off the left or right screen edge, so the fade-in (10% of the
        // timeline) lands right AT the edge — the letter visibly enters from
        // the side, drifts all the way across, and exits the far side.
        const leftToRight = rng() > 0.5; // even split — both sides feed the room
        const travel = 112 + rng() * 48; // 112–160vw: a guaranteed full cross
        const dx = leftToRight ? travel : -travel;
        // Path start sits 3–10vw outside the entry edge; the CSS keyframes
        // place the letter at (left - dx/2) at t=0, so left = start + dx/2.
        const start = leftToRight ? -(3 + rng() * 7) : 103 + rng() * 7;
        out.push({
          ch: glyphs[Math.floor(rng() * glyphs.length)],
          left: Math.round((start + dx / 2) * 10) / 10,
          top: Math.round((2 + rng() * 92) * 10) / 10,
          size: tier.sizeMin + Math.round(rng() * tier.sizeRange),
          // Crossing the full width should feel stately — 1.5× the tier pace.
          dur: Math.round((tier.durMin + rng() * tier.durRange) * 1.5 * durMul),
          dy: Math.round((rng() - 0.5) * 2 * 12 * dyMul), // gentle diagonal only
          dx: Math.round(dx),
          rot: Math.round((rng() - 0.5) * 12),
          op: Math.round((tier.opMin + rng() * tier.opRange) * opMul * 1000) / 1000,
          // Uniform phase along each letter's own cycle → at any instant some
          // letters are just entering each side, others are mid-cross.
          delay: 0, // placeholder, fixed up below (needs dur)
          scatter: Math.round((rng() - 0.5) * 0.84 * 100) / 100, // -0.42..0.42
        });
        const l = out[out.length - 1];
        l.delay = -Math.round(rng() * l.dur);
        continue;
      }
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
        scatter: 0, // legacy fields already spawn scattered; no extra offset
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
  fromSides = false,
  z = -5,
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
  /** MUCH slower + fainter — surfaces where ambient motion must never compete
   *  with reading. Wins over calm. */
  whisper?: boolean;
  /** Side-entry mode (the demo shell): every letter visibly enters from the
   *  LEFT or RIGHT screen edge, drifts the full way across, and exits the far
   *  side — at a stately 1.5× slower pace. Under prefers-reduced-motion the
   *  field freezes as a static scatter along each letter's path. */
  fromSides?: boolean;
  /** Stacking position. -5 (default) = behind opaque page backgrounds (z-0),
   *  visible only on pages with translucent/gradient surfaces. The global
   *  instance in app/layout.tsx uses this default. The MobileAppClient uses
   *  position="absolute" within a positioned container, so z doesn't matter
   *  there. */
  z?: number;
}) {
  const damping = DAMPING[whisper ? "whisper" : calm ? "calm" : "none"];
  const letters = React.useMemo(
    () => buildLetters(glyphs && glyphs.length ? glyphs : FULL_ALPHABET, seed, count, damping, !!fromSides),
    [glyphs, seed, count, damping, fromSides],
  );

  return (
    <div
      aria-hidden="true"
      className={
        `pointer-events-none ${position} inset-0 overflow-hidden ` +
        // Only fall back to the default slate ink when no brand color is supplied,
        // so a chapter-tinted field paints purely from `currentColor`.
        (color ? "" : "text-slate-700 ") +
        (className || "")
      }
      style={{ ...(color ? { color } : null), zIndex: z }}
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
              ["--gsx" as string]: `${l.scatter}`,
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
