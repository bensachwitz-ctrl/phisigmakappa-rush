"use client";

/**
 * GreekLetterField — a calm, ambient background of Greek letters that each drift
 * smoothly in their own straight-line direction (any direction), at their own
 * slow speed, fading gently in and out. Many small letters → soft texture, not
 * clutter. Sits fixed behind the nav / over the page backdrop, pointer-events-
 * none + aria-hidden, so it adds on-brand atmosphere without touching the UI.
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

function buildLetters(glyphs: string[], count: number, seed: number): Letter[] {
  const rng = makeRng(seed);
  const out: Letter[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2; // any direction
    const dist = 90 + rng() * 190; // how far it travels over its lifetime
    out.push({
      ch: glyphs[Math.floor(rng() * glyphs.length)],
      left: Math.round((-8 + rng() * 116) * 10) / 10, // -8%..108% (some enter from edges)
      top: Math.round((-8 + rng() * 116) * 10) / 10,
      size: 9 + Math.round(rng() * 26), // 9–35px (small)
      dur: 26 + Math.round(rng() * 34), // 26–60s (slow), random speeds
      delay: -Math.round(rng() * 60), // widely staggered → no synchronized "pop"
      dx: Math.round(Math.cos(angle) * dist),
      dy: Math.round(Math.sin(angle) * dist),
      rot: Math.round((rng() - 0.5) * 16),
      op: 0.035 + Math.round(rng() * 70) / 1000, // 0.035–0.105 (subtle)
    });
  }
  return out;
}

export function GreekLetterField({
  glyphs,
  count = 30,
  seed = 0x51ed270b,
  className,
}: {
  /** Override the glyph set (e.g. a chapter's Greek letters). Defaults to the full alphabet. */
  glyphs?: string[];
  count?: number;
  seed?: number;
  className?: string;
}) {
  const letters = React.useMemo(
    () => buildLetters(glyphs && glyphs.length ? glyphs : FULL_ALPHABET, count, seed),
    [glyphs, count, seed],
  );

  return (
    <div
      aria-hidden="true"
      className={
        "pointer-events-none fixed inset-0 z-[14] overflow-hidden " + (className || "")
      }
    >
      {letters.map((l, i) => (
        <span
          key={i}
          className="gs-greek-letter absolute select-none font-serif font-semibold text-slate-700"
          style={
            {
              left: `${l.left}%`,
              top: `${l.top}%`,
              fontSize: `${l.size}px`,
              lineHeight: 1,
              ["--dx" as string]: `${l.dx}px`,
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
