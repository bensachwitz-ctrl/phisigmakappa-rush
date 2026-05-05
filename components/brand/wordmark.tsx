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
 * Phi Sigma Kappa heraldic crest — chapter-color (cardinal) shield with the
 * fraternity's authentic symbolic elements:
 *
 *   • Three five-pointed stars in chief — represents the founding triad
 *     (3 cardinal principles: Brotherhood, Scholarship, Character) and the
 *     six founders (each star reflects a pair). Stars in chief are the most
 *     recognizable element of the Phi Sig coat of arms.
 *   • Crescent moon — one of Phi Sig's two visible totems (the moon is the
 *     "visible" totem; the skull-and-crossbones is the private one).
 *   • Sphinx silhouette in the base — Phi Sig's classical totem since 1873,
 *     symbolizing wisdom, the pursuit of knowledge, and the secrets of the
 *     fraternity. Stylized geometric profile so it reads at favicon sizes.
 *   • "1873" in a banner at the very bottom — founding year at Mass Ag.
 *
 * Pure-path SVG, no inline fonts (cross-OS-safe). Inherits `currentColor`
 * for the shield fill so the same component works in red on white pages
 * and white on red sections without a re-export.
 */
export function Crest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Solid shield body — single fill so the mark reads at every size,
          including 16×16 favicon. */}
      <path
        d="M32 2 L60 10 V28 C60 46 47 58 32 62 C17 58 4 46 4 28 V10 Z"
        fill="currentColor"
        stroke="white"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Inner highlight ring */}
      <path
        d="M32 5.5 L57 12.5 V28 C57 44 45.5 55 32 59 C18.5 55 7 44 7 28 V12.5 Z"
        fill="none"
        stroke="white"
        strokeWidth="0.5"
        strokeOpacity="0.45"
      />

      {/* Chief band — the upper section that holds the three stars */}
      <path
        d="M7 12.5 L57 12.5 L57 22.5 L7 22.5 Z"
        fill="white"
        fillOpacity="0.14"
      />

      {/* Three five-pointed stars in chief — founding triad. Geometry: each
          star is centered at (cx, 17.5) with arms of radius 3.2. */}
      {[16, 32, 48].map((cx) => (
        <path
          key={`star-${cx}`}
          d={`M ${cx} 14.3
              l 0.95 2.92
              l 3.07 0
              l -2.49 1.81
              l 0.95 2.92
              l -2.48 -1.80
              l -2.48 1.80
              l 0.95 -2.92
              l -2.49 -1.81
              l 3.07 0
              z`}
          fill="white"
        />
      ))}

      {/* Crescent moon — bottom-left field, behind the sphinx. Subtle so it
          doesn't compete with the central totem. */}
      <path
        d="M 12 38
           A 7 7 0 1 0 12 51
           A 5 5 0 1 1 12 38 Z"
        fill="white"
        fillOpacity="0.55"
      />

      {/* Sphinx silhouette — Phi Sig's classical totem. Stylized profile:
          the body is a couchant (lying) form with the head and chest
          rising on the right, paws extended forward. Pure path so it
          stays crisp at small sizes. */}
      <g transform="translate(0,0)">
        {/* Body / haunch */}
        <path
          d="M 22 50
             C 22 44 25 41 30 40
             L 40 40
             C 43 40 45 42 45 45
             L 45 50
             Z"
          fill="white"
        />
        {/* Front paws extending forward */}
        <path
          d="M 22 50 L 22 53 L 28 53 L 28 50 Z"
          fill="white"
        />
        <path
          d="M 30 50 L 30 53 L 36 53 L 36 50 Z"
          fill="white"
        />
        {/* Headdress / nemes — angular Egyptian profile */}
        <path
          d="M 38 40
             L 38 32
             L 41 30
             L 44 30
             L 47 32
             L 47 40
             L 45 40
             Z"
          fill="white"
        />
        {/* Pointed nemes wing (pharaonic side flap) */}
        <path
          d="M 38 40 L 36 43 L 38 43 Z"
          fill="white"
        />
        {/* Eye notch (negative space cut into the headdress for character) */}
        <circle cx="44" cy="35" r="0.8" fill="currentColor" />
      </g>

      {/* Bottom banner with the founding year. Banner shape = trapezoid
          with notched ends to read as a heraldic ribbon. */}
      <path
        d="M 12 54
           L 52 54
           L 50 60
           L 14 60
           Z"
        fill="white"
      />
      <text
        x="32"
        y="58.7"
        textAnchor="middle"
        fontFamily='ui-serif, Georgia, "Times New Roman", serif'
        fontSize="4.6"
        fontWeight="700"
        fill="currentColor"
        letterSpacing="0.6"
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
