"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  IconDashboard, IconRecruitment, IconMembers, IconEvents, IconCalendarTool, IconDues,
  IconTreasury, IconLaunch, IconWhiteLabel, IconSecurity, IconComms, IconAdmin,
  IconDirectory, IconStanding, IconFamilyTree, IconMeetings, IconRiskDesk,
  IconAcademic, IconChores, IconBallot, IconElections, IconService, IconLibrary,
  IconExports, IconPayouts, IconBilling, IconAuditLog, IconCommand, IconHelp,
  IconMenu, IconClose, IconChevronDown, IconExternal, IconSignOut, IconGrid,
} from "@/components/brand/icons";
import { cn } from "@/lib/utils";
import { PortalSwitcher } from "@/components/nav/PortalSwitcher";
import type { PortalDestination } from "@/components/nav/portal-nav";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  adminOnly: boolean;
  /** "primary" pins the item to the slim desktop bar; "more" tucks it into the
   *  "More" dropdown. Everything still appears in the mobile grid regardless. */
  group: "primary" | "more";
  /** GATE-3 FIX 4: the officer permission domain whose READ a non-admin officer
   *  must hold for this destination to be reachable. Omitted for the landing
   *  dashboard / polls / help (no single per-domain read gate — they self-scope
   *  or are always open). Used to HIDE links a non-admin officer can't read so
   *  they never click into the "access required" card. Admins (isAdmin) see all. */
  domain?: string;
};

// The six highest-traffic officer destinations stay pinned to the desktop bar;
// the rest collapse into a tidy "More" dropdown so the bar never overflows even
// with 16 sections. The mobile menu (below) keeps listing all of them in a grid.
// `domain` mirrors each page's checkOfficerPermission(domain,"read") gate.
export const ITEMS: NavItem[] = [
  { href: "/admin", label: "Rush", icon: IconDashboard, adminOnly: false, group: "primary" },
  { href: "/admin/rushees", label: "PNMs", icon: IconRecruitment, adminOnly: true, group: "primary" },
  { href: "/admin/brothers", label: "Brothers", icon: IconMembers, adminOnly: false, group: "primary", domain: "brothers" },
  { href: "/admin/directory", label: "Directory", icon: IconDirectory, adminOnly: false, group: "more", domain: "brothers" },
  { href: "/admin/standing", label: "Standing", icon: IconStanding, adminOnly: false, group: "more", domain: "siteSettings" },
  { href: "/admin/family", label: "Big/Little", icon: IconFamilyTree, adminOnly: true, group: "more", domain: "brothers" },
  { href: "/admin/events", label: "Events", icon: IconEvents, adminOnly: true, group: "primary", domain: "events" },
  { href: "/admin/meetings", label: "Meetings", icon: IconMeetings, adminOnly: false, group: "primary", domain: "brothers" },
  { href: "/admin/calendar", label: "Calendar", icon: IconCalendarTool, adminOnly: false, group: "more", domain: "events" },
  { href: "/admin/risk", label: "Risk Desk", icon: IconRiskDesk, adminOnly: false, group: "primary", domain: "risk" },

  { href: "/admin/academic", label: "Academic", icon: IconAcademic, adminOnly: false, group: "more", domain: "academic" },
  { href: "/admin/chores", label: "Chores", icon: IconChores, adminOnly: false, group: "more", domain: "house" },
  { href: "/admin/polls", label: "Polls", icon: IconBallot, adminOnly: false, group: "more" },
  { href: "/admin/elections", label: "Elections", icon: IconElections, adminOnly: false, group: "more", domain: "elections" },
  // News (announcements) is officer-reachable: the page + write API admit officers
  // holding announcements:read/write. adminOnly:true short-circuited the domain
  // filter and hid it from exactly those officers (same defect the money-nav fix
  // cured) — drop it so the `announcements` domain governs discovery.
  { href: "/admin/announcements", label: "News", icon: IconComms, adminOnly: false, group: "more", domain: "announcements" },
  { href: "/admin/service", label: "Service", icon: IconService, adminOnly: false, group: "more", domain: "service" },
  { href: "/admin/officers", label: "Officers", icon: IconSecurity, adminOnly: true, group: "more" },
  { href: "/admin/library", label: "Library", icon: IconLibrary, adminOnly: false, group: "more", domain: "documents" },
  { href: "/admin/exports", label: "Exports", icon: IconExports, adminOnly: true, group: "more" },
  // GATE-3 FIX (money nav discovery): the three TREASURER money surfaces are
  // officer-reachable — Treasury (payments), Dues hub (dues), Payouts (payments)
  // are all gated on the officer DOMAIN (page + API), so a non-admin Treasurer
  // who holds dues+payments must DISCOVER them. They were adminOnly:true, which
  // short-circuited before the domain filter (line ~131) and hid them from the
  // exact officer they belong to. Dropping adminOnly lets the existing `domain`
  // filter govern. Billing stays adminOnly (super-admin only — the platform
  // subscription, not chapter money).
  { href: "/admin/dues", label: "Dues", icon: IconDues, adminOnly: false, group: "more", domain: "dues" },
  { href: "/admin/dues/connect", label: "Payouts", icon: IconPayouts, adminOnly: false, group: "more", domain: "payments" },
  { href: "/admin/treasury", label: "Treasury", icon: IconTreasury, adminOnly: false, group: "more", domain: "payments" },
  { href: "/admin/billing", label: "Billing", icon: IconBilling, adminOnly: true, group: "more" },
  { href: "/admin/audit", label: "Audit log", icon: IconAuditLog, adminOnly: true, group: "more" },
  { href: "/admin/setup", label: "Setup wizard", icon: IconLaunch, adminOnly: true, group: "more" },
  { href: "/admin/settings", label: "Site content", icon: IconAdmin, adminOnly: true, group: "more", domain: "siteSettings" },
  { href: "/admin/website", label: "Website Builder", icon: IconWhiteLabel, adminOnly: true, group: "more", domain: "siteSettings" },
  { href: "/admin/forms", label: "Rush Form", icon: IconRecruitment, adminOnly: true, group: "more", domain: "siteSettings" },
  { href: "/admin/help", label: "Help", icon: IconHelp, adminOnly: false, group: "more" },
];

