"use client";

import * as React from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  IconShieldCheck,
  IconMembers,
  IconGraduation,
  IconChevronDown,
} from "@/components/brand/icons";
import { cn } from "@/lib/utils";
import type { PortalKey, PortalDestination } from "@/components/nav/portal-nav";

const ICONS: Record<PortalKey, React.ComponentType<{ className?: string }>> = {
  admin: IconShieldCheck,
  member: IconMembers,
  alumni: IconGraduation,
};

/**
 * Top-bar portal switcher — lets a user "flip through from the top" between the
 * persona areas they are authorized for. It is a DUMB renderer: the caller (a
 * server layout/page) computes `destinations` via buildPortalDestinations, which
 * is the single place that enforces authorization. This component never adds a
 * destination on its own, so it can never expose a portal the session lacks.
 *
 * When there is only one authorized destination it renders a static chip (no
 * menu) — the user has nowhere else to flip to.
 */
export function PortalSwitcher({
  current,
  destinations,
  isAdminOverride = false,
  className,
}: {
  current: PortalKey;
  destinations: PortalDestination[];
  /** True when the viewer is here via a real admin override (adds a badge). */
  isAdminOverride?: boolean;
  className?: string;
}) {
  const CurrentIcon = ICONS[current];
  const currentLabel = destinations.find((d) => d.key === current)?.label
    ?? (current === "admin" ? "Officer Console" : current === "member" ? "Member Portal" : "Alumni Portal");

  const chip = (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span
        aria-hidden
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
        style={{ backgroundColor: "hsl(var(--primary))" }}
      >
        <CurrentIcon className="h-3.5 w-3.5" />
      </span>
      <span className="flex flex-col items-start leading-tight min-w-0">
        <span className="truncate text-sm font-semibold text-foreground">{currentLabel}</span>
        {isAdminOverride && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
            Admin override
          </span>
        )}
      </span>
    </span>
  );

  // Only one door: render a non-interactive chip.
  if (destinations.length <= 1) {
    return (
      <div className={cn("inline-flex min-h-[44px] items-center rounded-lg px-2 py-1", className)}>
        {chip}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 transition-colors hover:bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-[state=open]:bg-secondary",
            className,
          )}
          aria-label="Switch portal"
        >
          {chip}
          <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch portal</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {destinations.map((d) => {
          const Icon = ICONS[d.key];
          const active = d.key === current;
          return (
            <DropdownMenuItem key={d.key} asChild>
              <Link
                href={d.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-start gap-2.5 py-2",
                  active && "bg-secondary",
                )}
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{d.label}</span>
                  <span className="text-xs text-muted-foreground">{d.description}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
