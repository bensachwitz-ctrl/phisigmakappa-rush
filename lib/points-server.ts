// Engagement Points / Good-Standing — SERVER signal loader.
//
// Bridges the pure scoring engine (lib/points.ts) to the live tenant database.
// It (1) loads the admin-tunable config from the EXISTING SiteConfig table under
// the single key `points.config`, and (2) aggregates each member's raw signals
// from columns/tables the app ALREADY collects — then hands both to
// computeStanding(). NO new tables, NO migration.
//
// Tenant isolation: every read goes through the Host-proxy tenant `prisma`
// (the same client every other admin surface uses). Nothing here reaches across
// tenants.
//
// Efficiency: the roster-wide path issues a small FIXED number of grouped/
// batched queries (not one-per-member). Meeting attendance and chore completion
// are aggregated with `groupBy`; approved service hours are summed from a single
// findMany. Everything is reduced into per-member maps in memory.

import "server-only";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import {
  computeStanding,
  normalizePointsConfig,
  DEFAULT_POINTS_CONFIG,
  type PointsConfig,
  type MemberSignals,
  type StandingResult,
} from "@/lib/points";

/** The single SiteConfig key the tunable weights/thresholds live under. */
export const POINTS_CONFIG_KEY = "points.config";

/** Member statuses that count as "active roster" for the leaderboard. */
const ACTIVE_MEMBER_STATUSES = ["ACTIVE", "INITIATE", "PLEDGE"] as const;

/** Meeting attendance statuses that count as "showed up". */
const ATTENDED_STATUSES = new Set(["present", "tardy"]);
/** Chore statuses that count as "done". */
const CHORE_DONE_STATUSES = new Set(["completed", "graded"]);

/**
 * Load + parse the points config from SiteConfig. Falls back to
 * DEFAULT_POINTS_CONFIG when the key is absent or the stored JSON is malformed
 * (normalizePointsConfig sanitizes per-field). Never throws.
 */
export async function loadPointsConfig(): Promise<PointsConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: POINTS_CONFIG_KEY } });
    if (!row?.value) return { ...DEFAULT_POINTS_CONFIG };
    const parsed = JSON.parse(row.value);
    return normalizePointsConfig(parsed);
  } catch {
    return { ...DEFAULT_POINTS_CONFIG };
  }
}

/** A scored member row for the admin leaderboard. */
export interface MemberStandingRow {
  id: string;
  name: string;
  position: string | null;
  headshotUrl: string | null;
  pledgeClass: string | null;
  signals: MemberSignals;
  result: StandingResult;
}

interface RosterMember {
  id: string;
  name: string;
  position: string | null;
  headshotUrl: string | null;
  pledgeClass: string | null;
  duesPaid: boolean;
  studyHours: number;
}

/**
 * Aggregate raw signals for a known set of member IDs in a FIXED number of
 * grouped queries, returning a map keyed by memberId. Pulled out so both the
 * roster-wide and single-member paths share identical aggregation logic.
 */