/**
 * Role/permission filter for the officer-console nav — the SINGLE predicate
 * shared by the top bar's mobile menu AND the left-side PortalSidebar (via
 * admin-shell) so both surfaces hide exactly the same links. Mirrors the
 * treasurer-money-nav test's `navItemVisible`:
 *   - adminOnly items require real admin access;
 *   - admins (and ungated items) always show;
 *   - a non-admin officer only sees a domain link they can actually read.
 */
export function filterNavItems(
  items: NavItem[],
  isAdmin: boolean,
  readableDomains?: string[],
): NavItem[] {
  const readable = new Set(readableDomains || []);
  return items.filter((it) => {
    if (it.adminOnly && !isAdmin) return false;
    if (isAdmin || !it.domain) return true;
    return readable.has(it.domain);
  });
}

/** Does `href` match `pathname` as an exact hit or a path-segment prefix? */
function hrefMatches(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
}

/**
 * Pick the SINGLE best-matching href among `items` for the current pathname —
 * the longest matching href wins. This guarantees exactly one active nav item:
 * on /admin/dues/connect only "Payouts" (/admin/dues/connect) highlights, not
 * also "Dues" (/admin/dues), since the longer prefix is preferred.
 */
function bestActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const it of items) {
    if (hrefMatches(pathname, it.href) && (best === null || it.href.length > best.length)) {
      best = it.href;
    }
  }
  return best;
}

