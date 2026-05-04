import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  return <AdminShell isAdmin={!!session?.isAdmin}>{children}</AdminShell>;
}
