"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { CommandPalette, CommandPaletteLauncher } from "@/components/admin/command-palette";

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
    <div className="relative min-h-screen bg-phisig-mist">
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
        {!isLogin && <AdminNav isAdmin={isAdmin} readableDomains={readableDomains} />}
        {/* CommandPalette mounts itself globally and listens for ⌘K / Ctrl+K
            at the window level. Renders nothing visible until opened. Skipped
            on the login screen so a misfired keypress doesn't open a palette
            full of admin-only routes the user can't access yet. */}
        {!isLogin && <CommandPalette isAdmin={isAdmin} readableDomains={readableDomains} />}
        {/* Floating mobile launcher so touch users can reach the palette without
            knowing the ⌘K shortcut. It triggers the exact same open mechanism. */}
        {!isLogin && <CommandPaletteLauncher onOpen={openPalette} />}
        <div>{children}</div>
      </div>
    </div>
  );
}
