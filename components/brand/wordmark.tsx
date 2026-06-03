"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { useChapterIdentity } from "./chapter-identity-context";

export function Wordmark({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact" | "white";
}) {
  const {
    fraternityName,
    fraternityShort,
    greekLetters,
    greekLettersGlyphs,
    schoolName,
    schoolShort,
    fraternityLetters,
  } = useChapterIdentity();

  const isPhiSig = fraternityName.toLowerCase().includes("phi sigma kappa");

  const renderGenericShield = (size = 36) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className="text-primary flex-shrink-0"
      aria-hidden="true"
    >
      <path
        d="M18 2 L32 6 L32 20 C32 28 25 32 18 34 C11 32 4 28 4 20 L4 6 Z"
        fill="currentColor"
        stroke="white"
        strokeWidth="1.5"
      />
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="bold"
        fontFamily="var(--font-sans), sans-serif"
      >
        {fraternityLetters ? fraternityLetters.charAt(0) : "G"}
      </text>
    </svg>
  );

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 text-base font-semibold tracking-tight",
          className
        )}
      >
        {isPhiSig ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/brand/phisigmakappa-shield-only.jpg"
            alt={fraternityName}
            width={28}
            height={28}
            className="h-7 w-auto object-contain"
          />
        ) : (
          renderGenericShield(28)
        )}
        <span className="font-display">{fraternityLetters}</span>
        <span className="text-muted-foreground font-normal text-sm">{schoolShort}</span>
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
      {isPhiSig ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/brand/phisigmakappa-shield-only.jpg"
          alt={fraternityName}
          width={36}
          height={36}
          className="h-9 w-auto object-contain"
        />
      ) : (
        renderGenericShield(36)
      )}
      <span className="flex flex-col leading-none">
        <span className="text-[11px] uppercase tracking-[0.22em] opacity-70 font-medium">
          {fraternityName}
        </span>
        <span className="text-base font-semibold font-display">{schoolName}</span>
      </span>
    </span>
  );
}

export function Crest({ className }: { className?: string }) {
  const { foundingYear } = useChapterIdentity();
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
          Smaller and tighter than prior version to match proportions. */}
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
        {foundingYear}
      </text>
    </svg>
  );
}

export function Seal({ className }: { className?: string }) {
  const {
    fraternityName,
    schoolName,
    greekLetters,
    foundingYear,
    fraternityLetters,
  } = useChapterIdentity();

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glowId = `seal-glow-${uid}`;
  const fillId = `seal-fill-${uid}`;
  const ringId = `ring-path-${uid}`;

  // Make sure the ring text reads dynamically
  const ringText = `${fraternityName.toUpperCase()} · ${schoolName.toUpperCase()} · ${greekLetters.toUpperCase()} · `;

  return (
    <svg viewBox="0 0 220 220" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="var(--brand-primary-soft)" />
        </linearGradient>
        <path
          id={ringId}
          d="M 110,110 m -96,0 a 96,96 0 1,1 192,0 a 96,96 0 1,1 -192,0"
        />
      </defs>
      <circle cx="110" cy="110" r="108" fill={`url(#${glowId})`} />
      <circle cx="110" cy="110" r="86" fill={`url(#${fillId})`} stroke="var(--brand-primary)" strokeWidth="1.6" />
      <circle cx="110" cy="110" r="74" fill="none" stroke="var(--brand-primary)" strokeWidth="0.6" opacity="0.55" />

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
        {fraternityLetters}
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
        FOUNDED {foundingYear}
      </text>

      <text fontFamily="Inter, sans-serif" fontSize="9" letterSpacing="6" fill="#0B0B0C" opacity="0.55">
        <textPath href={`#${ringId}`} startOffset="2%">
          {ringText}
        </textPath>
      </text>
    </svg>
  );
}
