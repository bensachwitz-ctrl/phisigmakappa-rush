"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { imageSrc } from "@/lib/image-url";
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
    logoUrl,
  } = useChapterIdentity();

  const wmUid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const wmGradId = `wm-shield-${wmUid}`;
  const wmGlyph = (fraternityLetters || greekLettersGlyphs || "G").slice(0, 4);

  // A chapter-uploaded logo (set in /admin/setup or /admin/settings → Brand)
  // takes precedence over the auto-generated shield. Rendered as a square,
  // contained image so any aspect ratio sits cleanly next to the wordmark text.
  const hasLogo = !!(logoUrl && logoUrl.trim());
  const logoMark = (size: number) => (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={imageSrc(logoUrl, { w: size * 2, h: size * 2, crop: "limit" })}
      alt={fraternityName}
      width={size}
      height={size}
      decoding="async"
      className="w-auto object-contain"
      style={{ height: size }}
    />
  );

  // Auto-branded crest: the chapter's FULL glyph on a gradient of its OWN brand
  // colors (via the --brand-primary* CSS vars). Every chapter gets a polished
  // logo automatically — no upload required, correct for any organization.
  const renderGenericShield = (size = 36) => {
    const fs = wmGlyph.length >= 4 ? 8 : wmGlyph.length === 3 ? 9.5 : wmGlyph.length === 2 ? 12 : 15;
    return (
      <svg width={size} height={size} viewBox="0 0 40 44" fill="none" className="flex-shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id={wmGradId} x1="0" y1="0" x2="40" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--brand-primary)" />
            <stop offset="1" stopColor="var(--brand-primary-dark)" />
          </linearGradient>
        </defs>
        <path d="M20 2 L37 7 L37 24 C37 33 29 39 20 42 C11 39 3 33 3 24 L3 7 Z" fill={`url(#${wmGradId})`} stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M20 5.4 L34 9.6 L34 24 C34 31.4 27.5 36.4 20 39.1 C12.5 36.4 6 31.4 6 24 L6 9.6 Z" fill="none" stroke="white" strokeWidth="0.7" opacity="0.5" />
        {[12.5, 20, 27.5].map((cx) => (
          <path key={cx} d={`M ${cx} 9 l 0.55 1.7 1.8 0 -1.45 1.05 0.55 1.7 -1.45 -1.0 -1.45 1.0 0.55 -1.7 -1.45 -1.05 1.8 0 z`} fill="white" opacity="0.9" />
        ))}
        <text x="20" y="27" textAnchor="middle" fill="white" fontSize={fs} fontWeight="700" fontFamily='ui-serif, Georgia, serif' letterSpacing="0.3">{wmGlyph}</text>
      </svg>
    );
  };

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 text-base font-semibold tracking-tight",
          className
        )}
      >
        {hasLogo ? logoMark(28) : renderGenericShield(28)}
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
      {hasLogo ? logoMark(36) : renderGenericShield(36)}
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
  const { foundingYear, fraternityLetters, greekLettersGlyphs } = useChapterIdentity();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `crest-grad-${uid}`;
  const glyph = (fraternityLetters || greekLettersGlyphs || "G").slice(0, 4);
  const fs = glyph.length >= 4 ? 13 : glyph.length === 3 ? 16 : glyph.length === 2 ? 21 : 27;

  // Generic, auto-tinted chapter crest — the chapter's OWN glyph on a gradient
  // of its brand colors. No org-specific iconography, so this renders a correct,
  // premium mark for ANY organization automatically.
  return (
    <svg viewBox="0 0 64 72" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-primary)" />
          <stop offset="1" stopColor="var(--brand-primary-dark)" />
        </linearGradient>
      </defs>
      {/* Shield body */}
      <path
        d="M 8 6 L 56 6 L 56 38 C 56 50 49 60 32 70 C 15 60 8 50 8 38 Z"
        fill={`url(#${gradId})`}
        stroke="white"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Inner hairline — premium double-rule */}
      <path
        d="M 12 10 L 52 10 L 52 37.5 C 52 47 46 55.5 32 64.5 C 18 55.5 12 47 12 37.5 Z"
        fill="none"
        stroke="white"
        strokeWidth="0.8"
        opacity="0.45"
      />
      {/* Three stars in the chief */}
      {[20, 32, 44].map((cx) => (
        <path
          key={`star-${cx}`}
          d={`M ${cx} 15 l 0.78 2.40 2.52 0 -2.04 1.49 0.78 2.40 -2.04 -1.48 -2.04 1.48 0.78 -2.40 -2.04 -1.49 2.52 0 z`}
          fill="white"
          opacity="0.95"
        />
      ))}
      {/* Chapter glyph — the auto-generated mark */}
      <text
        x="32"
        y="45"
        textAnchor="middle"
        fontFamily='ui-serif, Georgia, "Times New Roman", serif'
        fontSize={fs}
        fontWeight="700"
        fill="white"
        letterSpacing="0.5"
      >
        {glyph}
      </text>
      {/* Founding year */}
      {foundingYear ? (
        <text
          x="32"
          y="58"
          textAnchor="middle"
          fontFamily='ui-serif, Georgia, serif'
          fontSize="6"
          fontWeight="700"
          fontStyle="italic"
          fill="white"
          opacity="0.85"
          letterSpacing="1"
        >
          {foundingYear}
        </text>
      ) : null}
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
