"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { CommandPalette, CommandPaletteLauncher } from "@/components/admin/command-palette";

export function AdminShell({
  children,
  isAdmin = false,
  banner = null,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
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
    <div className="min-h-screen bg-phisig-mist">
      {/* Soft-gate billing banner — rendered above the nav. The banner self-hides
          on the login screen, when the subscription is healthy, and when the
          admin dismissed it this session. It never blocks the app. */}
      {!isLogin && banner}
      {!isLogin && <AdminNav isAdmin={isAdmin} />}
      {/* CommandPalette mounts itself globally and listens for ⌘K / Ctrl+K
          at the window level. Renders nothing visible until opened. Skipped
          on the login screen so a misfired keypress doesn't open a palette
          full of admin-only routes the user can't access yet. */}
      {!isLogin && <CommandPalette isAdmin={isAdmin} />}
      {/* Floating mobile launcher so touch users can reach the palette without
          knowing the ⌘K shortcut. It triggers the exact same open mechanism. */}
      {!isLogin && <CommandPaletteLauncher onOpen={openPalette} />}
      <div>{children}</div>
    </div>
  );
}
