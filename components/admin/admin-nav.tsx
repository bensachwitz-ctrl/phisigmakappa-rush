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
  LogOut, LayoutDashboard, CalendarDays, Users, Megaphone, Settings,
  HelpCircle, Menu, X, ExternalLink, Vote, UserPlus, GraduationCap, CheckSquare, ShieldAlert,
  ShieldCheck, CalendarCheck, HandHeart, BookMarked, FileDown, LayoutGrid, ChevronDown, Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly: boolean;
  /** "primary" pins the item to the slim desktop bar; "more" tucks it into the
   *  "More" dropdown. Everything still appears in the mobile grid regardless. */
  group: "primary" | "more";
};

// The six highest-traffic officer destinations stay pinned to the desktop bar;
// the rest collapse into a tidy "More" dropdown so the bar never overflows even
// with 16 sections. The mobile menu (below) keeps listing all of them in a grid.
const ITEMS: NavItem[] = [
  { href: "/admin", label: "Rush", icon: LayoutDashboard, adminOnly: false, group: "primary" },
  { href: "/admin/rushees", label: "PNMs", icon: UserPlus, adminOnly: true, group: "primary" },
  { href: "/admin/brothers", label: "Brothers", icon: Users, adminOnly: false, group: "primary" },
  { href: "/admin/events", label: "Events", icon: CalendarDays, adminOnly: true, group: "primary" },
  { href: "/admin/meetings", label: "Meetings", icon: CalendarCheck, adminOnly: false, group: "primary" },
  { href: "/admin/risk", label: "Risk Desk", icon: ShieldAlert, adminOnly: false, group: "primary" },

  { href: "/admin/academic", label: "Academic", icon: GraduationCap, adminOnly: false, group: "more" },
  { href: "/admin/chores", label: "Chores", icon: CheckSquare, adminOnly: false, group: "more" },
  { href: "/admin/polls", label: "Polls", icon: Vote, adminOnly: false, group: "more" },
  { href: "/admin/announcements", label: "News", icon: Megaphone, adminOnly: true, group: "more" },
  { href: "/admin/service", label: "Service", icon: HandHeart, adminOnly: false, group: "more" },
  { href: "/admin/officers", label: "Officers", icon: ShieldCheck, adminOnly: true, group: "more" },
  { href: "/admin/library", label: "Library", icon: BookMarked, adminOnly: false, group: "more" },
  { href: "/admin/exports", label: "Exports", icon: FileDown, adminOnly: true, group: "more" },
  { href: "/admin/settings", label: "Site content", icon: Settings, adminOnly: true, group: "more" },
  { href: "/admin/help", label: "Help", icon: HelpCircle, adminOnly: false, group: "more" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

export function AdminNav({ isAdmin = true }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const items = ITEMS.filter((it) => !it.adminOnly || isAdmin);

  const primaryItems = items.filter((it) => it.group === "primary");
  // "Help" gets its own dedicated affordance on desktop, so keep it out of the
  // overflow dropdown to avoid duplication; it still lives in the mobile grid.
  const moreItems = items.filter((it) => it.group === "more" && it.href !== "/admin/help");

  // Surface the active overflow section on the "More" trigger so the user keeps
  // their bearings when they're on, say, /admin/officers.
  const activeMore = moreItems.find((it) => isActive(pathname, it.href));

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

        {/* Desktop nav — pinned primary items + a "More" overflow dropdown so the
            bar stays slim and never wraps. */}
        <nav aria-label="Admin sections" className="hidden lg:flex items-center gap-0.5 min-w-0">
          {primaryItems.map((it) => {
            const active = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-phisig-red text-white shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <it.icon className="h-4 w-4" aria-hidden="true" />
                {it.label}
              </Link>
            );
          })}

          {moreItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-current={activeMore ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-[state=open]:bg-secondary data-[state=open]:text-foreground",
                    activeMore
                      ? "bg-phisig-red text-white shadow-sm hover:bg-phisig-red-dark data-[state=open]:bg-phisig-red-dark data-[state=open]:text-white"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {activeMore ? (
                    <activeMore.icon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                  )}
                  {activeMore ? activeMore.label : "More"}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Chapter sections</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {moreItems.map((it) => {
                  const active = isActive(pathname, it.href);
                  return (
                    <DropdownMenuItem key={it.href} asChild>
                      <Link
                        href={it.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          active && "bg-phisig-red/10 text-phisig-red focus:bg-phisig-red/15 focus:text-phisig-red"
                        )}
                      >
                        <it.icon
                          className={cn("h-4 w-4", active ? "text-phisig-red" : "text-muted-foreground")}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{it.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

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
            <Command className="h-3.5 w-3.5" />
            Quick jump
            <kbd className="ml-1 rounded border border-border bg-secondary px-1 text-[10px]">⌘K</kbd>
          </button>

          {/* Quick Help button — mobile only (desktop reaches Help via "More") */}
          <Link
            href="/admin/help"
            className="lg:hidden inline-flex items-center gap-1 text-muted-foreground hover:text-phisig-red px-2 py-1 rounded-md text-xs"
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Help</span>
          </Link>

          <Link
            href="/"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary hover:border-phisig-red/40 transition-colors"
            title="Open the public homepage in a new tab"
          >
            <ExternalLink className="h-3.5 w-3.5 text-phisig-red" />
            <span className="hidden md:inline">View site</span>
          </Link>

          <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Sign out</span>
          </Button>

          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-label={menuOpen ? "Close admin menu" : "Open admin menu"}
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown — keeps the full section grid for small screens. */}
      {menuOpen && (
        <div id="admin-mobile-menu" className="lg:hidden border-t border-border bg-background animate-fade-in">
          <nav aria-label="Admin sections (mobile)" className="container py-2 grid grid-cols-2 gap-1">
            {items.map((it) => {
              const active = isActive(pathname, it.href);
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
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground col-span-2 border-t border-border mt-2 pt-3"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
