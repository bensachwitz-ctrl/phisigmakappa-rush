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
  IconHelp,
  IconChevronLeft,
  IconChevronRight,
  IconSpinner,
  IconAlertCircle,
  IconDatabase,
  IconWand,
  IconUpload,
  IconImage,
  IconBuilding,
  IconRocket,
  IconUserPlus,
  IconSignOut,
  IconGrid,
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

// iOS app-surface glyphs — bespoke set drawn for app/app/MobileAppClient + _demo.
export {
  IconBell,
  IconLogOut,
  IconLogIn,
  IconInfo,
  IconAward,
  IconClock,
  IconHeart,
  IconBriefcase,
  IconThumbsUp,
  IconKey,
  IconXCircle,
  IconCar,
  IconWallet,
  IconPieChart,
  IconQrCode,
  IconGift,
  IconCalendarPlus,
  IconMegaphone,
} from "./mobile";

// Promote select existing glyphs into the public barrel for the iOS app surface.
export { IconUser, IconPin, IconCrown } from "./chapter";
export {
  IconMail,
  IconPhone,
  IconCalendar,
  IconArrowLeft,
  IconAlert,
  IconMessage,
  IconLock,
} from "./contact";
export { IconSchool } from "./onboarding-wizard";

// Web-migration extras — the remaining high-traffic interface glyphs (add /
// download / file / editor toolbar / arrows / status / social) drawn fresh in
// the house language so the full web surface can leave lucide-react without ever
// mixing families on a rendered page. `GsIcon` is the bespoke stand-in for
// lucide's `LucideIcon` component type at typed call-sites.
export {
  type GsIcon,
  IconPlus,
  IconMinus,
  IconMinusCircle,
  IconCircle,
  IconEdit,
  IconDownload,
  IconFileText,
  IconClipboard,
  IconCopy,
  IconFolder,
  IconReceipt,
  IconDollarSign,
  IconPercent,
  IconScale,
  IconLandmark,
  IconArrowUp,
  IconArrowDown,
  IconChevronUp,
  IconArrowSort,
  IconRefresh,
  IconUndo,
  IconRedo,
  IconReply,
  IconTrendingDown,
  IconSmartphone,
  IconMonitor,
  IconGlobe,
  IconHome,
  IconCompass,
  IconLink,
  IconUnlink,
  IconInstagram,
  IconLinkedin,
  IconMusic,
  IconParty,
  IconPlay,
  IconUserCheck,
  IconUserX,
  IconThumbsDown,
  IconGripVertical,
  IconStar,
  IconFlame,
  IconEye,
  IconFilter,
  IconSliders,
  IconHourglass,
  IconHistory,
  IconLifebuoy,
  IconBold,
  IconItalic,
  IconHeading,
  IconList,
  IconListOrdered,
  IconQuote,
  IconSave,
  IconShirt,
  IconSend,
} from "./extras";

