import { useId } from "react";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact" | "white";
}) {
  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 text-base font-semibold tracking-tight",
          className
        )}
      >
        {/* Real Phi Sigma Kappa shield — pre-cropped to show only the shield
            silhouette (the source modern brand JPG had "PHI SIGMA KAPPA" text
            stacked below the shield; that text was visible in earlier crops
            because object-contain couldn't push it out of the small nav box).
            phisigmakappa-shield-only.jpg is 150×132, tight bounds. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/phisigmakappa-shield-only.jpg"
          alt="Phi Sigma Kappa"
          width={28}
          height={28}
          className="h-7 w-auto object-contain"
        />
        <span className="font-display">ΦΣΚ</span>
        <span className="text-muted-foreground font-normal text-sm">USC</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 tracking-tight",
        variant === "white" ? "text-white" : "text-foreground",
        className
      )}
    >
      {/* Real Phi Sig shield — pre-cropped (150×132, shield only, no text). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/phisigmakappa-shield-only.jpg"
        alt="Phi Sigma Kappa"
        width={36}
        height={36}
        className="h-9 w-auto object-contain"
      />
      <span className="flex flex-col leading-none">
        <span className="text-[11px] uppercase tracking-[0.22em] opacity-70 font-medium">
          Phi Sigma Kappa
        </span>
        <span className="text-base font-semibold font-display">University of South Carolina</span>
      </span>
    </span>
  );
}

/**
 * Phi Sigma Kappa Gamma Triton crest — drawn to match the chapter's
 * supplied artwork exactly:
 *
 *   • Pointed-base cardinal shield, white outline.
 *   • Three small white five-pointed stars sitting high in the chief —
 *     the founding triad / three cardinal principles (Brotherhood,
 *     Scholarship, Character).
 *   • Single white sphinx silhouette occupying the lower body. Phi Sig's
 *     classical totem since 1873. Couchant pose, head facing right,
 *     nemes headdress — drawn as one continuous shape so it stays
 *     legible at 16-px favicon size.
 *   • "1873" in serif red script at the very bottom of the shield —
 *     no separate banner, the text floats directly on the cardinal
 *     ground beneath the sphinx.
 *
 * Pure-path SVG, no inline fonts beyond the year stamp. Inherits
 * `currentColor` for the shield fill so the same component works red on
 * white pages and white on red sections without a re-export.
 */
export function Crest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 72" fill="none" className={className} aria-hidden="true">
      {/* Shield body — flat-topped, slightly wider shoulders, sharp point
          at the base. Matches the silhouette in the supplied artwork. */}
      <path
        d="M 8 6
           L 56 6
           L 56 38
           C 56 50 49 60 32 70
           C 15 60 8 50 8 38
           Z"
        fill="currentColor"
        stroke="white"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* Three small five-pointed stars high in the chief, evenly spaced.
          Smaller and tighter than my prior version to match the supplied
          artwork's proportions. */}
      {[20, 32, 44].map((cx) => (
        <path
          key={`star-${cx}`}
          d={`M ${cx} 13
              l 0.78 2.40
              l 2.52 0
              l -2.04 1.49
              l 0.78 2.40
              l -2.04 -1.48
              l -2.04 1.48
              l 0.78 -2.40
              l -2.04 -1.49
              l 2.52 0
              z`}
          fill="white"
        />
      ))}

      {/* Sphinx — single continuous silhouette, couchant (lying), facing
          right, with the angular nemes headdress reading as a stepped
          profile. One path keeps it crisp at every render size. */}
      <path
        d="M 14 48
           L 14 44
           C 14 38 19 35 26 35
           L 32 35
           C 34 35 35 33 35 31
           L 35 26
           L 41 26
           L 41 31
           L 44 28
           L 47 28
           L 47 36
           L 44 36
           L 42 38
           L 42 41
           C 42 43 41 44 39 44
           L 33 44
           L 33 48
           Z"
        fill="white"
      />

      {/* Founding year — red serif, sits below the sphinx on the cardinal
          ground (no separate ribbon, matching the supplied artwork). */}
      <text
        x="32"
        y="56"
        textAnchor="middle"
        fontFamily='ui-serif, Georgia, "Times New Roman", serif'
        fontSize="6"
        fontWeight="700"
        fontStyle="italic"
        fill="white"
        letterSpacing="1"
      >
        1873
      </text>
    </svg>
  );
}

export function Seal({ className }: { className?: string }) {
  // Per-instance unique ID suffix. Seal is rendered in multiple places on the
  // homepage (hero + footer collage); without unique IDs the gradient/textPath
  // refs collide as duplicate-ID violations and Safari/Firefox can render the
  // wrong fill on the second instance. useId() works in server components.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glowId = `seal-glow-${uid}`;
  const fillId = `seal-fill-${uid}`;
  const ringId = `ring-path-${uid}`;
  return (
    <svg viewBox="0 0 220 220" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8102E" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#C8102E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FCEFF1" />
        </linearGradient>
        <path
          id={ringId}
          d="M 110,110 m -96,0 a 96,96 0 1,1 192,0 a 96,96 0 1,1 -192,0"
        />
      </defs>
      <circle cx="110" cy="110" r="108" fill={`url(#${glowId})`} />
      <circle cx="110" cy="110" r="86" fill={`url(#${fillId})`} stroke="#C8102E" strokeWidth="1.6" />
      <circle cx="110" cy="110" r="74" fill="none" stroke="#C8102E" strokeWidth="0.6" opacity="0.55" />

      {/* Stars */}
      {[
        [110, 56], [78, 78], [142, 78],
      ].map(([cx, cy]) => (
        <path
          key={`${cx}-${cy}`}
          d={`M ${cx} ${cy - 6} l 1.6 4.6 4.8 0 -3.9 2.9 1.5 4.6 -4 -2.8 -4 2.8 1.5 -4.6 -3.9 -2.9 4.8 0 z`}
          fill="currentColor"
        />
      ))}

      {/* Lamp */}
      <path d="M96 124 H124 L127 134 H93 Z" fill="currentColor" />
      <path
        d="M110 102 C104 108 104 116 110 122 C116 116 116 108 110 102 Z"
        fill="currentColor"
      />

      <text
        x="110"
        y="158"
        textAnchor="middle"
        fontFamily='ui-serif, "Iowan Old Style", "Apple Garamond", "Source Serif Pro", "Times New Roman", serif'
        fontWeight="700"
        fontSize="34"
        fill="currentColor"
        letterSpacing="2"
      >
        ΦΣΚ
      </text>
      <text
        x="110"
        y="178"
        textAnchor="middle"
        fontFamily='ui-serif, "Iowan Old Style", "Apple Garamond", "Source Serif Pro", Cambria, "Times New Roman", serif'
        fontSize="8"
        letterSpacing="3"
        fill="#0B0B0C"
        opacity="0.55"
      >
        FOUNDED 1873
      </text>

      <text fontFamily="Inter, sans-serif" fontSize="9" letterSpacing="6" fill="#0B0B0C" opacity="0.55">
        <textPath href={`#${ringId}`} startOffset="2%">
          PHI SIGMA KAPPA · UNIVERSITY OF SOUTH CAROLINA · GAMMA TRITON ·
        </textPath>
      </text>
    </svg>
  );
}
