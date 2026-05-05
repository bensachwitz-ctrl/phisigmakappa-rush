"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import {
  LogOut, LayoutDashboard, CalendarDays, Users, Megaphone, Settings,
  HelpCircle, Menu, X, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Rush", icon: LayoutDashboard, adminOnly: false },
  { href: "/admin/brothers", label: "Brothers", icon: Users, adminOnly: false },
  { href: "/admin/events", label: "Events", icon: CalendarDays, adminOnly: true },
  { href: "/admin/announcements", label: "News", icon: Megaphone, adminOnly: true },
  { href: "/admin/settings", label: "Site", icon: Settings, adminOnly: true },
  { href: "/admin/help", label: "Help", icon: HelpCircle, adminOnly: false },
];

export function AdminNav({ isAdmin = true }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const items = ITEMS.filter((it) => !it.adminOnly || isAdmin);

  // Close mobile menu on route change
  React.useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/admin" className="hover:opacity-90 shrink-0">
          <Wordmark variant="compact" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== "/admin" && pathname.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors whitespace-nowrap",
                  active
                    ? "bg-phisig-red text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <it.icon className="h-3.5 w-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Quick Help button — always visible */}
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
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary hover:border-phisig-red/40 transition-colors"
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
            aria-label="Open menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container py-2 grid grid-cols-2 gap-1">
            {items.map((it) => {
              const active = pathname === it.href || (it.href !== "/admin" && pathname.startsWith(it.href));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-phisig-red text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground col-span-2 border-t border-border mt-2 pt-3"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
