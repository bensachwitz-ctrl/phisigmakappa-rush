/**
 * ────────────────────────────────────────────────────────────────────────────
 * GREEKSTACK ICON LIBRARY — public barrel
 * ────────────────────────────────────────────────────────────────────────────
 * A bespoke, cohesive duotone SVG icon set drawn specifically for Greekstack to
 * replace the generic lucide-react icons platform-wide. Pure SVG components —
 * server-safe (no "use client" required), themeable via `currentColor` + a
 * `--gs-accent` CSS var, drop-in sizable via Tailwind `h-* / w-*` or a `size` prop.
 *
 *   import { IconRecruitment, IconDues } from "@/components/brand/icons";
 *
 * See ./icon-base.tsx for the full design language + `IconProps` contract.
 */

// Shared foundation (type + wrapper + accent token).
export { IconBase, GS_ACCENT, type IconProps } from "./icon-base";

// Marketing / feature glyphs.
export {
  IconRecruitment,
  IconDues,
  IconEvents,
  IconRoles,
  IconSafety,
  IconWhiteLabel,
  IconAlumni,
  IconMembers,
  IconDashboard,
  IconGrowth,
  IconSecurity,
  IconSubdomain,
  IconLaunch,
  IconSpark,
} from "./features";

// Signup steps + platform console.
export {
  IconChapter,
  IconBranding,
  IconComms,
  IconAdmin,
  IconTenants,
  IconActive,
  IconSuspend,
  IconTrash,
} from "./onboarding";

// UI utility glyphs.
export {
  IconCheck,
  IconCheckCircle,
  IconArrowRight,
  IconChevronDown,
  IconExternal,
  IconMenu,
  IconClose,
  IconShieldCheck,
  IconSearch,
  IconCommand,
  IconHelp

} from "./utility";

// Custom tool-specific glyphs.
export { IconTreasury } from "./treasury";
export { IconCalendarTool } from "./calendar-tool";

// Member + alumni dashboard tab-nav / quick-action glyphs.
export {
  IconActivity,
  IconServiceHours,
  IconPolls,
  IconProfile,
  IconElections,
  IconMap,
  IconGraduation,
  IconGiving,
  IconSettings,
  IconAddMember,
} from "./dashboard-tabs";

// Admin nav + ⌘K command-palette destination glyphs (close the lucide cohesion
// gap on the always-on officer chrome).
export {
  IconDirectory,
  IconStanding,
  IconFamilyTree,
  IconMeetings,
  IconRiskDesk,
  IconAcademic,
  IconChores,
  IconService,
  IconLibrary,
  IconExports,
  IconPayouts,
  IconBilling,
  IconAuditLog,
  IconBallot,
} from "./admin-nav";

