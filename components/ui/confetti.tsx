"use client";

import * as React from "react";

/**
 * ConfettiPayoff — a one-shot celebratory burst for genuine "you did it" moments
 * (dues paid, bid accepted, site provisioned). Every surface that fires it lives
 * inside a chapter-branded context, so the shards default to the CHAPTER's own
 * palette — its brand primary + a darker tone of it + a warm gilt + crisp white —
 * read live from the injected `--brand-primary*` CSS vars (see app/layout.tsx).
 * That makes the celebration feel tailored: a garnet chapter rains garnet, a
 * royal-blue chapter rains blue. Callers may still pass an explicit `colors`
 * array to override (e.g. a fixed gold for the platform onboarding finish).
 *
 * Fully reduced-motion-safe: if the user prefers reduced motion we render nothing
 * (a falling-shard field has no meaningful static form, so the correct reduced
 * treatment is to omit it — the surrounding success copy already conveys the win).
 */

/** Resolve a CSS custom property to a concrete color, with a fallback. Runs only
 *  in the browser (post-mount), so getComputedStyle is always available. */
function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function ConfettiPayoff({ colors }: { colors?: string[] } = {}) {
  const [shards, setShards] = React.useState<Array<{
    id: number;
    color: string;
    left: string;
    delay: string;
    duration: string;
    size: string;
    rotation: string;
    shape: "rect" | "circle" | "triangle";
    drift: string;
    rotationSpeed: string;
  }>>([]);

  React.useEffect(() => {
    // Reduced motion media query check — omit entirely (a falling field has no
    // meaningful still frame; the success copy carries the moment instead).
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    // Per-chapter palette: brand primary + its dark variant (both injected by
    // layout.tsx, fall back to cardinal) + a warm gilt + white. This makes the
    // burst match the chapter the user is actually in. An explicit `colors`
    // prop wins when provided.
    const palette =
      colors && colors.length > 0
        ? colors
        : [
            readVar("--brand-primary", "#C8102E"),
            readVar("--brand-primary-dark", "#A20D26"),
            "#F59E0B", // gilt — the universal "celebration" warm
            "#FBBF24", // bright gilt
            "#FFFFFF", // crisp white sparkle
          ];

    const shapes: Array<"rect" | "circle" | "triangle"> = ["rect", "circle", "triangle"];
    const newShards = Array.from({ length: 80 }).map((_, i) => {
      const sizeNum = 6 + Math.random() * 10;
      return {
        id: i,
        color: palette[Math.floor(Math.random() * palette.length)],
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3.5}s`,
        duration: `${2.5 + Math.random() * 3.5}s`,
        size: `${sizeNum}px`,
        rotation: `${Math.random() * 360}deg`,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        drift: `${-60 + Math.random() * 120}px`,
        rotationSpeed: `${360 + Math.random() * 360}deg`,
      };
    });
    setShards(newShards);
  }, [colors]);

  if (shards.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gs-confetti-fall {
          0% {
            transform: translateY(-5vh) rotate(0deg) translateX(0);
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(var(--gs-confetti-rotation)) translateX(var(--gs-confetti-drift));
            opacity: 0;
          }
        }
      `}} />
      {shards.map((shard) => {
        const style: React.CSSProperties = {
          position: "absolute",
          top: "-5vh",
          left: shard.left,
          width: shard.shape === "triangle" ? 0 : shard.size,
          height: shard.shape === "triangle" ? 0 : shard.size,
          backgroundColor: shard.shape !== "triangle" ? shard.color : undefined,
          borderLeft: shard.shape === "triangle" ? `${parseFloat(shard.size) / 2}px solid transparent` : undefined,
          borderRight: shard.shape === "triangle" ? `${parseFloat(shard.size) / 2}px solid transparent` : undefined,
          borderBottom: shard.shape === "triangle" ? `${shard.size} solid ${shard.color}` : undefined,
          borderRadius: shard.shape === "circle" ? "50%" : undefined,
          animation: `gs-confetti-fall ${shard.duration} linear ${shard.delay} forwards`,
          opacity: 0,
          transform: `rotate(${shard.rotation})`,
          // Pass custom CSS variables
          ["--gs-confetti-drift" as any]: shard.drift,
          ["--gs-confetti-rotation" as any]: shard.rotationSpeed,
        };
        return <div key={shard.id} style={style} />;
      })}
    </div>
  );
}