async function aggregateSignals(
  members: RosterMember[]
): Promise<Map<string, MemberSignals>> {
  const ids = members.map((m) => m.id);
  const byId = new Map<string, MemberSignals>();
  for (const m of members) {
    byId.set(m.id, {
      duesPaid: m.duesPaid,
      studyHours: m.studyHours,
      meetingsAttended: 0,
      meetingsExcused: 0,
      meetingsTotal: 0,
      approvedServiceHours: 0,
      choresCompleted: 0,
      choresTotal: 0,
    });
  }
  if (ids.length === 0) return byId;

  // Run the three aggregations concurrently — each is scoped to the known IDs.
  const [meetingGroups, choreGroups, serviceLogs] = await Promise.all([
    // Meeting attendance grouped by (member, status). One row per pairing with a
    // count — cheap regardless of roster size.
    prisma.chapterMeetingAttendance.groupBy({
      by: ["memberId", "status"],
      where: { memberId: { in: ids } },
      _count: { _all: true },
    }),
    // Chore assignments grouped by (member, status).
    prisma.choreWheelAssignment.groupBy({
      by: ["memberId", "status"],
      where: { memberId: { in: ids } },
      _count: { _all: true },
    }),
    // Approved service hours — summed per member in memory (Decimal → number).
    prisma.serviceHourLog.findMany({
      where: { memberId: { in: ids }, status: "approved" },
      select: { memberId: true, hoursLogged: true },
    }),
  ]);

  for (const g of meetingGroups) {
    const sig = byId.get(g.memberId);
    if (!sig) continue;
    const n = g._count?._all ?? 0;
    sig.meetingsTotal = (sig.meetingsTotal ?? 0) + n;
    if (ATTENDED_STATUSES.has(g.status)) sig.meetingsAttended = (sig.meetingsAttended ?? 0) + n;
    if (g.status === "excused") sig.meetingsExcused = (sig.meetingsExcused ?? 0) + n;
  }

  for (const g of choreGroups) {
    const sig = byId.get(g.memberId);
    if (!sig) continue;
    const n = g._count?._all ?? 0;
    sig.choresTotal = (sig.choresTotal ?? 0) + n;
    if (CHORE_DONE_STATUSES.has(g.status)) sig.choresCompleted = (sig.choresCompleted ?? 0) + n;
  }

  for (const log of serviceLogs) {
    const sig = byId.get(log.memberId);
    if (!sig) continue;
    sig.approvedServiceHours = (sig.approvedServiceHours ?? 0) + Number(log.hoursLogged);
  }

  return byId;
}

/**
 * Compute standings for the WHOLE active roster, ranked highest-score first.
 * Returns the resolved config alongside so the caller (admin page) can show the
 * scoring rules without re-reading SiteConfig. Efficient: 1 roster query + 3
 * grouped aggregations total, independent of roster size.
 */
export async function loadRosterStandings(): Promise<{
  config: PointsConfig;
  rows: MemberStandingRow[];
}> {
  const config = await loadPointsConfig();

  let members: RosterMember[] = [];
  try {
    members = await prisma.brother.findMany({
      where: { status: { in: [...ACTIVE_MEMBER_STATUSES] } },
      select: {
        id: true,
        name: true,
        position: true,
        headshotUrl: true,
        pledgeClass: true,
        duesPaid: true,
        studyHours: true,
      },
      orderBy: { name: "asc" },
    });
  } catch {
    members = [];
  }

  const signalsById = await aggregateSignals(members);

  const rows: MemberStandingRow[] = members.map((m) => {
    const signals = signalsById.get(m.id) ?? { duesPaid: m.duesPaid, studyHours: m.studyHours };
    return {
      id: m.id,
      name: m.name,
      position: m.position,
      headshotUrl: m.headshotUrl,
      pledgeClass: m.pledgeClass,
      signals,
      result: computeStanding(signals, config),
    };
  });

  // Rank by score desc, then by pct desc, then name for stable ordering.
  rows.sort((a, b) => {
    if (b.result.score !== a.result.score) return b.result.score - a.result.score;
    if (b.result.pct !== a.result.pct) return b.result.pct - a.result.pct;
    return a.name.localeCompare(b.name);
  });

  return { config, rows };
}

/**
 * Compute the standing for ONE member (the brothers-portal widget). Loads the
 * config + that member's signals only. Returns null if the member can't be
 * found. Never throws — degrades to a default-config zero-ish score rather than
 * breaking the dashboard.
 */
export async function loadMemberStanding(
  brotherId: string
): Promise<{ config: PointsConfig; result: StandingResult; signals: MemberSignals } | null> {
  const config = await loadPointsConfig();

  let member: RosterMember | null = null;
  try {
    member = await prisma.brother.findUnique({
      where: { id: brotherId },
      select: {
        id: true,
        name: true,
        position: true,
        headshotUrl: true,
        pledgeClass: true,
        duesPaid: true,
        studyHours: true,
      },
    });
  } catch {
    member = null;
  }
  if (!member) return null;

  const signalsById = await aggregateSignals([member]);
  const signals = signalsById.get(member.id) ?? {
    duesPaid: member.duesPaid,
    studyHours: member.studyHours,
  };

  return { config, result: computeStanding(signals, config), signals };
}
