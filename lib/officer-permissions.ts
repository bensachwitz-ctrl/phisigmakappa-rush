// Officer permissions — canonical shape + per-position defaults.
//
// Two-system coexistence:
//   • `Brother.role`  → MEMBER | ADMIN   (existing auth-surface gate, unchanged)
//   • `OfficerAssignment` → finer-grained per-domain access for individual officers
//
// Permissions JSON shape lives on `OfficerPosition.permissions` (text column;
// parsed with `parsePermissions`). Per-domain value is one of:
//   • "write" → can read + write
//   • "read"  → read-only
//   • "none"  → no access (same as the key being absent)
//
// `superAdmin: true` short-circuits all checks (the legacy shared Phisig admin
// credential maps to this). Today only ADMIN role brothers get it.
//
// We deliberately keep this file framework-free so it can be imported from
// Node, the Edge runtime, route handlers, and React components alike.

export type DomainKey =
  | "rushPipeline"
  | "brothers"
  | "events"
  | "announcements"
  | "dues"
  | "academic"
  | "house"
  | "risk"
  | "service"
  | "alumni"
  | "documents"
  | "siteSettings"
  | "payments"
  | "elections";

export type DomainAccess = "none" | "read" | "write";

export interface OfficerPermissions {
  superAdmin?: boolean;
  domain: Partial<Record<DomainKey, DomainAccess>>;
}

export const EMPTY_PERMISSIONS: OfficerPermissions = { superAdmin: false, domain: {} };

/** Convenience: a permission set that grants `write` on every domain. */
export const SUPER_ADMIN_PERMISSIONS: OfficerPermissions = {
  superAdmin: true,
  domain: {
    rushPipeline: "write",
    brothers: "write",
    events: "write",
    announcements: "write",
    dues: "write",
    academic: "write",
    house: "write",
    risk: "write",
    service: "write",
    alumni: "write",
    documents: "write",
    siteSettings: "write",
    payments: "write",
    elections: "write",
  },
};

/** Catalog of positions seeded into OfficerPosition. */
export interface OfficerSeed {
  title: string;
  slug: string;
  description: string;
  sortOrder: number;
  permissions: OfficerPermissions;
}

const w = (k: DomainKey) => [k, "write" as DomainAccess] as const;
const r = (k: DomainKey) => [k, "read" as DomainAccess] as const;

function perms(pairs: Array<readonly [DomainKey, DomainAccess]>): OfficerPermissions {
  return { superAdmin: false, domain: Object.fromEntries(pairs) as any };
}

/**
 * Default permission catalog for every standard Phi Sigma Kappa officer.
 * Edit via /admin/officers → Edit Position → permissions JSON.
 */
