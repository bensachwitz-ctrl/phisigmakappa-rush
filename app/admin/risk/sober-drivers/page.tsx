import { checkOfficerPermission } from "@/lib/permissions";
import { OfficerAccessRequired } from "@/components/admin/officer-access-required";
import { SoberDriverScheduler } from "@/components/admin/sober-driver-scheduler";

export const dynamic = "force-dynamic";

// Sober-driver scheduling for the Risk Manager (owner spec: "Risk Mgmt = select
// + log sober driver"). Gated on the RISK domain — read to open, write to
// select/log — using the non-throwing checkOfficerPermission + the shared
// access-required card (same graceful pattern as /admin/risk). This surfaces the
// select/log UI under a risk-officer path so a Risk Manager who holds risk:write
// (but not rushPipeline) can reach it, instead of it living only on the
// rushPipeline-gated /admin/rushees page.
export default async function SoberDriversPage() {
  const { allowed: canRead } = await checkOfficerPermission("risk", "read");
  if (!canRead) return <OfficerAccessRequired title="Sober Driver Schedule" permission="Risk" />;
  const { allowed: canWrite } = await checkOfficerPermission("risk", "write");

  return (
    <div className="container py-8">
      <SoberDriverScheduler canWrite={canWrite} />
    </div>
  );
}
