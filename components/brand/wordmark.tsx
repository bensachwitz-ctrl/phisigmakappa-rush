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
          "inline-flex items-center gap-2 font-display text-base font-semibold tracking-tight",
          className
        )}
      >
        <Crest className="h-7 w-7 text-phisig-red" />
        <span>ΦΣΚ</span>
        <span className="text-muted-foreground font-normal text-sm">USC</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 font-display tracking-tight",
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
        <span className="text-[11px] uppercase tracking-[0.22em] opacity-70">
          Phi Sigma Kappa
        </span>
        <span className="text-base font-semibold">University of South Carolina</span>
      </span>
    </span>
  );
}

/**
 * Heraldic shield mark — three stars in chief, lamp of knowledge.
 * Pure-path, no inline OS-font text (was Georgia, an inconsistency a senior
 * designer rightly flagged across 18+ duplications). Kept symbolic and quiet
 * so the lockup pairs cleanly with any nearby typography.
 */
export function Crest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Shield outline */}
      <path
        d="M32 2 L60 11 V30 C60 47 47 58 32 62 C17 58 4 47 4 30 V11 Z"
        stroke="currentColor"
        strokeWidth="2.4"
        fill="currentColor"
        fillOpacity="0.06"
      />
      {/* Chief band */}
      <path
        d="M5 14 L59 14 L59 21 L5 21 Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      {/* Three stars in chief */}
      {[18, 32, 46].map((x) => (
        <path
          key={x}
          d={`M ${x} 14.5 l 1 2 2.2 .3 -1.6 1.55 .4 2.2 -2 -1 -2 1 .4 -2.2 -1.6 -1.55 2.2 -.3 z`}
          fill="currentColor"
        />
      ))}
      {/* Lamp body */}
      <path d="M28 36 L36 36 L37 41 L27 41 Z" fill="currentColor" fillOpacity="0.9" />
      {/* Lamp flame */}
      <path
        d="M32 28 C30 30 30 33 32 35 C34 33 34 30 32 28 Z"
        fill="currentColor"
      />
      {/* Bottom ribbon line */}
      <line x1="14" y1="48" x2="50" y2="48" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <line x1="20" y1="52" x2="44" y2="52" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
    </svg>
  );
}

export function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 220" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="seal-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8102E" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#C8102E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="seal-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FCE8EC" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="108" fill="url(#seal-glow)" />
      <circle cx="110" cy="110" r="86" fill="url(#seal-fill)" stroke="#C8102E" strokeWidth="1.6" />
      <circle cx="110" cy="110" r="74" fill="none" stroke="#C8102E" strokeWidth="0.6" opacity="0.55" />

      {/* Stars */}
      {[
        [110, 56], [78, 78], [142, 78],
      ].map(([cx, cy]) => (
        <path
          key={`${cx}-${cy}`}
          d={`M ${cx} ${cy - 6} l 1.6 4.6 4.8 0 -3.9 2.9 1.5 4.6 -4 -2.8 -4 2.8 1.5 -4.6 -3.9 -2.9 4.8 0 z`}
          fill="#C8102E"
        />
      ))}

      {/* Lamp */}
      <path d="M96 124 H124 L127 134 H93 Z" fill="#C8102E" />
      <path
        d="M110 102 C104 108 104 116 110 122 C116 116 116 108 110 102 Z"
        fill="#C8102E"
      />

      <text
        x="110"
        y="158"
        textAnchor="middle"
        fontFamily='ui-serif, "Iowan Old Style", "Apple Garamond", "Source Serif Pro", "Times New Roman", serif'
        fontWeight="700"
        fontSize="34"
        fill="#C8102E"
        letterSpacing="2"
      >
        ΦΣΚ
      </text>
      <text
        x="110"
        y="178"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="8"
        letterSpacing="3"
        fill="#0B0B0C"
        opacity="0.55"
      >
        FOUNDED 1873
      </text>

      {/* Outer ring text */}
      <defs>
        <path
          id="ring-path"
          d="M 110,110 m -96,0 a 96,96 0 1,1 192,0 a 96,96 0 1,1 -192,0"
        />
      </defs>
      <text fontFamily="Inter, sans-serif" fontSize="9" letterSpacing="6" fill="#0B0B0C" opacity="0.55">
        <textPath href="#ring-path" startOffset="2%">
          PHI SIGMA KAPPA · UNIVERSITY OF SOUTH CAROLINA · ETA-PENTATON ·
        </textPath>
      </text>
    </svg>
  );
}
