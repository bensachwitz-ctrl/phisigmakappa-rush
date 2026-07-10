// portal-nav.ts — the authorization + shape layer for the unified per-role
// navigation shell (top portal-switcher + left-side page rail). PURE TypeScript,
// no React and no server imports, so it is trivially unit-testable and safe to
// import from both server pages and client components.
//
// SECURITY NOTE (read before editing buildPortalDestinations):
// The portal-switcher must only ever expose destinations the CURRENT session is
// actually authorized for. A plain member/alumni session may reach ONLY the
// member/alumni portals it is linked to — NEVER the officer/admin console. The
// admin console is added to the destination set exclusively when the session is
// a real admin override (isAdmin === true) OR the caller is already server-side
// inside the admin area (current === "admin", which the admin layout only
// renders after its own officer-access gate). The actual auth boundaries live in
// lib/portal-auth.ts and app/admin/layout.tsx; this function never widens them —
// it only decides which authorized doors to DRAW.

/** The three persona areas a user can flip between from the top switcher. */
export type PortalKey = "admin" | "member" | "alumni";

/** Portal role as carried by a portal session cookie (mirrors PortalRole in
 *  lib/portal-auth.ts, redeclared here to keep this module dependency-free). */
export type PortalRoleLike = "brother" | "alumni" | "pnm";

export interface PortalDestination {
  key: PortalKey;
  /** Human label shown in the switcher (e.g. "Member Portal"). */
  label: string;
  /** Short one-line descriptor for the switcher menu row. */
  description: string;
  /** The persona's home route the switcher navigates to via next/link. */
  href: string;
}

/** Canonical home route + copy for each persona area. Single source of truth so
 *  the switcher, breadcrumbs, and any deep-link land on the same destinations. */
export const PORTAL_HOMES: Record<PortalKey, Omit<PortalDestination, "key">> = {
  admin: {
    label: "Officer Console",
    description: "Manage the chapter, roster, dues, and events.",
    href: "/admin",
  },
  member: {
    label: "Member Portal",
    description: "Your dashboard, events, service hours, and dues.",
    href: "/portal/brothers/dashboard",
  },
  alumni: {
    label: "Alumni Portal",
    description: "Stay connected, give back, and mentor actives.",
    href: "/portal/alumni/dashboard",
  },
};

/**
 * Decide which portals the current session may flip to. Returns them in a stable
 * order (admin, member, alumni) and always includes `current` so the switcher can
 * render the active portal even when it is the only option.
 *
 * Rules (see SECURITY NOTE above):
 *  - A real admin override (isAdmin) may view every portal.
 *  - Otherwise the session only gets the portals it is linked to: its own current
 *    portal, plus member/alumni when a matching linked profile exists.
 *  - The admin console is NEVER offered to a non-admin session unless it is
 *    already legitimately inside the admin area (current === "admin").
 */
export function buildPortalDestinations(opts: {
  current: PortalKey;
  isAdmin: boolean;
  hasBrotherProfile?: boolean;
  hasAlumniProfile?: boolean;
}): PortalDestination[] {
  const keys = new Set<PortalKey>();
  // You can always "switch" to the portal you are currently in.
  keys.add(opts.current);

  if (opts.isAdmin) {
    // Admin override: authorized to view every portal (with the override banner
    // each portal already renders). This is the only path that adds "admin" for
    // a caller who wasn't already there.
    keys.add("admin");
    keys.add("member");
    keys.add("alumni");
  } else {
    // Plain portal session: only the portals backed by a linked profile.
    if (opts.hasBrotherProfile) keys.add("member");
    if (opts.hasAlumniProfile) keys.add("alumni");
    // HARD BOUNDARY: a non-admin session never reaches the officer console via
    // the switcher. If it isn't already inside /admin, drop any admin key.
    if (opts.current !== "admin") keys.delete("admin");
  }

  const order: PortalKey[] = ["admin", "member", "alumni"];
  return order
    .filter((k) => keys.has(k))
    .map((key) => ({ key, ...PORTAL_HOMES[key] }));
}
