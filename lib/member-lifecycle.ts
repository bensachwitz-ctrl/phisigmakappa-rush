// Member lifecycle constants + helpers.
//
// `Brother.status` is stored as a plain string (no Prisma enum) so we keep the
// migration additive against live data. Allowed values + their human labels +
// allowed transitions all live here so admin UI, API routes, and any future
// scholarship/treasurer reporting share one source of truth.

export const MEMBER_STATUSES = [
  "PROSPECT",
  "PLEDGE",
  "INITIATE",
  "ACTIVE",
  "INACTIVE",
  "ALUMNUS",
  "EXPELLED",
] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  PROSPECT: "Prospect",
  PLEDGE: "Pledge",
  INITIATE: "Initiate",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ALUMNUS: "Alumnus",
  EXPELLED: "Expelled",
};

export const MEMBER_STATUS_DESCRIPTIONS: Record<MemberStatus, string> = {
  PROSPECT: "Signed up via rush, pre-bid.",
  PLEDGE: "Bid accepted, in pledge program.",
  INITIATE: "Completed pledgeship, full member.",
  ACTIVE: "Standard active brother.",
  INACTIVE: "Not currently active (LOA, off-campus, etc.).",
  ALUMNUS: "Graduated or aged out.",
  EXPELLED: "Removed for cause.",
};

export const ACADEMIC_STANDINGS = ["HONORS", "GOOD", "PROBATION", "SUSPENDED"] as const;
export type AcademicStanding = (typeof ACADEMIC_STANDINGS)[number];

export const ACADEMIC_STANDING_LABELS: Record<AcademicStanding, string> = {
  HONORS: "Honors (>= 3.5 GPA)",
  GOOD: "Good standing (2.5-3.49)",
  PROBATION: "Academic probation",
  SUSPENDED: "Suspended",
};

export function isMemberStatus(s: unknown): s is MemberStatus {
  return typeof s === "string" && (MEMBER_STATUSES as readonly string[]).includes(s);
}

export function isAcademicStanding(s: unknown): s is AcademicStanding {
  return typeof s === "string" && (ACADEMIC_STANDINGS as readonly string[]).includes(s);
}

/**
 * Officially-supported transitions. Admin UI gates the dropdown on these so a
 * brother can't accidentally jump from PROSPECT to ALUMNUS, but we accept any
 * value on the server (super-admin override). Returns the allowed *next*
 * states from a given current state.
 */
export function allowedTransitions(from: MemberStatus): MemberStatus[] {
  switch (from) {
    case "PROSPECT":
      return ["PLEDGE", "INACTIVE"];
    case "PLEDGE":
      return ["INITIATE", "INACTIVE", "EXPELLED"];
    case "INITIATE":
      return ["ACTIVE", "INACTIVE", "ALUMNUS", "EXPELLED"];
    case "ACTIVE":
      return ["INACTIVE", "ALUMNUS", "EXPELLED"];
    case "INACTIVE":
      return ["ACTIVE", "ALUMNUS", "EXPELLED"];
    case "ALUMNUS":
      return ["ACTIVE"]; // re-activation rare but legal (returning grad student, etc.)
    case "EXPELLED":
      return []; // terminal; super-admin can override via the raw API
    default:
      return [...MEMBER_STATUSES];
  }
}

/** Document visibility constants (mirror lib/document-library.ts but kept here for label reuse). */
export const DOCUMENT_VISIBILITIES = ["PUBLIC", "MEMBERS", "INITIATES", "OFFICERS"] as const;
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];

/**
 * Resolve whether a brother with the given status can see a document tagged
 * with the given visibility. Returns false for unauthenticated visitors except
 * on PUBLIC.
 */
export function canSeeDocument(
  status: MemberStatus | null | undefined,
  visibility: DocumentVisibility,
  opts: { hasOfficerRead?: boolean } = {}
): boolean {
  if (visibility === "PUBLIC") return true;
  if (!status) return false;
  if (visibility === "MEMBERS") {
    return status === "PLEDGE" || status === "INITIATE" || status === "ACTIVE" || status === "ALUMNUS";
  }
  if (visibility === "INITIATES") {
    return status === "INITIATE" || status === "ACTIVE" || status === "ALUMNUS";
  }
  if (visibility === "OFFICERS") {
    return !!opts.hasOfficerRead;
  }
  return false;
}
