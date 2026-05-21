// Alumni-directory helpers — pure functions, no DB / framework dependencies.
//
// The directory has two surfaces:
//   1. /admin/alumni — full CRUD for the alumni-relations officer.
//   2. /alumni       — PUBLIC opt-in directory; only rows with optInDirectory=true
//      AND with PII fields filtered server-side before serialisation.
//
// `publicAlumniView` is the gate that strips contact fields when projecting to
// the public surface. Always call this in any handler that touches `/alumni`,
// `/api/alumni-directory`, or any sitemap/embed that lists alumni publicly.
//
// The CSV import helper accepts the column headers HQ exports use; unknown
// columns are silently dropped so future HQ exports don't break the importer.

export interface AlumniInput {
  fullName: string;
  preferredName?: string | null;
  graduationYear: number;
  pledgeClass?: string | null;
  initiationYear?: number | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  employer?: string | null;
  jobTitle?: string | null;
  linkedinUrl?: string | null;
  bio?: string | null;
  optInDirectory?: boolean;
  optInNewsletter?: boolean;
  brotherId?: string | null;
}

export interface AlumniPublicView {
  id: string;
  fullName: string;
  preferredName?: string | null;
  graduationYear: number;
  pledgeClass?: string | null;
  city?: string | null;
  state?: string | null;
  employer?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
}

/**
 * Project an AlumniProfile row into the public directory shape.
 *
 * Contract: even if the consumer accidentally passes a non-opted-in row, the
 * caller's filter is the source of truth — but we still strip email/phone
 * defensively so a refactor that drops the where-clause can't leak PII.
 */
export function publicAlumniView<T extends {
  id: string;
  fullName: string;
  preferredName?: string | null;
  graduationYear: number;
  pledgeClass?: string | null;
  city?: string | null;
  state?: string | null;
  employer?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
}>(row: T): AlumniPublicView {
  return {
    id: row.id,
    fullName: row.fullName,
    preferredName: row.preferredName ?? null,
    graduationYear: row.graduationYear,
    pledgeClass: row.pledgeClass ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    employer: row.employer ?? null,
    jobTitle: row.jobTitle ?? null,
    bio: row.bio ?? null,
    linkedinUrl: row.linkedinUrl ?? null,
  };
}

/** Strict input normalisation. Trims strings and clamps numerics. */
export function normaliseAlumniInput(raw: any): AlumniInput | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Invalid input" };
  const name = String(raw.fullName ?? "").trim();
  if (name.length < 2 || name.length > 200) return { error: "fullName 2-200 chars required" };
  const year = Number(raw.graduationYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { error: "graduationYear must be 1900-2100" };
  }
  const initYear = raw.initiationYear == null || raw.initiationYear === "" ? null : Number(raw.initiationYear);
  if (initYear != null && (!Number.isInteger(initYear) || initYear < 1900 || initYear > 2100)) {
    return { error: "initiationYear must be 1900-2100" };
  }
  const optStr = (v: any): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s.slice(0, 500) : null;
  };
  return {
    fullName: name,
    preferredName: optStr(raw.preferredName),
    graduationYear: year,
    pledgeClass: optStr(raw.pledgeClass),
    initiationYear: initYear,
    email: optStr(raw.email),
    phone: optStr(raw.phone),
    city: optStr(raw.city),
    state: optStr(raw.state),
    employer: optStr(raw.employer),
    jobTitle: optStr(raw.jobTitle),
    linkedinUrl: optStr(raw.linkedinUrl),
    bio: optStr(raw.bio),
    optInDirectory: raw.optInDirectory != null ? !!raw.optInDirectory : true,
    optInNewsletter: raw.optInNewsletter != null ? !!raw.optInNewsletter : true,
    brotherId: optStr(raw.brotherId),
  };
}

/**
 * Parse a CSV import row into AlumniInput. Headers tolerated:
 *   Full Name | fullName | Name
 *   Graduation Year | graduationYear | Year
 *   Pledge Class | pledgeClass
 *   Email | email
 *   Phone | phone
 *   City | city
 *   State | state
 *   Employer | employer
 *   Job Title | jobTitle | Title
 *
 * `dataLine` is one comma-separated row (no quoting support — keep imports
 * simple; complex CSVs should be split client-side).
 */
export function parseAlumniCsvRow(headers: string[], values: string[]): AlumniInput | { error: string } {
  const lookup: Record<string, string> = {};
  const normHeader = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  for (let i = 0; i < headers.length; i++) {
    lookup[normHeader(headers[i])] = (values[i] ?? "").trim();
  }
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = lookup[normHeader(k)];
      if (v) return v;
    }
    return "";
  };
  const draft: any = {
    fullName: pick("Full Name", "fullName", "Name"),
    graduationYear: pick("Graduation Year", "graduationYear", "Year"),
    pledgeClass: pick("Pledge Class", "pledgeClass"),
    email: pick("Email", "email"),
    phone: pick("Phone", "phone"),
    city: pick("City", "city"),
    state: pick("State", "state"),
    employer: pick("Employer", "employer"),
    jobTitle: pick("Job Title", "jobTitle", "Title"),
    linkedinUrl: pick("LinkedIn", "linkedinUrl"),
    bio: pick("Bio", "bio"),
  };
  return normaliseAlumniInput(draft);
}

/**
 * Sum donations grouped by campaign. Pure — caller supplies the rows it
 * fetched from prisma.alumniDonation.findMany.
 */
export function summariseDonationsByCampaign(
  donations: Array<{ campaign?: string | null; amountCents: number }>
): Array<{ campaign: string; totalCents: number; count: number }> {
  const map = new Map<string, { totalCents: number; count: number }>();
  for (const d of donations) {
    const key = (d.campaign && d.campaign.trim()) || "General";
    const slot = map.get(key) ?? { totalCents: 0, count: 0 };
    slot.totalCents += d.amountCents;
    slot.count += 1;
    map.set(key, slot);
  }
  return [...map.entries()]
    .map(([campaign, v]) => ({ campaign, ...v }))
    .sort((a, b) => b.totalCents - a.totalCents);
}
