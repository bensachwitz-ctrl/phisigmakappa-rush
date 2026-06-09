import { listActiveTenants } from "@/lib/prisma";
import MobileAppClient from "./MobileAppClient";

export const dynamic = "force-dynamic";

export default async function MobileAppPage() {
  const tenants = await listActiveTenants();
  
  // Format the dates/objects to plain JSON safe props
  const formattedTenants = tenants.map(t => ({
    id: t.id,
    subdomain: t.subdomain,
    name: t.name,
    school: t.school,
    isActive: t.isActive,
  }));

  return <MobileAppClient initialTenants={formattedTenants} />;
}
