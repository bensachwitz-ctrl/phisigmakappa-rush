"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, CalendarDays, Users, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  const items = [
    { href: "/admin", label: "Rush", icon: LayoutDashboard },
    { href: "/admin/brothers", label: "Brothers", icon: Users },
    { href: "/admin/events", label: "Events", icon: CalendarDays },
    { href: "/admin/announcements", label: "News", icon: Megaphone },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/admin" className="hover:opacity-90">
          <Wordmark variant="compact" />
        </Link>
        <nav className="flex items-center gap-1">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== "/admin" && pathname.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
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
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    </header>
  );
}
