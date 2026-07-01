/**
 * Greekstack marketing animation primitives.
 *
 * Every primitive here is:
 *   • reduced-motion-safe — degrades to a static/instant render via framer's
 *     useReducedMotion() (or a matchMedia gate) so no essential content is ever
 *     hidden behind motion;
 *   • SSR/hydration-safe — typewriter/counter effects render a stable string
 *     server-side and only animate after mount;
 *   • performance-minded — animates transform/opacity only, uses in-view
 *     triggers, and reserves space to avoid layout shift.
 *
 * Used by components/site/marketing-landing.tsx.
 */
export { TypewriterCycle } from "./typewriter-cycle";
export { PhraseFlip } from "./phrase-flip";
export { Tilt3DCard } from "./tilt-3d-card";
export { Magnetic } from "./magnetic";
export { Parallax, ScrollProgressBar } from "./parallax";
export { Reveal3D, Reveal3DItem } from "./reveal-3d";
export { FloatingOrbs } from "./floating-orbs";
export { Marquee } from "./marquee";
export { AnimatedCounter } from "./animated-counter";
/* Depth layer — glassmorphism + interactive lighting (2nd-pass elevation).
   Spotlight (cursor-tracking radial glow, fine-pointer-only), ShimmerBorder
   (animated gradient ring on CTAs/panels), Grain (faint tactile noise). All
   reduced-motion-safe + SSR-safe; Spotlight/Grain render nothing on touch /
   render static respectively. */
export { Spotlight } from "./spotlight";
export { ShimmerBorder } from "./shimmer-border";
export { Grain } from "./grain";
