/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ILLUSTRATION LIBRARY — public barrel
 * ────────────────────────────────────────────────────────────────────────────
 * A bespoke set of on-brand SPOT ILLUSTRATIONS — the richer cousin of the icon
 * set — drawn to top empty states, success moments, and "nothing here yet"
 * surfaces so blank tabs read as friendly and finished instead of bare
 * icon-and-text. Pure SVG components: server-safe (no "use client"), duotone,
 * and themeable via `currentColor` (line) + `hsl(var(--primary) / α)` (accent
 * fill), so each scene RE-THEMES per tenant. Drop-in sizable via Tailwind
 * `h-* / w-*` or a `size` prop.
 *
 *   import { IllustrationRoster, IllustrationCelebrate } from "@/components/brand/illustrations";
 *
 * See ./illustration-base.tsx for the full design language + `IllustrationProps`.
 */

// Shared foundation (type + wrapper + accent tokens + ground helper).
export {
  IllustrationBase,
  IllustrationGround,
  ILLUSTRATION_ACCENT,
  ACCENT_OPACITY,
  ACCENT_OPACITY_STRONG,
  type IllustrationProps,
} from "./illustration-base";

// The scenes.
export { IllustrationRoster } from "./roster";
export { IllustrationCalendar } from "./calendar";
export { IllustrationInbox } from "./inbox";
export { IllustrationLedger } from "./ledger";
export { IllustrationSearch } from "./search";
export { IllustrationCelebrate } from "./celebrate";
export { IllustrationWelcome } from "./welcome";
