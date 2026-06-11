"use client";

import React from "react";

/**
 * ChapterIdentityBackdrop — the displayed chapter's IDENTITY painted into the
 * demo's ambient background: a huge, faint school wordmark across the top, the
 * chapter's Greek-letter monogram low-left, and the crest mark low-right, all
 * tinted toward the chapter's brand colors.
 *
 * This is the "tailored to YOU" moment: when the demo re-skins (e.g. to Kappa
 * Delta at a chosen school) the drifting letters AND this school name AND the
 * crest all swap together. Re-keyed by tenant at the call site so the swap
 * lands as one gentle cross-fade (gs-fade-in — opacity only, reduced-motion
 * safe via the global collapse).
 *
 * Purely decorative: aria-hidden + pointer-events-none, parked on the z-1
 * ambient plane of the demo shell (above the z-0 background wash, below all
 * z-10+ content) so it can NEVER sit over cards or interactive UI — the phone
 * surface and every modal paint fully above it.
 */
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
      {/* Chapter monogram — their letters, low-left, secondary tint. */}
      {letters ? (
        <p
          className="absolute -left-[2%] bottom-[8%] font-serif text-[clamp(7rem,22vh,15rem)] font-black leading-none opacity-[0.10]"
          style={{ color: inkSecondary }}
        >
          {letters}
        </p>
      ) : null}
      {/* School wordmark BIG — bottom-right corner (owner round-9: the old
          murky shield-emoji watermark was unreadable slop; the school NAME,
          rendered huge and chapter-tinted like a stadium wall, is the
          identity moment). Right-anchored so a long name crops cleanly off
          the left edge — the tail of the name always stays legible in the
          corner. Swaps with the rest of the backdrop on reskin (re-keyed). */}
      {school ? (
        <p
          className="absolute -bottom-[1%] right-[-0.25%] whitespace-nowrap text-right font-serif text-[clamp(3.25rem,15vh,8.5rem)] font-black uppercase leading-[0.82] tracking-tight"
          style={{ color: inkPrimary, opacity: 0.15 }}
        >
          {school}
        </p>
      ) : null}
    </div>
  );
}

export default ChapterIdentityBackdrop;
