"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * One entry in the left-side page rail. An item is EITHER a link (has `href`,
 * navigates via next/link) or a tab (has `onSelect`, drives client state on the
 * current page). `active` may be set explicitly (tab-mode); for link items it is
 * derived from the current pathname (longest-prefix match wins) when omitted.
 */
export interface PortalSidebarItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Link-mode: navigate to this route. */
  href?: string;
  /** Tab-mode: run this on click instead of navigating. */
  onSelect?: () => void;
  /** Explicit active state (tab-mode, or to force a link active). */
  active?: boolean;
  /** Small trailing count/label (e.g. unread announcements). */
  badge?: string | number;
}

/** Does `href` match `pathname` as an exact hit or a path-segment prefix? */
function hrefMatches(pathname: string, href: string, homeHref?: string): boolean {
  if (pathname === href) return true;
  // The persona home route should not prefix-match every sub-page.
  if (homeHref && href === homeHref) return false;
  return pathname.startsWith(href + "/");
}

/**
 * Reusable left-side navigation rail. Presentational + role-agnostic: the CALLER
 * decides which items to pass (and does any role/permission filtering upstream),
 * so the exact same component serves the officer console, the member portal, and
 * the alumni portal. No responsive hiding of its own — callers wrap it (a sticky
 * desktop column, or the panel of a mobile drawer).
 */
export function PortalSidebar({
  items,
  ariaLabel = "Section navigation",
  heading,
  homeHref,
  className,
}: {
  items: PortalSidebarItem[];
  ariaLabel?: string;
  /** Optional small eyebrow above the list (e.g. "Officer Console"). */
  heading?: string;
  /** The persona home route, so it only highlights on an exact match. */
  homeHref?: string;
  className?: string;
}) {
  const pathname = usePathname() || "";

  // Resolve the single active LINK item (longest matching href wins) so exactly
  // one link highlights. Tab items carry their own explicit `active`.
  const activeLinkHref = React.useMemo(() => {
    let best: string | null = null;
    for (const it of items) {
      if (it.href && it.active === undefined && hrefMatches(pathname, it.href, homeHref)) {
        if (best === null || it.href.length > best.length) best = it.href;
      }
    }
    return best;
  }, [items, pathname, homeHref]);

  return (
    <nav aria-label={ariaLabel} className={cn("flex flex-col gap-0.5", className)}>
      {heading && (
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {heading}
        </p>
      )}
      {items.map((it) => {
        const isActive =
          it.active !== undefined ? it.active : it.href === activeLinkHref;
        const Icon = it.icon;

        const inner = (
          <>
            {/* Brand-colored active accent bar. */}
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-all",
                isActive ? "opacity-100" : "opacity-0",
              )}
              style={{ backgroundColor: "hsl(var(--primary))" }}
            />
            {Icon && (
              // The icon (with the accent bar) carries the brand color via
              // currentColor; the label stays text-foreground so a light brand
              // color keeps AA contrast. The Icon components accept only
              // className, so the tint rides on a wrapping span's color.
              <span
                className="inline-flex shrink-0"
                style={isActive ? { color: "hsl(var(--primary))" } : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "" : "text-muted-foreground",
                  )}
                />
              </span>
            )}
            <span className="truncate">{it.label}</span>
            {it.badge != null && it.badge !== "" && (
              <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {it.badge}
              </span>
            )}
          </>
        );

        const cls = cn(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        );
        // Tinted active background driven by the chapter brand var so the rail
        // re-brands per tenant with no hardcoded color. The label itself stays
        // text-foreground (from `cls`) so a light brand color keeps AA contrast;
        // only the accent bar + icon carry hsl(var(--primary)).
        const activeStyle: React.CSSProperties | undefined = isActive
          ? { backgroundColor: "hsl(var(--primary) / 0.10)" }
          : undefined;

        if (it.onSelect) {
          return (
            <button
              key={it.key}
              type="button"
              onClick={it.onSelect}
              aria-current={isActive ? "page" : undefined}
              className={cls}
              style={activeStyle}
            >
              {inner}
            </button>
          );
        }
        return (
          <Link
            key={it.key}
            href={it.href || "#"}
            aria-current={isActive ? "page" : undefined}
            className={cls}
            style={activeStyle}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
