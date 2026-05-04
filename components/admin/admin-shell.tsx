"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";

export function AdminShell({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/admin/login");
  return (
    <div className="min-h-screen bg-phisig-mist">
      {!isLogin && <AdminNav isAdmin={isAdmin} />}
      <div>{children}</div>
    </div>
  );
}
