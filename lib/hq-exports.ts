// National HQ export helpers — pure builders for the five report templates.
//
// Each template returns a serialised string body + content type + filename
// extension. The route handler (/api/admin/exports/run) writes the body to
// Vercel Blob and stores the URL on HqExportRun.
//
// All templates accept already-fetched DB rows (no prisma in this file) so
// they're trivially unit-testable.

export const HQ_EXPORT_TYPES = [
  "membership",
  "academic",
  "financial",
  "philanthropy",
  "annual_report",
] as const;
export type HqExportType = (typeof HQ_EXPORT_TYPES)[number];

export function isHqExportType(v: unknown): v is HqExportType {
  return typeof v === "string" && (HQ_EXPORT_TYPES as readonly string[]).includes(v);
}

export interface ExportFile {
  body: string;
  contentType: string;
  extension: string;
  rowCount: number;
}

/** CSV escaping per RFC 4180. */
function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "string" ? v : String(v);
  if (s.includes(",") || s.includes("\n") || s.includes("\r") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvLine(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/** Membership roster — every active or initiated brother in the term. */
export function buildMembershipExport(input: {
  termCode: string;
  brothers: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    status: string;
    year?: string | null;
    major?: string | null;
    pledgeClassName?: string | null;
    initiationDate?: Date | string | null;
    graduationYear?: number | null;
  }>;
}): ExportFile {
  const header = csvLine([
    "Member ID", "Name", "Email", "Phone", "Status", "Year",
    "Major", "Pledge Class", "Initiation Date", "Graduation Year", "Term",
  ]);
  const rows = input.brothers.map((b) =>
    csvLine([
      b.id,
      b.name,
      b.email ?? "",
      b.phone ?? "",
      b.status,
      b.year ?? "",
      b.major ?? "",
      b.pledgeClassName ?? "",
      b.initiationDate ? new Date(b.initiationDate).toISOString().slice(0, 10) : "",
      b.graduationYear ?? "",
      input.termCode,
    ])
  );
  return {
    body: [header, ...rows].join("\r\n") + "\r\n",
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
    rowCount: rows.length,
  };
}

/** Academic standing — GPA / standing per member per term. */
export function buildAcademicExport(input: {
  termCode: string;
  rows: Array<{
    memberId: string;
    memberName: string;
    gpaTerm: number | string | null;
    gpaCumulative: number | string | null;
    creditHours?: number | null;
    standing?: string | null;
  }>;
}): ExportFile {
  const header = csvLine(["Member ID", "Member Name", "Term GPA", "Cumulative GPA", "Credit Hours", "Standing", "Term"]);
  const rows = input.rows.map((r) =>
    csvLine([
      r.memberId,
      r.memberName,
      r.gpaTerm == null ? "" : String(r.gpaTerm),
      r.gpaCumulative == null ? "" : String(r.gpaCumulative),
      r.creditHours ?? "",
      r.standing ?? "",
      input.termCode,
    ])
  );
  return {
    body: [header, ...rows].join("\r\n") + "\r\n",
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
    rowCount: rows.length,
  };
}

/** Financial summary — dues paid / outstanding per member. */
export function buildFinancialExport(input: {
  termCode: string;
  rows: Array<{
    memberId: string;
    memberName: string;
    amountAssessedCents: number;
    amountPaidCents: number;
    status: string;
  }>;
}): ExportFile {
  const header = csvLine(["Member ID", "Member Name", "Assessed", "Paid", "Balance", "Status", "Term"]);
  const rows = input.rows.map((r) => {
    const balance = r.amountAssessedCents - r.amountPaidCents;
    return csvLine([
      r.memberId,
      r.memberName,
      (r.amountAssessedCents / 100).toFixed(2),
      (r.amountPaidCents / 100).toFixed(2),
      (balance / 100).toFixed(2),
      r.status,
      input.termCode,
    ]);
  });
  return {
    body: [header, ...rows].join("\r\n") + "\r\n",
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
    rowCount: rows.length,
  };
}

/** Philanthropy hours — per-member service hour totals for the term. */
export function buildPhilanthropyExport(input: {
  termCode: string;
  rows: Array<{
    memberId: string;
    memberName: string;
    totalHours: number;
    eventsAttended: number;
  }>;
}): ExportFile {
  const header = csvLine(["Member ID", "Member Name", "Service Hours", "Events Attended", "Term"]);
  const rows = input.rows.map((r) =>
    csvLine([r.memberId, r.memberName, r.totalHours.toFixed(2), r.eventsAttended, input.termCode])
  );
  return {
    body: [header, ...rows].join("\r\n") + "\r\n",
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
    rowCount: rows.length,
  };
}

/**
 * Annual chapter report — single PDF that aggregates the four CSVs above
 * into a human-readable summary. We emit HTML here (the route handler can
 * server-render it via @vercel/og or just store the HTML and have the
 * client print-to-PDF). HQ's spec is for "a one-pager"; the actual visual
 * polish can be iterated on without changing the wire format.
 */
export function buildAnnualReportHtml(input: {
  chapterName: string;
  termCode: string;
  memberCount: number;
  chapterGpa?: number;
  duesCollectedCents: number;
  duesAssessedCents: number;
  serviceHoursTotal: number;
  philanthropyRaisedCents: number;
  incidentCount: number;
}): ExportFile {
  const pctCollected = input.duesAssessedCents
    ? Math.round((input.duesCollectedCents / input.duesAssessedCents) * 100)
    : 0;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(input.chapterName)} — Annual Chapter Report ${escapeHtml(input.termCode)}</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; max-width: 720px; margin: 32px auto; color: #1f2937; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  .meta { color: #6b7280; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
  .card h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 4px; }
  .card .v { font-size: 22px; font-weight: 600; }
