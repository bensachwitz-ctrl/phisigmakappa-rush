// officer-tools.ts — POSITION-SPECIFIC officer tool manifest.
//
// Item-1 RBAC core: the member app used to show one generic "Exec board" surface
// (every tool) to any officer, and leaked its affordances toward member/alumni
// views. This module replaces that with a per-position tool page: a role LABEL
// ("President Tools", "Recruitment Tools", …) plus ONLY the tools that position's
// permissions actually grant. It is the single source of truth both the server
// (mobile capabilities payload) and the client (which tabs/tools to render) read,
// so the two can never disagree and a non-officer never receives an officer tool.
//
// Framework-free on purpose (no React / Next imports) so it loads identically in
// route handlers, the Edge runtime, Node tests, and React components. Icons are
// carried as STRING KEYS; the client maps each key to a bespoke @/components/brand
// icon (never lucide, never a hand-rolled path).

import {
  DomainKey,
  OfficerPermissions,
  EMPTY_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
  hasPermission,
  DEFAULT_OFFICER_CATALOG,
} from "@/lib/officer-permissions";

/**
 * Which member-app surface a tool opens. These map 1:1 to a render branch in the
 * client; adding a surface here means adding its render branch there.
 */
export type OfficerSurface =
  | "roster"
  | "attendance"
  | "announce"
  | "events"
  | "rush"
  | "dues"
  | "service"
  | "risk-sober"
  | "alumni"
  | "elections"
  | "documents"
  | "settings";

export interface OfficerTool {
  /** Stable id (also the client tab id). */
  id: OfficerSurface;
  /** Human label shown on the tool tile / tab. */
  label: string;
  /** One-line description of what the tool does. */
  description: string;
  /** The permission domain that gates the tool. */
  domain: DomainKey;
  /** Minimum access the tool needs. */
  action: "read" | "write";
  /** Icon key the client resolves to a bespoke brand icon. */
  icon: string;
}

export interface OfficerToolset {
  /** Canonical role key (e.g. "president", "risk-manager", "alumni-relations"). */
  roleKey: string;
  /** Display label, e.g. "President Tools", "Risk Management Tools". */
  label: string;
  /** The tools this officer may open, already filtered to their permissions. */
  tools: OfficerTool[];
}

/**
 * The full catalog of officer tools, each gated on a domain+action. `officerToolset`
 * filters this list down to what a given position's permissions grant, in this
 * declared order (the order tools appear in the UI).
 */
export const TOOL_CATALOG: OfficerTool[] = [
  {
    id: "roster",
    label: "Roster & Members",
    description: "View the active roster and member details.",
    domain: "brothers",
    action: "read",
    icon: "members",
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Track who showed up to chapter and events.",
    domain: "events",
    action: "read",
    icon: "check",
  },
  {
    id: "announce",
    label: "Announcements",
    description: "Post announcements to the chapter.",
    domain: "announcements",
    action: "write",
    icon: "megaphone",
  },
  {
    id: "events",
    label: "Events & Calendar",
    description: "Plan and publish chapter events.",
    domain: "events",
    action: "write",
    icon: "calendar",
  },
  {
    id: "rush",
    label: "Recruitment Pipeline",
    description: "Manage PNMs, votes and bids.",
    domain: "rushPipeline",
    action: "write",
    icon: "recruitment",
  },
  {
    id: "dues",
    label: "Dues & Billing",
    description: "Configure dues and track payments.",
    domain: "dues",
    action: "write",
    icon: "dues",
  },
  {
    id: "service",
    label: "Service & Philanthropy",
    description: "Log service hours and philanthropy events.",
    domain: "service",
    action: "write",
    icon: "service",
  },
  {
    id: "risk-sober",
    label: "Sober Shifts",
    description: "Assign and log the sober member for each shift.",
    domain: "risk",
    action: "write",
    icon: "safety",
  },
  {
    id: "alumni",
    label: "Alumni Network",
    description: "Manage alumni logins, roster and giving.",
    domain: "alumni",
    action: "write",
    icon: "alumni",
  },
  {
    id: "elections",
    label: "Elections",
    description: "Run officer elections and ballots.",
    domain: "elections",
    action: "write",
    icon: "ballot",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Maintain the chapter document library.",
    domain: "documents",
    action: "write",
    icon: "library",
  },
  {
    id: "settings",
    label: "Chapter Settings",
    description: "Edit chapter branding and site settings.",
    domain: "siteSettings",
    action: "write",
    icon: "settings",
  },
];

// ── Position → role resolution ───────────────────────────────────────────────

interface RoleMatch {
  /** catalog slug this position resolves to */
  roleKey: string;
  /** keywords (lowercased) that identify the position from its free-text title */
  keywords: string[];
  /** display label for the tool page */
  label: string;
}

/**
 * Keyword table mapping a free-text `Brother.position` to a catalog role + a
 * position-specific tool-page label. Ordered most-specific first (e.g. "vice
 * president" must beat "president"). A position that matches nothing but still
 * reads as an officer gets a conservative generic set (see `officerToolset`).
 */
