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
 * Purely decorative: aria-hidden + pointer-events-none, parked on the -z-10
 * plane of the demo shell so it can NEVER sit over cards or interactive UI —
 * the phone surface and every modal paint fully above it.
 */
export function ChapterIdentityBackdrop({
  school,
  letters,
  crestEmoji,
  primary,
  secondary,
}: {
  school?: string | null;
  letters?: string | null;
  crestEmoji?: string | null;
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
      className="gs-fade-in pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden"
    >
      {/* Huge faint school wordmark across the top of the room. */}
      {school ? (
        <p
          className="absolute inset-x-0 top-[6%] px-6 text-center font-serif text-[clamp(2.4rem,8vw,6.75rem)] font-black uppercase leading-[0.95] tracking-tight opacity-[0.14]"
          style={{ color: inkPrimary }}
        >
          {school}
        </p>
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
      {/* Crest watermark — low-right, gently tilted. */}
      {crestEmoji ? (
        <p className="absolute -bottom-[4%] -right-[2%] rotate-[-8deg] text-[clamp(9rem,30vh,19rem)] leading-none opacity-[0.08]">
          {crestEmoji}
        </p>
      ) : null}
    </div>
  );
}

export default ChapterIdentityBackdrop;
