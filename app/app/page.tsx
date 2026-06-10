import { listActiveTenants } from "@/lib/prisma";
import DemoLoader from "./DemoLoader";

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

  return <DemoLoader initialTenants={formattedTenants} />;
}