export function AdminNav({
  isAdmin = true,
  readableDomains,
  portalDestinations,
}: {
  isAdmin?: boolean;
  /** GATE-3 FIX 4: the per-domain READ permissions a NON-ADMIN officer holds.
   *  Links whose `domain` is not in this set are hidden so an officer never sees
   *  a tab they'd only get an "access required" card from. Ignored for admins
   *  (who see everything). `undefined` = no filtering (back-compat / admin). */
  readableDomains?: string[];
  /** Authorized portal-switcher destinations (computed server-side). When absent
   *  or single, the switcher renders a static chip. */
  portalDestinations?: PortalDestination[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  // The full per-role visible section list (shared predicate with the left
  // PortalSidebar). The desktop primary sections now live in the sidebar; here
  // the list drives the mobile grid menu.
  const items = React.useMemo(
    () => filterNavItems(ITEMS, isAdmin, readableDomains),
    [isAdmin, readableDomains],
  );

  // Compute the single active href across ALL visible items (longest match
  // wins) so exactly one nav item highlights — on /admin/dues/connect that's
  // "Payouts", never also "Dues".
  const activeHref = bestActiveHref(pathname, items);

  // Close mobile menu on route change
  React.useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/admin" className="hover:opacity-90 shrink-0">
          <Wordmark variant="compact" />
        </Link>

        {/* Portal switcher — "flip through from the top" between the persona
            areas this session is authorized for. The per-section links now live
            in the left PortalSidebar (desktop) + the mobile grid menu (below),
            so the top bar stays slim and never wraps. */}
        {portalDestinations && portalDestinations.length > 0 && (
          <div className="hidden lg:flex min-w-0">
            <PortalSwitcher
              current="admin"
              destinations={portalDestinations}
              isAdminOverride={isAdmin}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* ⌘K discovery hint — desktop only, dispatches a synthetic ⌘K
              keydown so users who click it open the CommandPalette without
              having to know the shortcut. The palette listens at the window
              level and toggles on (meta|ctrl)+K. */}
          <button
            type="button"
            onClick={() => {
              const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true });
              window.dispatchEvent(ev);
            }}
            className="hidden lg:inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:border-phisig-red/40 transition-colors"
            title="Open command palette (⌘K)"
            aria-label="Open command palette"
          >
            <IconCommand className="h-3.5 w-3.5" aria-hidden="true" />
            Quick jump
            <kbd className="ml-1 rounded border border-border bg-secondary px-1 text-[10px]">⌘K</kbd>
          </button>

          {/* Quick Help button — mobile only (desktop reaches Help via "More") */}
          <Link
            href="/admin/help"
            className="lg:hidden inline-flex items-center gap-1 text-muted-foreground hover:text-phisig-red px-2 py-1 rounded-md text-xs"
            title="Help"
          >
            <IconHelp className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Help</span>
          </Link>

          <Link
            href="/"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary hover:border-phisig-red/40 transition-colors"
            title="Open the public homepage in a new tab"
          >
            <IconExternal className="h-3.5 w-3.5 text-phisig-red" aria-hidden="true" />
            <span className="hidden md:inline">View site</span>
          </Link>

          <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex">
            <IconSignOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Sign out</span>
          </Button>

          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-label={menuOpen ? "Close admin menu" : "Open admin menu"}
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
          >
            {menuOpen ? <IconClose className="h-4 w-4" aria-hidden="true" /> : <IconMenu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown — keeps the full section grid for small screens. */}
      {menuOpen && (
        <div id="admin-mobile-menu" className="lg:hidden border-t border-border bg-background animate-fade-in max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain">
          <nav aria-label="Admin sections (mobile)" className="container py-2 grid grid-cols-2 gap-1">
            {items.map((it) => {
              const active = it.href === activeHref;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-phisig-red text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <it.icon className="h-4 w-4" aria-hidden="true" />
                  {it.label}
                </Link>
              );
            })}
            {/* Switch portal — the top-bar PortalSwitcher is desktop-only
                (hidden lg:flex), so on phones an admin needs a way to flip to
                the member / alumni portals they're authorized for. Render the
                authorized destinations here when there's more than one door. */}
            {portalDestinations && portalDestinations.length > 1 && (
              <div className="col-span-2 border-t border-border mt-2 pt-2">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Switch portal
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {portalDestinations.map((d) => {
                    const isCurrent = d.key === "admin";
                    return (
                      <Link
                        key={d.key}
                        href={d.href}
                        aria-current={isCurrent ? "page" : undefined}
                        className={cn(
                          "inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors",
                          isCurrent
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {d.label}
                        {isCurrent && (
                          <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Current
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground col-span-2 border-t border-border mt-2 pt-3"
            >
              <IconSignOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
