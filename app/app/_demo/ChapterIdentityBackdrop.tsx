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

  // Common definitions for premium gradients and glows
  const defs = (
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF2D4" />
        <stop offset="35%" stopColor="#E5A93B" />
        <stop offset="100%" stopColor="#9A650C" />
      </linearGradient>
      <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#CBD5E1" />
        <stop offset="100%" stopColor="#64748B" />
      </linearGradient>
      <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor="#0B0F19" />
      </linearGradient>
      <linearGradient id="secondaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={secondary} />
        <stop offset="100%" stopColor="transparent" opacity={0.3} />
      </linearGradient>
      <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E2E8F0" />
      </linearGradient>
    </defs>
  );

  if (s.includes("south carolina")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none">
        {defs}
        <circle cx="50" cy="50" r="46" stroke="url(#goldGrad)" strokeWidth="2.5" fill="rgba(11,15,25,0.7)" />
        <circle cx="50" cy="50" r="41" stroke={primary} strokeWidth="1.5" strokeDasharray="3 2" />
        {/* Crescent Moon */}
        <path d="M30 25 A 9 9 0 0 1 43 21 A 11 11 0 1 0 30 34 Z" fill="url(#goldGrad)" />
        {/* Detailed Palmetto Tree */}
        <g fill="url(#goldGrad)">
          {/* Trunk */}
          <path d="M48 76 L 49 53 Q 48 48 50 48 Q 52 48 51 53 L 52 76 Z" />
          {/* Base grass */}
          <path d="M38 76 C 45 74, 55 74, 62 76 Z" />
          {/* Detailed fronds */}
          <path d="M50 47 C 48 35, 34 38, 30 42 C 34 37, 45 44, 48 47" />
          <path d="M50 47 C 52 35, 66 38, 70 42 C 66 37, 55 44, 52 47" />
          <path d="M50 47 C 44 33, 40 28, 38 27 C 42 29, 46 39, 48 45" />
          <path d="M50 47 C 56 33, 60 28, 62 27 C 58 29, 54 39, 52 45" />
          <path d="M50 47 C 49 32, 47 24, 47 22 C 49 26, 50 37, 50 47" />
          {/* Side leaves */}
          <path d="M43 58 C 40 56, 35 56, 36 53 C 38 50, 46 53, 47 54" />
          <path d="M57 58 C 60 56, 65 56, 64 53 C 62 50, 54 53, 53 54" />
        </g>
      </svg>
    );
  }

  if (s.includes("southern california")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none">
        {defs}
        {/* Shield shape */}
        <path d="M15 15 L 85 15 L 85 52 C 85 78, 50 94, 50 94 C 50 94, 15 78, 15 52 Z" stroke="url(#goldGrad)" strokeWidth="2.5" fill="rgba(11,15,25,0.7)" />
        <path d="M20 20 L 80 20 L 80 50 C 80 72, 50 87, 50 87 C 50 87, 20 72, 20 50 Z" stroke={primary} strokeWidth="1" opacity="0.4" />
        {/* Academic Stars */}
        <g fill="url(#goldGrad)">
          <path d="M30 30 L 32 34 L 36 34 L 33 37 L 34 41 L 30 39 L 26 41 L 27 37 L 24 34 L 28 34 Z" />
          <path d="M70 30 L 72 34 L 76 34 L 73 37 L 74 41 L 70 39 L 66 41 L 67 37 L 64 34 L 68 34 Z" />
        </g>
        {/* Torch handle */}
        <path d="M50 74 L 46 45 Q 50 43 54 45 Z" fill="url(#goldGrad)" />
        {/* Torch rim */}
        <path d="M43 45 C 43 42, 57 42, 57 45 Z" fill={primary} />
        {/* Multi-layered flame */}
        <path d="M50 21 C 55 31, 60 33, 57 41 C 55 45, 45 45, 43 41 C 40 33, 45 31, 50 21 Z" fill="url(#goldGrad)" />
        <path d="M50 28 C 53 33, 56 34, 54 39 C 53 42, 47 42, 46 39 C 44 34, 47 33, 50 28 Z" fill={primary} />
      </svg>
    );
  }

  if (s.includes("clemson")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none">
        {defs}
        <path d="M15 15 L 85 15 L 85 52 C 85 78, 50 94, 50 94 C 50 94, 15 78, 15 52 Z" stroke="url(#goldGrad)" strokeWidth="2.5" fill="rgba(11,15,25,0.7)" />
        {/* Clemson Orange Paw */}
        <g fill="#F56600">
          {/* Main pad */}
          <path d="M50 46 C 41 46, 35 50, 33 59 C 31 68, 38 77, 50 77 C 62 77, 69 68, 67 59 C 65 50, 59 46, 50 46 Z" />
          {/* 4 Toes */}
          <circle cx="28" cy="40" r="7" />
          <circle cx="41" cy="28" r="8" />
          <circle cx="59" cy="28" r="8" />
          <circle cx="72" cy="40" r="7" />
        </g>
        {/* Purple highlights inside */}
        <g fill="#522D80" opacity="0.15">
          <circle cx="50" cy="59" r="6" />
        </g>
      </svg>
    );
  }

  if (s.includes("georgia")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none">
        {defs}
        <path d="M15 15 L 85 15 L 85 52 C 85 78, 50 94, 50 94 C 50 94, 15 78, 15 52 Z" stroke="url(#goldGrad)" strokeWidth="2.5" fill="rgba(11,15,25,0.7)" />
        {/* Georgia Arch */}
        <g stroke="url(#goldGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round">
          {/* Base / Steps */}
          <path d="M26 78 L 74 78" strokeWidth="5.5" />
          <path d="M30 73 L 70 73" strokeWidth="3" />
          {/* Three pillars */}
          <path d="M34 73 L 34 43" />
          <path d="M50 73 L 50 43" />
          <path d="M66 73 L 66 43" strokeWidth="3.5" />
          {/* Arch top */}
          <path d="M31 43 C 31 20, 69 20, 69 43" />
          {/* Ribbon banner */}
          <path d="M22 28 Q 50 18 78 28" stroke={primary} strokeWidth="1.5" opacity="0.3" />
        </g>
      </svg>
    );
  }

  if (s.includes("auburn")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none">
        {defs}
        <path d="M15 15 L 85 15 L 85 52 C 85 78, 50 94, 50 94 C 50 94, 15 78, 15 52 Z" stroke="url(#goldGrad)" strokeWidth="2.5" fill="rgba(11,15,25,0.7)" />
        {/* Interlocking AU monogram */}
        <g strokeWidth="4.5" fill="none" strokeLinecap="square">
          {/* Letter A (Navy) */}
          <path d="M34 72 L 50 26 L 66 72" stroke="#0C2340" strokeWidth="6.5" />
          <path d="M41 54 L 59 54" stroke="#0C2340" strokeWidth="6.5" />
          {/* Letter A (Inner Orange) */}
          <path d="M34 72 L 50 26 L 66 72" stroke="#F26522" />
          <path d="M41 54 L 59 54" stroke="#F26522" />
          {/* Letter U (Orange) */}
          <path d="M43 38 L 43 62 Q 43 71 50 71 Q 57 71 57 62 L 57 38" stroke="#F26522" strokeWidth="5.5" />
          {/* Letter U (Inner Navy) */}
          <path d="M43 38 L 43 62 Q 43 71 50 71 Q 57 71 57 62 L 57 38" stroke="#0C2340" />
        </g>
      </svg>
    );
  }

  if (s.includes("indiana")) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none">
        {defs}
        <path d="M15 15 L 85 15 L 85 52 C 85 78, 50 94, 50 94 C 50 94, 15 78, 15 52 Z" stroke="url(#goldGrad)" strokeWidth="2.5" fill="rgba(11,15,25,0.7)" />
        {/* IU Trident */}
        <g stroke="url(#whiteGrad)" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Vertical central bar */}
          <path d="M50 24 L 50 74" strokeWidth="5.5" />
          {/* Bottom horizontal base */}
          <path d="M40 74 L 60 74" strokeWidth="5" />
          {/* Left fork */}
          <path d="M34 28 L 34 48 Q 34 60 50 60 Q 66 60 66 48 L 66 28" />
          {/* Upper middle crossbar */}
          <path d="M28 28 L 72 28" />
        </g>
      </svg>
    );
  }

  // Fallback generic elegant shield
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none">
      {defs}
      <path d="M15 15 L 85 15 L 85 52 C 85 78, 50 94, 50 94 C 50 94, 15 78, 15 52 Z" stroke="url(#goldGrad)" strokeWidth="2.5" fill="rgba(11,15,25,0.7)" />
      <circle cx="50" cy="48" r="18" stroke="url(#goldGrad)" strokeWidth="2" />
      <path d="M50 30 L 50 66 M 32 48 L 68 48" stroke="url(#goldGrad)" strokeWidth="2" />
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
      className="gs-fade-in pointer-events-none absolute inset-0 z-[-4] select-none overflow-hidden"
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
      {/* School crest logo - bottom-right corner with glassmorphic backing, shadows and name label */}
      {school ? (
        <div className="absolute bottom-8 right-8 z-[2] flex flex-col items-center gap-2">
          <div className="w-24 h-24 lg:w-28 lg:h-28 flex items-center justify-center rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/10 p-3 shadow-2xl transition-all duration-300 hover:scale-[1.05] hover:border-white/20">
            <SchoolCrestLogo school={school} primary={primary} secondary={secondary} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-950/60 backdrop-blur px-2.5 py-1 rounded-full border border-white/5 shadow-md">
            {school.replace("University of ", "").replace("Clemson University", "Clemson")}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default ChapterIdentityBackdrop;