export const DEFAULT_OFFICER_CATALOG: OfficerSeed[] = [
  {
    title: "President",
    slug: "president",
    description: "Chapter-wide oversight. Sees everything, signs off on policy.",
    sortOrder: 10,
    permissions: SUPER_ADMIN_PERMISSIONS, // chapter-level super-admin (still distinct from platform super-admin)
  },
  {
    title: "Vice President",
    slug: "vice-president",
    description: "Backs up the president; reads all domains, writes most.",
    sortOrder: 20,
    permissions: perms([
      w("brothers"), w("events"), w("announcements"),
      r("dues"), r("academic"), r("house"), r("risk"),
      r("service"), r("alumni"), w("documents"), r("siteSettings"),
    ]),
  },
  {
    title: "Secretary",
    slug: "secretary",
    description: "Meeting minutes, announcements, document library upkeep, officer elections.",
    sortOrder: 30,
    permissions: perms([
      r("brothers"), w("events"), w("announcements"),
      w("documents"), r("siteSettings"), w("elections"),
    ]),
  },
  {
    title: "Treasurer",
    slug: "treasurer",
    description: "Dues + payments + budget. Read-only access to the brother roster.",
    sortOrder: 40,
    permissions: perms([
      r("brothers"), w("dues"), w("payments"),
    ]),
  },
  {
    title: "Recruitment Chair",
    slug: "recruitment-chair",
    description: "Rush pipeline owner — PNM intake, votes, bid extension.",
    sortOrder: 50,
    permissions: perms([
      w("rushPipeline"), r("brothers"), w("events"), w("announcements"),
    ]),
  },
  {
    title: "Risk Manager",
    slug: "risk-manager",
    description: "Incident reports, FIPG event reviews, training compliance.",
    sortOrder: 60,
    permissions: perms([
      r("brothers"), w("risk"), r("events"), r("announcements"),
      w("documents"),
    ]),
  },
  {
    title: "Social Chair",
    slug: "social-chair",
    description: "Chapter social calendar; coordinates with risk manager on FIPG.",
    sortOrder: 70,
    permissions: perms([
      r("brothers"), w("events"), r("risk"),
    ]),
  },
  {
    title: "Philanthropy Chair",
    slug: "philanthropy-chair",
    description: "Service hours, partner orgs, philanthropy events.",
    sortOrder: 80,
    permissions: perms([
      r("brothers"), w("service"), w("events"), w("announcements"),
    ]),
  },
  {
    title: "Scholarship Chair",
    slug: "scholarship-chair",
    description: "Academic standing + study hours.",
    sortOrder: 90,
    permissions: perms([
      r("brothers"), w("academic"),
    ]),
  },
  {
    title: "Brotherhood Chair",
    slug: "brotherhood-chair",
    description: "Brotherhood events + member experience programming.",
    sortOrder: 100,
    permissions: perms([
      r("brothers"), w("events"), w("announcements"),
    ]),
  },
  {
    title: "House Manager",
    slug: "house-manager",
    description: "Room assignments, chore wheel, maintenance.",
    sortOrder: 110,
    permissions: perms([
      r("brothers"), w("house"),
    ]),
  },
  {
    title: "Marshal / Pledge Educator",
    slug: "marshal",
    description: "Pledge education program + line management.",
    sortOrder: 120,
    permissions: perms([
      w("brothers"), w("events"), w("documents"), r("academic"),
    ]),
  },
  {
    title: "IFC Delegate",
    slug: "ifc-delegate",
    description: "Liaison to the campus IFC; reads chapter calendar.",
    sortOrder: 130,
    permissions: perms([
      r("brothers"), r("events"), r("announcements"),
    ]),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a permissions JSON string from the DB. Defensive — always returns a valid shape. */
export function parsePermissions(raw: string | null | undefined): OfficerPermissions {
  if (!raw) return { ...EMPTY_PERMISSIONS };
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return { ...EMPTY_PERMISSIONS };
    const out: OfficerPermissions = {
      superAdmin: !!v.superAdmin,
      domain: {},
    };
    if (v.domain && typeof v.domain === "object") {
      for (const [k, val] of Object.entries(v.domain)) {
        if (val === "read" || val === "write" || val === "none") {
          (out.domain as any)[k] = val;
        }
      }
    }
    return out;
  } catch {
    return { ...EMPTY_PERMISSIONS };
  }
}

/** Serialise back to JSON for storage on OfficerPosition.permissions. */
export function stringifyPermissions(p: OfficerPermissions): string {
  return JSON.stringify({ superAdmin: !!p.superAdmin, domain: p.domain || {} });
}

/**
 * Merge multiple permission sets, taking the most-permissive value per domain.
 * Used when a brother holds multiple officer roles concurrently.
 */
export function mergePermissions(sets: OfficerPermissions[]): OfficerPermissions {
  const out: OfficerPermissions = { superAdmin: false, domain: {} };
  const rank = { none: 0, read: 1, write: 2 } as const;
  for (const s of sets) {
    if (s.superAdmin) out.superAdmin = true;
    for (const [k, v] of Object.entries(s.domain || {})) {
      const current = (out.domain as any)[k] as DomainAccess | undefined;
      if (!current || (rank as any)[v as DomainAccess] > (rank as any)[current]) {
        (out.domain as any)[k] = v;
      }
    }
  }
  return out;
}

/** Per-call gate. Returns true if the perm set grants the requested access. */
export function hasPermission(
  perms: OfficerPermissions | null | undefined,
  domain: DomainKey,
  action: "read" | "write" = "read"
): boolean {
  if (!perms) return false;
  if (perms.superAdmin) return true;
  const have = perms.domain?.[domain];
  if (!have || have === "none") return false;
  if (action === "read") return have === "read" || have === "write";
  return have === "write";
}

/** Edge-runtime variant: only needs the shape, no DB. */
export function hasEdgePermission(
  claims: { superAdmin?: boolean; domain?: Partial<Record<string, DomainAccess>> } | null | undefined,
  domain: DomainKey,
  action: "read" | "write" = "read"
): boolean {
  if (!claims) return false;
  if (claims.superAdmin) return true;
  const have = claims.domain?.[domain];
  if (!have || have === "none") return false;
  if (action === "read") return have === "read" || have === "write";
  return have === "write";
}
