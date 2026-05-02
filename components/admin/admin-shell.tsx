"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/admin/login");
  return (
    <div className="min-h-screen bg-phisig-mist">
      {!isLogin && <AdminNav />}
      <div>{children}</div>
    </div>
  );
}
