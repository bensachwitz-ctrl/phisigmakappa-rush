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
 *
 * NOTE: a former `SchoolCrestLogo` helper (hardcoded per-school SVG seals for
 * USC / South Carolina / Clemson / Auburn / Georgia / Indiana) lived here but
 * was already removed from the render (see the "School crest badge removed"
 * note below) and unused anywhere else, so the dead component — and its
 * baked-in rival-school crests — has been deleted.
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
      {/* School crest badge removed per owner: the bottom-right chapter-crest
          card (e.g. the "SOUTH CAROLINA" palmetto seal) read as a stray UI
          element floating on the dark shell. The faint drift wordmark +
          monogram above remain as the ambient, non-distracting chapter tint. */}
    </div>
  );
}

export default ChapterIdentityBackdrop;
