"use client";

/**
 * GreekLetterField — a decorative, full-viewport background of Greek letters
 * that drift slowly UP across the whole screen, each at a different size and
 * speed, fading in and out. Sits fixed behind all content (-z-10,
 * pointer-events-none, aria-hidden) so it adds depth without ever competing
 * with or blocking the UI.
 *
 * Determinism: the letter layout is generated once at module load with a SEEDED
 * PRNG (not Math.random), so the server and client render identical markup —
 * no hydration mismatch. Motion is pure transform/opacity (GPU-friendly) and is
 * disabled under prefers-reduced-motion (letters become a faint static wash).
 */

import React from "react";

const GLYPHS = [
  "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Λ", "Ξ",
  "Π", "Σ", "Φ", "Ψ", "Ω", "Φ", "Σ", "Δ", "Θ", "Λ",
  "α", "β", "γ", "δ", "θ", "λ", "μ", "π", "σ", "φ", "ψ", "ω",
];

// mulberry32 — tiny deterministic PRNG so SSR === CSR (no Math.random).
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
  left: number; // %
  top: number; // %
  size: number; // px
  dur: number; // s
  delay: number; // s (negative → already mid-flight at load)
  dx: number; // px horizontal drift
  dy: number; // px vertical drift (negative = up)
  rot: number; // deg
  op: number; // peak opacity
};

const COUNT = 34;

const LETTERS: Letter[] = (() => {
  const rng = makeRng(0x9e3779b9);
  const out: Letter[] = [];
  for (let i = 0; i < COUNT; i++) {
    const size = 16 + Math.round(rng() * 70); // 16–86px (varied sizes)
    out.push({
      ch: GLYPHS[Math.floor(rng() * GLYPHS.length)],
      left: Math.round(rng() * 1000) / 10, // 0–100%
      top: Math.round(rng() * 1000) / 10,
      size,
      dur: 16 + Math.round(rng() * 30), // 16–46s (varied speeds)
      delay: -Math.round(rng() * 46), // staggered, already in-flight
      dx: Math.round((rng() - 0.35) * 90), // mostly slight rightward
      dy: -(90 + Math.round(rng() * 150)), // ALWAYS up → one direction
      rot: Math.round((rng() - 0.5) * 24),
      op: 0.05 + Math.round(rng() * 80) / 1000, // 0.05–0.13 (subtle over content)
    });
  }
  return out;
})();

export function GreekLetterField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[15] overflow-hidden"
    >
      {LETTERS.map((l, i) => (
        <span
          key={i}
          className="gs-greek-letter absolute select-none font-serif font-semibold text-slate-800"
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
