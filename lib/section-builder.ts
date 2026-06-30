import { prisma } from "@/lib/prisma";

/**
 * Section-builder foundation — server helpers.
 *
 * The public chapter site has always read its section ORDER from
 * cfg["website.sections"] (a JSON string in SiteConfig) and its per-section copy
 * from the *.json repeaters + the show.* toggles. This module is the typed,
 * structured SUCCESSOR to that approach (Prisma `Section` + `SectionContent`),
 * layered on top WITHOUT changing the legacy behavior:
 *
 *   • When a tenant has ZERO `Section` rows, every reader here returns null/empty
 *     and the renderer falls back to the EXACT legacy SiteConfig render. An
 *     un-migrated / un-customized tenant is therefore byte-for-byte identical to
 *     before this feature existed.
 *   • The tables may not exist yet on an existing tenant schema (Greek Stack is
 *     single-tenant-per-schema; the manual migration is owner-applied). Every read
 *     is wrapped so a missing table resolves to "no override", never a 500 on the
 *     public site.
 *
 * The only thing that activates the structured path is an admin SAVING a layout
 * through /api/admin/website/[section], which self-heals the tables (see
 * ensureSectionTables) and writes rows.
 */

export interface SectionContentMap {
  [field: string]: string;
}

export interface SectionRecord {
  key: string;
  sortOrder: number;
  visible: boolean;
  content: SectionContentMap;
}

/**
 * Self-heal the Section + SectionContent tables on the CURRENT request's tenant
 * schema. Idempotent (CREATE TABLE IF NOT EXISTS) and only ever called from an
 * admin-gated mutation, so the open public path never issues DDL. Mirrors the
 * tenant-bootstrap self-heal pattern used elsewhere in the app.
 *
 * Returns true on success, false if the DDL failed (caller treats that as
 * "structured store unavailable" and the public site keeps using the legacy
 * SiteConfig render).
 */
export async function ensureSectionTables(): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Section" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 100,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
      );`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "SectionContent" (
        "id" TEXT NOT NULL,
        "sectionId" TEXT NOT NULL,
        "field" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SectionContent_pkey" PRIMARY KEY ("id")
      );`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Section_key_key" ON "Section"("key");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Section_sortOrder_idx" ON "Section"("sortOrder");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "SectionContent_sectionId_field_key" ON "SectionContent"("sectionId", "field");`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "SectionContent_sectionId_idx" ON "SectionContent"("sectionId");`,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Read ALL structured Section rows (with their content) for the current tenant,
 * ordered by sortOrder ascending. Returns an EMPTY array when the tenant has no
 * Section rows OR the tables don't exist yet — both cases mean "use the legacy
 * SiteConfig render", and the renderer treats an empty result as exactly that.
 */
export async function getSectionRecords(): Promise<SectionRecord[]> {
  try {
    const sections = await prisma.section.findMany({
      orderBy: { sortOrder: "asc" },
      include: { contents: true },
    });
    return sections.map((s) => {
      const content: SectionContentMap = {};
      for (const c of s.contents) content[c.field] = c.value;
      return { key: s.key, sortOrder: s.sortOrder, visible: s.visible, content };
    });
  } catch {
    // Table missing on this tenant schema (pre-migration) → no override.
    return [];
  }
}

/**
 * Returns the structured section ORDER (visible keys only) for the current tenant,
 * or null when the tenant has not adopted the structured store (no rows / no
 * table). null is the renderer's signal to keep using cfg["website.sections"]
 * verbatim — preserving the byte-identical legacy render.
 */
export async function getStructuredOrder(): Promise<string[] | null> {
  const records = await getSectionRecords();
  if (records.length === 0) return null;
  return records.filter((r) => r.visible).map((r) => r.key);
}

/**
 * Returns a `key -> content field map` lookup for the current tenant, or null
 * when no structured rows exist. Used by the renderer to layer per-section copy
 * overrides on top of the SiteConfig defaults (additive — a missing field falls
 * back to the existing cfg value).
 */
export async function getSectionContentByKey(): Promise<Record<string, SectionContentMap> | null> {
  const records = await getSectionRecords();
  if (records.length === 0) return null;
  const out: Record<string, SectionContentMap> = {};
  for (const r of records) out[r.key] = r.content;
  return out;
}
