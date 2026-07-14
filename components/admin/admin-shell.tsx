"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AdminNav, ITEMS, filterNavItems } from "@/components/admin/admin-nav";
import { CommandPalette, CommandPaletteLauncher } from "@/components/admin/command-palette";
import { PortalSidebar, type PortalSidebarItem } from "@/components/nav/PortalSidebar";
import { buildPortalDestinations } from "@/components/nav/portal-nav";

export function AdminShell({
  children,
  isAdmin = false,
  readableDomains,
  banner = null,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  /** GATE-3 FIX 4: per-domain READ permissions a NON-ADMIN officer holds, passed
   *  through to AdminNav so domain links they can't read are hidden. Ignored for
   *  admins (who see every link). */
  readableDomains?: string[];
  /** Optional soft-gate billing banner rendered above the nav. Self-hides on the
   *  login screen and when entitled/dismissed (the banner decides internally). */
  banner?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/admin/login");

  // Authorized portal-switcher destinations. A super-admin may flip into any
  // portal (admin override); a non-admin officer only ever sees the officer
  // console — buildPortalDestinations enforces that no admin→member escalation
  // and, more importantly, never surfaces admin to a non-admin. `current`
  // is "admin" because this shell only ever wraps the officer console.
  const portalDestinations = React.useMemo(
    () => buildPortalDestinations({ current: "admin", isAdmin }),
    [isAdmin],
  );

  // The left-rail sections — same role/permission filter as the mobile menu, so
  // the two nav surfaces can never drift. Mapped to the generic sidebar shape.
  const sidebarItems: PortalSidebarItem[] = React.useMemo(
    () =>
      filterNavItems(ITEMS, isAdmin, readableDomains).map((it) => ({
        key: it.href,
        label: it.label,
        href: it.href,
        icon: it.icon,
      })),
    [isAdmin, readableDomains],
  );

  // The CommandPalette owns its own open state and toggles on a window-level
  // ⌘K / Ctrl+K keydown. To open it from the floating mobile launcher (which
  // has no shortcut affordance) we dispatch that same synthetic keydown —
  // identical to the desktop "Quick jump" button in AdminNav — so we never
  // have to lift the palette's internal state out and risk changing desktop
  // behavior.
  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }));
  }

  return (
    <div className="relative min-h-screen bg-brand-mist">
      {/* Branded ambient backdrop — two soft, fixed brand-tinted radial washes
          (top-left + a warm band beneath the nav) lift the flat mist canvas into
          a quietly premium surface without ever competing with content. Purely
          decorative, GPU-cheap (static gradients, no blur/animation), and hidden
          on the login screen so the auth view stays clean. */}
      {!isLogin && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-0"
          style={{
            background:
              "radial-gradient(60rem 32rem at 12% -8%, hsl(var(--primary) / 0.07), transparent 60%), radial-gradient(48rem 26rem at 100% 0%, hsl(var(--primary) / 0.045), transparent 55%)",
          }}
        />
      )}
      {/* Soft-gate billing banner — rendered above the nav. The banner self-hides
          on the login screen, when the subscription is healthy, and when the
          admin dismissed it this session. It never blocks the app. */}
      <div className="relative z-10">
        {!isLogin && banner}
        {!isLogin && (
          <AdminNav
            isAdmin={isAdmin}
            readableDomains={readableDomains}
            portalDestinations={portalDestinations}
          />
        )}
        {/* CommandPalette mounts itself globally and listens for ⌘K / Ctrl+K
            at the window level. Renders nothing visible until opened. Skipped
            on the login screen so a misfired keypress doesn't open a palette
            full of admin-only routes the user can't access yet. */}
        {!isLogin && <CommandPalette isAdmin={isAdmin} readableDomains={readableDomains} />}
        {/* Floating mobile launcher so touch users can reach the palette without
            knowing the ⌘K shortcut. It triggers the exact same open mechanism. */}
        {!isLogin && <CommandPaletteLauncher onOpen={openPalette} />}

        {!isLogin ? (
          <div className="mx-auto flex w-full max-w-[112rem] gap-6 px-4 py-6 sm:px-6">
            {/* Left page rail — the officer console's MAIN sections. Desktop only;
                on mobile the same sections live in AdminNav's hamburger grid, so
                there is no duplicate nav. Sticky under the 4rem header. */}
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-20">
                <div className="rounded-xl border border-border bg-card/60 p-2 shadow-sm backdrop-blur-sm">
                  <PortalSidebar
                    items={sidebarItems}
                    ariaLabel="Officer console sections"
                    heading="Chapter"
                    homeHref="/admin"
                  />
                </div>
              </div>
            </aside>
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        ) : (
          <div>{children}</div>
        )}
      </div>
    </div>
  );
}