</style>
</head><body>
<h1>${escapeHtml(input.chapterName)} — Annual Chapter Report</h1>
<div class="meta">Term ${escapeHtml(input.termCode)}</div>
<div class="grid">
  <div class="card"><h2>Members</h2><div class="v">${input.memberCount}</div></div>
  <div class="card"><h2>Chapter GPA</h2><div class="v">${input.chapterGpa?.toFixed(2) ?? "N/A"}</div></div>
  <div class="card"><h2>Dues Collected</h2><div class="v">$${(input.duesCollectedCents / 100).toFixed(2)}</div></div>
  <div class="card"><h2>Collection Rate</h2><div class="v">${pctCollected}%</div></div>
  <div class="card"><h2>Service Hours</h2><div class="v">${input.serviceHoursTotal.toFixed(0)}</div></div>
  <div class="card"><h2>Philanthropy Raised</h2><div class="v">$${(input.philanthropyRaisedCents / 100).toFixed(2)}</div></div>
  <div class="card"><h2>Incidents Filed</h2><div class="v">${input.incidentCount}</div></div>
</div>
</body></html>`;
  return {
    body: html,
    contentType: "text/html; charset=utf-8",
    extension: "html",
    rowCount: 1,
  };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── PAID-dues dedup (money-integrity) ─────────────────────────────────────────
// A brother can end up with MORE THAN ONE PAID DuesPayment row for a single
// (brotherId, year) — e.g. a Stripe payment plus a stray MANUAL "marked paid"
// row. The financial + annual-report exports sum PAID amounts, so a duplicate
// would OVERSTATE dues collected. This selects exactly ONE PAID row per
// (brotherId, year) — the FIRST by createdAt (earliest real payment), STRIPE
// preferred on a createdAt tie since it's the authoritative cardholder charge —
// and returns the SET of row ids to count. Non-PAID rows are never included.
//
// Pure + prisma-free so it's trivially unit-testable; callers pass already-
// fetched rows. Source toggles are independently fixed to not mint duplicates;
// this guards any historical/edge duplicate that already exists in the ledger.
export type PaidDedupRow = {
  id: string;
  brotherId: string;
  year: string;
  status: string;
  method: string;
  createdAt: Date;
};

export function dedupePaidByBrotherYear<T extends PaidDedupRow>(rows: T[]): Set<string> {
  const winnerByKey = new Map<string, T>();
  for (const r of rows) {
    if (r.status !== "PAID") continue;
    const key = `${r.brotherId}::${r.year}`;
    const cur = winnerByKey.get(key);
    if (!cur) {
      winnerByKey.set(key, r);
      continue;
    }
    const rTime = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
    const curTime =
      cur.createdAt instanceof Date ? cur.createdAt.getTime() : new Date(cur.createdAt).getTime();
    if (rTime < curTime) {
      winnerByKey.set(key, r); // earlier payment wins
    } else if (rTime === curTime && r.method === "STRIPE" && cur.method !== "STRIPE") {
      winnerByKey.set(key, r); // tie → the authoritative Stripe charge wins
    }
  }
  return new Set([...winnerByKey.values()].map((r) => r.id));
}