const ROLE_MATCHERS: RoleMatch[] = [
  { roleKey: "vice-president", keywords: ["vice president", "vice-president", "vp"], label: "Vice President Tools" },
  { roleKey: "president", keywords: ["president"], label: "President Tools" },
  { roleKey: "treasurer", keywords: ["treasurer", "finance"], label: "Treasurer Tools" },
  { roleKey: "secretary", keywords: ["secretary"], label: "Secretary Tools" },
  { roleKey: "recruitment-chair", keywords: ["recruitment", "rush", "membership chair"], label: "Recruitment Tools" },
  { roleKey: "risk-manager", keywords: ["risk"], label: "Risk Management Tools" },
  { roleKey: "social-chair", keywords: ["social"], label: "Social Tools" },
  { roleKey: "philanthropy-chair", keywords: ["philanthropy", "service chair"], label: "Philanthropy Tools" },
  { roleKey: "scholarship-chair", keywords: ["scholarship", "academic"], label: "Scholarship Tools" },
  { roleKey: "brotherhood-chair", keywords: ["brotherhood", "sisterhood"], label: "Brotherhood Tools" },
  { roleKey: "house-manager", keywords: ["house"], label: "House Tools" },
  { roleKey: "marshal", keywords: ["marshal", "pledge educator", "new member educator"], label: "Marshal Tools" },
  { roleKey: "alumni-relations", keywords: ["alumni"], label: "Alumni Tools" },
  { roleKey: "ifc-delegate", keywords: ["ifc", "delegate", "panhellenic"], label: "IFC Tools" },
];

const CATALOG_BY_SLUG: Record<string, OfficerPermissions> = Object.fromEntries(
  DEFAULT_OFFICER_CATALOG.map((s) => [s.slug, s.permissions]),
);

/** Normalize a position string for keyword matching. */
function norm(position: string | null | undefined): string {
  return (position || "").toLowerCase().trim();
}

/**
 * Resolve a free-text position to its catalog role match, or null when it does
 * not name a known officer seat.
 */
export function matchOfficerRole(position: string | null | undefined): RoleMatch | null {
  const p = norm(position);
  if (!p) return null;
  for (const m of ROLE_MATCHERS) {
    if (m.keywords.some((k) => p.includes(k))) return m;
  }
  return null;
}

/**
 * The default permission set for a free-text position, resolved via the catalog.
 * Unmatched officer-looking titles get a conservative read-only floor; plain
 * members get EMPTY_PERMISSIONS. Used by the mobile capabilities payload, which
 * only carries the member's `Brother.position` string (not their OfficerAssignment).
 */
export function permissionsForPosition(position: string | null | undefined): OfficerPermissions {
  const match = matchOfficerRole(position);
  if (match) {
    return CATALOG_BY_SLUG[match.roleKey] ?? { ...EMPTY_PERMISSIONS };
  }
  // Officer-looking but unmatched (a chapter-invented chair/officer title): give a
  // conservative read-only floor so their tool page is never empty, but never a
  // write they didn't earn.
  if (isGenericOfficerTitle(position)) {
    return { superAdmin: false, domain: { brothers: "read", events: "read", announcements: "read" } };
  }
  return { ...EMPTY_PERMISSIONS };
}

/** A title that reads as an officer seat but matched no specific role. */
function isGenericOfficerTitle(position: string | null | undefined): boolean {
  const p = norm(position);
  if (!p) return false;
  return ["chair", "officer", "exec", "director", "coordinator", "manager"].some((k) => p.includes(k));
}

/** Clean a raw position into a Title-Case-ish label stem for the fallback label. */
function labelStem(position: string | null | undefined): string {
  const p = (position || "").trim();
  if (!p) return "Officer";
  return p.replace(/\s+/g, " ");
}

/**
 * Build the position-specific tool page for an officer.
 *
 * @param position the member's REAL admin-set `Brother.position`.
 * @param permsOverride optional authoritative permission set (e.g. resolved from
 *        OfficerAssignment on the web/admin side); when omitted the position's
 *        catalog default is used.
 *
 * Returns the role label + the tools the permissions grant (in catalog order).
 * A plain member (no officer match, no override perms) returns an empty toolset —
 * the client renders NOTHING officer-related for them.
 */
export function officerToolset(
  position: string | null | undefined,
  permsOverride?: OfficerPermissions | null,
): OfficerToolset {
  const perms = permsOverride ?? permissionsForPosition(position);
  const match = matchOfficerRole(position);
  const roleKey = match?.roleKey ?? (isGenericOfficerTitle(position) ? "officer" : "member");
  const label = match?.label ?? `${labelStem(position)} Tools`;
  const tools = TOOL_CATALOG.filter((t) => hasPermission(perms, t.domain, t.action));
  return { roleKey, label, tools };
}

/** Convenience: the tool ids an officer may open (client tab-visibility filter). */
export function officerToolIds(
  position: string | null | undefined,
  permsOverride?: OfficerPermissions | null,
): OfficerSurface[] {
  return officerToolset(position, permsOverride).tools.map((t) => t.id);
}

export { SUPER_ADMIN_PERMISSIONS };
