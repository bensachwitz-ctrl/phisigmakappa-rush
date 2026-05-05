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
        <Crest className="h-7 w-7 text-phisig-red" />
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
      <Crest
        className={cn(
          "h-9 w-9",
          variant === "white" ? "text-white" : "text-phisig-red"
        )}
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
 * Chapter heraldic crest — solid cardinal shield with three Greek-letter
 * glyphs in the chief (ΦΣΚ → stylized as three vertical "T" forms in the
 * Phi Sig wordmark tradition) and the chapter quartering below the band.
 *
 * Updated to match the chapter's official supplied crest art: bold red fill,
 * heavy white outline, three-glyph chief, three-segment quartering at the
 * base separated by a center bar.
 *
 * Pure-path SVG, no inline fonts (cross-OS-safe), inherits `currentColor`
 * for the fill so the same component works in red on white pages and in
 * white on red sections (hero, footer-on-dark, etc.) without re-export.
 */
export function Crest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Solid shield body — single fill so the mark reads at every size,
          including 16×16 favicon. White outline gives separation against
          dark photo backgrounds without a second pass. */}
      <path
        d="M32 2 L60 10 V28 C60 46 47 58 32 62 C17 58 4 46 4 28 V10 Z"
        fill="currentColor"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Inner shield highlight ring — subtle separation between body and
          chief band. Hairline, .25 opacity, only visible on >32px renders. */}
      <path
        d="M32 6 L56 13 V28 C56 43 45 54 32 58 C19 54 8 43 8 28 V13 Z"
        fill="none"
        stroke="white"
        strokeWidth="0.6"
        strokeOpacity="0.35"
      />

      {/* Three-glyph chief — Greek-letter abbreviations of the chapter,
          stylized as bold T-forms in the heraldic tradition of the supplied
          art. Each glyph has a horizontal cap and a vertical stem. */}
      {[
        { x: 16 },
        { x: 32 },
        { x: 48 },
      ].map(({ x }) => (
        <g key={x}>
          {/* Cap */}
          <rect
            x={x - 5}
            y={14}
            width={10}
            height={2.4}
            fill="white"
            rx="0.4"
          />
          {/* Stem */}
          <rect
            x={x - 1.2}
            y={16}
            width={2.4}
            height={9}
            fill="white"
            rx="0.4"
          />
        </g>
      ))}

      {/* Mid horizontal divider — separates chief glyphs from base quartering */}
      <rect x="6" y="32.5" width="52" height="2" fill="white" />

      {/* Base quartering — three white dividers radiating from the center
          to give the lower half its segmented look (matches the chapter's
          official crest panel pattern). */}
      <path d="M32 35 L32 60" stroke="white" strokeWidth="2" />
      <path d="M32 47 L8 47" stroke="white" strokeWidth="2" />
      <path d="M32 47 L56 47" stroke="white" strokeWidth="2" />
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
