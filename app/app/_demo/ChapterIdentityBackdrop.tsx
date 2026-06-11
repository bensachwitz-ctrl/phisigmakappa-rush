"use client";

import React from "react";

/**
 * ChapterIdentityBackdrop — the displayed chapter's IDENTITY painted into the
 * demo's ambient background: a faint school wordmark drifting across the top,
 * the chapter's Greek-letter monogram low-left, and the school NAME rendered
 * big in the bottom-right corner, all tinted toward the chapter's brand colors.
 *
 * This is the "tailored to YOU" moment: when the demo re-skins (e.g. to Kappa
 * Delta at a chosen school) the drifting letters AND this school name all swap
 * together. Re-keyed by tenant at the call site so the swap lands as one gentle
 * cross-fade (gs-fade-in — opacity only, reduced-motion safe via the global
 * collapse).
 *
 * Purely decorative: aria-hidden + pointer-events-none, parked on the z-1
 * ambient plane of the demo shell (above the z-0 background wash, below all
 * z-10+ content) so it can NEVER sit over cards or interactive UI — the phone
 * surface and every modal paint fully above it.
 */
export function SchoolCrestLogo({
  school,
  primary,
  secondary,
}: {
  school: string;
  primary: string;
  secondary: string;
}) {
  const s = school.toLowerCase();

  if (s.includes("south carolina")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none">
        <circle cx="50" cy="50" r="45" stroke={primary} strokeWidth="3" fill="rgba(0,0,0,0.3)" />
        <circle cx="50" cy="50" r="41" stroke={secondary} strokeWidth="1" strokeDasharray="3 2" />
        {/* Crescent Moon */}
        <path d="M32 28 A 8 8 0 0 1 44 24 A 10 10 0 1 0 32 36 Z" fill={secondary} />
        {/* Palmetto Tree */}
        <path d="M48 76 L 48 55 Q 48 50 50 50 Q 52 50 52 55 L 52 76 Z" fill={secondary} />
        <path d="M44 58 C 42 56, 36 56, 38 52 C 40 48, 48 52, 48 52" stroke={secondary} strokeWidth="2" strokeLinecap="round" />
        <path d="M56 58 C 58 56, 64 56, 62 52 C 60 48, 52 52, 52 52" stroke={secondary} strokeWidth="2" strokeLinecap="round" />
        {/* Fronds */}
        <path d="M50 48 C 50 35, 34 38, 32 40 C 35 34, 46 44, 48 48" fill={secondary} />
        <path d="M50 48 C 50 35, 66 38, 68 40 C 65 34, 54 44, 52 48" fill={secondary} />
        <path d="M50 48 C 42 34, 42 32, 40 30 C 45 32, 47 40, 49 46" fill={secondary} />
        <path d="M50 48 C 58 34, 58 32, 60 30 C 55 32, 53 40, 51 46" fill={secondary} />
        <path d="M50 48 C 50 30, 48 26, 47 24 C 50 28, 50 38, 50 48" stroke={secondary} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes("southern california")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none">
        {/* Shield shape */}
        <path d="M15 15 L 85 15 L 85 50 C 85 75, 50 92, 50 92 C 50 92, 15 75, 15 50 Z" stroke={primary} strokeWidth="3" fill="rgba(0,0,0,0.3)" />
        <path d="M20 20 L 80 20 L 80 50 C 80 70, 50 85, 50 85 C 50 85, 20 70, 20 50 Z" stroke={secondary} strokeWidth="1" opacity="0.5" />
        {/* Torch */}
        <path d="M50 72 L 46 48 L 54 48 Z" fill={secondary} />
        <path d="M43 48 C 43 45, 57 45, 57 48 Z" fill={primary} />
        {/* Flame */}
        <path d="M50 26 C 54 34, 59 36, 56 44 C 54 48, 46 48, 44 44 C 41 36, 46 34, 50 26 Z" fill={secondary} />
        <path d="M50 32 C 52 36, 55 38, 53 43 C 52 45, 48 45, 47 43 C 45 38, 48 36, 50 32 Z" fill={primary} />
      </svg>
    );
  }

  if (s.includes("clemson")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none">
        <path d="M15 15 L 85 15 L 85 50 C 85 75, 50 92, 50 92 C 50 92, 15 75, 15 50 Z" stroke={primary} strokeWidth="3" fill="rgba(0,0,0,0.3)" />
        {/* Tiger Paw print */}
        <g fill={secondary}>
          {/* Main pad */}
          <path d="M50 48 C 43 48, 38 52, 36 60 C 34 68, 40 76, 50 76 C 60 76, 66 68, 64 60 C 62 52, 57 48, 50 48 Z" />
          {/* 4 Toes */}
          <circle cx="30" cy="42" r="6" />
          <circle cx="42" cy="32" r="7" />
          <circle cx="58" cy="32" r="7" />
          <circle cx="70" cy="42" r="6" />
        </g>
      </svg>
    );
  }

  if (s.includes("georgia")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none">
        <path d="M15 15 L 85 15 L 85 50 C 85 75, 50 92, 50 92 C 50 92, 15 75, 15 50 Z" stroke={primary} strokeWidth="3" fill="rgba(0,0,0,0.3)" />
        {/* Georgia Arch */}
        <g stroke={secondary} strokeWidth="3.5" fill="none" strokeLinecap="round">
          {/* Base / Steps */}
          <path d="M28 76 L 72 76" strokeWidth="5" />
          <path d="M32 72 L 68 72" strokeWidth="3" />
          {/* Three pillars */}
          <path d="M35 72 L 35 44" />
          <path d="M50 72 L 50 44" />
          <path d="M65 72 L 65 44" />
          {/* Arch top */}
          <path d="M32 44 C 32 24, 68 24, 68 44" />
        </g>
      </svg>
    );
  }

  if (s.includes("auburn")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none">
        <path d="M15 15 L 85 15 L 85 50 C 85 75, 50 92, 50 92 C 50 92, 15 75, 15 50 Z" stroke={primary} strokeWidth="3" fill="rgba(0,0,0,0.3)" />
        {/* Interlocking AU monogram */}
        <g stroke={secondary} strokeWidth="4" fill="none" strokeLinecap="square">
          {/* Letter A */}
          <path d="M35 72 L 50 28 L 65 72" />
          <path d="M41 54 L 59 54" />
          {/* Letter U */}
          <path d="M42 40 L 42 62 Q 42 70 50 70 Q 58 70 58 62 L 58 40" stroke={primary} strokeWidth="5" />
          <path d="M42 40 L 42 62 Q 42 70 50 70 Q 58 70 58 62 L 58 40" />
        </g>
      </svg>
    );
  }

  if (s.includes("indiana")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none">
        <path d="M15 15 L 85 15 L 85 50 C 85 75, 50 92, 50 92 C 50 92, 15 75, 15 50 Z" stroke={primary} strokeWidth="3" fill="rgba(0,0,0,0.3)" />
        {/* IU Trident */}
        <g stroke={secondary} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Vertical central bar */}
          <path d="M50 24 L 50 76" />
          {/* Bottom horizontal base */}
          <path d="M40 76 L 60 76" />
          {/* Left fork */}
          <path d="M34 30 L 34 50 Q 34 62 50 62 Q 66 62 66 50 L 66 30" />
          {/* Upper middle crossbar */}
          <path d="M30 30 L 70 30" />
        </g>
      </svg>
    );
  }

  // Fallback generic elegant shield
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none">
      <path d="M15 15 L 85 15 L 85 50 C 85 75, 50 92, 50 92 C 50 92, 15 75, 15 50 Z" stroke={primary} strokeWidth="3" fill="rgba(0,0,0,0.3)" />
      <circle cx="50" cy="48" r="18" stroke={secondary} strokeWidth="2" />
      <path d="M50 30 L 50 66 M 32 48 L 68 48" stroke={secondary} strokeWidth="2" />
    </svg>
  );
}

