import { centralDb } from "@/lib/prisma";
import DemoLoader from "./DemoLoader";

export const dynamic = "force-dynamic";

/**
 * This is the WEB /app route (the React member client). The native iOS app no
 * longer loads it: capacitor.config.ts has server.url REMOVED and ships the
 * bundled mobile-shell/index.html instead, which reaches the same chapters over
 * /api/mobile/*. This route still serves the marketing-site /app preview and any
 * browser that opens /app directly. We read the CENTRAL chapter registry
 * (public."Tenant") so the cold-start School→Chapter picker is built from REAL
 * chapters. We widen the
 * select beyond listActiveTenants() to include `domain` (custom-domain routing)
 * and `isActive` so the client can route + badge correctly. Fully defensive: any
 * DB hiccup yields [] and the picker falls back to the inert demo chapters.
 */
async function loadRegistryChapters() {
  try {
    const rows = await centralDb.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true,
        subdomain: true,
        name: true,
        school: true,
        domain: true,
        isActive: true,
      },
      orderBy: [{ school: "asc" }, { name: "asc" }],
    });
    return rows.filter((r) => !!r.subdomain);
  } catch {
    return [];
  }
}

export default async function MobileAppPage() {
  const rows = await loadRegistryChapters();

  // Plain JSON-safe props (no Date/objects) for the client boundary.
  const formattedTenants = rows.map((t) => ({
    id: t.id,
    subdomain: t.subdomain,
    name: t.name,
    school: t.school,
    domain: t.domain,
    isActive: t.isActive,
  }));

  // Server-computed flag so the picker can show "real vs demo" states without a
  // client round-trip: true when the registry has ≥1 real active chapter.
  const hasRealChapters = formattedTenants.length > 0;

  return (
    <DemoLoader initialTenants={formattedTenants} hasRealChapters={hasRealChapters} />
  );
}
