// Chore wheel rotation — fairness algorithm.
//
// Round-robin starting from the least-recently-assigned brother. Idempotent
// when re-run for the same `weekStarting`: existing assignments for that week
// are wiped and re-assigned with the same algorithm, so the chair can adjust
// the catalog and re-run without piling up duplicates.
//
// Fairness rule:
//   - For each member, find their most recent assignment date (or epoch if
//     they've never been assigned).
//   - Sort members ascending by that date (least-recently-assigned first).
//   - Walk the task catalog in `rotationOrder` and assign tasks round-robin
//     to members in the sorted order. When the member list is exhausted,
//     loop back to the first member. Net effect: members who haven't been
//     scheduled in a while get first crack at the new week.
//
// Pure functions — no DB / framework dependencies. The route handler in
// /api/admin/chores/rotate calls into this with the query results.

export interface RotationMember {
  id: string;
  /** Most recent `weekStarting` they were assigned, or null if never. */
  lastAssignedAt: Date | null;
}

export interface RotationTask {
  id: string;
  rotationOrder: number;
}

export interface RotationOutput {
  /** taskId → memberId */
  assignments: Array<{ taskId: string; memberId: string }>;
}

/**
 * Given the active task list and the eligible members + their last-assigned
 * date, produce a deterministic round-robin assignment.
 *
 * Returns one assignment per task, even when members.length < tasks.length
 * (in which case some members get more than one chore). When members.length
 * > tasks.length, only the first `tasks.length` members are assigned; the
 * remaining sit out the week.
 */
export function computeChoreRotation(
  tasks: RotationTask[],
  members: RotationMember[]
): RotationOutput {
  if (tasks.length === 0 || members.length === 0) {
    return { assignments: [] };
  }
  const sortedTasks = [...tasks].sort((a, b) => a.rotationOrder - b.rotationOrder);
  const sortedMembers = [...members].sort((a, b) => {
    const ax = a.lastAssignedAt ? a.lastAssignedAt.getTime() : 0;
    const bx = b.lastAssignedAt ? b.lastAssignedAt.getTime() : 0;
    if (ax !== bx) return ax - bx; // least-recently first
    return a.id.localeCompare(b.id); // stable tiebreaker
  });

  const out: Array<{ taskId: string; memberId: string }> = [];
  for (let i = 0; i < sortedTasks.length; i++) {
    const t = sortedTasks[i];
    const m = sortedMembers[i % sortedMembers.length];
    out.push({ taskId: t.id, memberId: m.id });
  }
  return { assignments: out };
}

/**
 * Parse an ISO week string of the form "YYYY-WNN" into the Sunday date that
 * starts that week (Sunday-based, matching the W2 weekStartingSunday helper).
 * Returns null if the input is malformed.
 *
 * Note: this is a *Sunday-week* parser, not strictly ISO 8601 (which is
 * Monday-week). We chose Sunday to match the chapter's traditional chore
 * Sunday-to-Saturday cycle and the existing study-hour bucketing.
 */
export function parseSundayWeek(weekStr: string): Date | null {
  // Accept either "2026-W14" or "2026-05-17" (any Date.parse'able string).
  const m = /^(\d{4})-W(\d{1,2})$/.exec(weekStr || "");
  if (m) {
    const year = parseInt(m[1], 10);
    const week = parseInt(m[2], 10);
    if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) return null;
    // Jan 1 of the year, then walk to the Sunday of ISO week 1 (Sunday-based).
    const jan1 = new Date(year, 0, 1, 0, 0, 0, 0);
    const dayOfWeek = jan1.getDay(); // 0..6
    // Sunday on/before Jan 1
    const sundayOfWeek1 = new Date(jan1);
    sundayOfWeek1.setDate(jan1.getDate() - dayOfWeek);
    // Add (week - 1) weeks
    const sundayOfWeekN = new Date(sundayOfWeek1);
    sundayOfWeekN.setDate(sundayOfWeek1.getDate() + (week - 1) * 7);
    sundayOfWeekN.setHours(0, 0, 0, 0);
    return sundayOfWeekN;
  }
  const d = new Date(weekStr);
  if (Number.isNaN(d.getTime())) return null;
  // Snap to the Sunday on/before the supplied date.
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
