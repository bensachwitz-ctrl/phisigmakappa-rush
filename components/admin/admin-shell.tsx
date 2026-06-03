"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { CommandPalette } from "@/components/admin/command-palette";

export function AdminShell({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/admin/login");
  return (
    <div className="min-h-screen bg-phisig-mist">
      {!isLogin && <AdminNav isAdmin={isAdmin} />}
      {/* CommandPalette mounts itself globally and listens for ⌘K / Ctrl+K
          at the window level. Renders nothing visible until opened. Skipped
          on the login screen so a misfired keypress doesn't open a palette
          full of admin-only routes the user can't access yet. */}
      {!isLogin && <CommandPalette isAdmin={isAdmin} />}
      <div>{children}</div>
    </div>
  );
}