export function ChapterIdentityBackdrop({
  school,
  letters,
  primary,
  secondary,
}: {
  school?: string | null;
  letters?: string | null;
  primary: string;
  secondary: string;
}) {
  if (!school && !letters) return null;

  // The shell is near-black, so raw brand colors (deep reds/purples) at low
  // opacity can vanish. Mix each toward a light slate so the watermark stays
  // a soft, brand-tinted glow on dark. (color-mix: all evergreen browsers.)
  const inkPrimary = `color-mix(in srgb, ${primary} 42%, #cbd5e1)`;
  const inkSecondary = `color-mix(in srgb, ${secondary} 42%, #cbd5e1)`;

  return (
    <div
      aria-hidden="true"
      className="gs-fade-in pointer-events-none absolute inset-0 z-[1] select-none overflow-hidden"
    >
      {/* School wordmark — SMALLER and drifting slowly across the top of the
          room (owner round-8: visible, never blocked by the phone/rail, in
          motion like the letters). The flex wrapper centers it; the drift
          animation owns the transform. */}
      {school ? (
        <div className="absolute inset-x-0 top-[7%] flex justify-center">
          <p
            className="gs-school-drift whitespace-nowrap font-serif text-[clamp(1.3rem,3vw,2.5rem)] font-black uppercase leading-none tracking-tight"
            style={{ color: inkPrimary, ["--gso" as string]: 0.26 }}
          >
            {school}
          </p>
        </div>
      ) : null}
      {/* Chapter monogram — their letters, vertically centered on the left, secondary tint. */}
      {letters ? (
        <p
          className="absolute left-4 top-1/2 -translate-y-1/2 font-serif text-[clamp(7rem,22vh,15rem)] font-black leading-none opacity-[0.18]"
          style={{ color: inkSecondary }}
        >
          {letters}
        </p>
      ) : null}
      {/* School crest logo - bottom-right corner with glassmorphic backing and shadows */}
      {school ? (
        <div className="absolute bottom-8 right-8 z-[2] w-24 h-24 lg:w-28 lg:h-28 flex items-center justify-center rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 p-2 shadow-2xl">
          <SchoolCrestLogo school={school} primary={primary} secondary={secondary} />
        </div>
      ) : null}
    </div>
  );
}

export default ChapterIdentityBackdrop;
