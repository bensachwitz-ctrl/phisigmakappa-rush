"use client";

import * as React from "react";

/**
 * useFinePointer — true ONLY on devices that report a real hovering, fine
 * pointer (i.e. a desktop/laptop with a mouse or trackpad). Phones and
 * touch tablets report `(hover: none)` / `(pointer: coarse)` and resolve to
 * false.
 *
 * This is the single switch the marketing site + demo use to keep the heavy
 * 3D (cursor-tracked card tilt, scroll parallax, the rotateX reveal "settle",
 * the WebGL plexus) DESKTOP-ONLY. On a phone the same components fall back to a
 * flat, clean, non-3D presentation — the owner's explicit ask ("on the phone
 * do NOT have the 3D animations — it kind of breaks it").
 *
 * SSR-safe: returns false on the server and on the very first client render,
 * then resolves post-mount. Because the 3D variants degrade to the SAME markup
 * the static branch renders, the first paint is the flat version everywhere and
 * desktop upgrades to 3D after hydration — no layout shift, no hydration
 * mismatch, no flash of a broken tilt on phones.
 */
export function useFinePointer(): boolean {
  const [fine, setFine] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia?.("(hover: hover) and (pointer: fine)");
    if (!mq) return;
    const apply = () => setFine(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return fine;
}

/**
 * useIsPhoneViewport — true when the viewport is phone-width (default ≤ 640px,
 * Tailwind's `sm` boundary). Used where the decision is layout-width-driven
 * rather than pointer-driven (e.g. skipping the WebGL plexus on small screens).
 *
 * SSR-safe, same resolve-after-mount contract as useFinePointer.
 */
export function useIsPhoneViewport(maxWidthPx = 640): boolean {
  const [isPhone, setIsPhone] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia?.(`(max-width: ${maxWidthPx}px)`);
    if (!mq) return;
    const apply = () => setIsPhone(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [maxWidthPx]);

  return isPhone;
}

/**
 * useIsDesktopViewport — true when the viewport is at least `minWidthPx` wide
 * (default 1024px = Tailwind's `lg`). The interactive demo uses this to gate the
 * showcase device frame's 3D tilt/glare so they ONLY run on the same `lg+`
 * layout that actually renders the chassis. Below `lg` the demo is the
 * full-bleed real mobile app with zero 3D.
 *
 * SSR-safe, resolve-after-mount (server + first paint = false ⇒ no 3D), so the
 * phone never flashes a tilt before the media query resolves.
 */
export function useIsDesktopViewport(minWidthPx = 1024): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia?.(`(min-width: ${minWidthPx}px)`);
    if (!mq) return;
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [minWidthPx]);

  return isDesktop;
}
