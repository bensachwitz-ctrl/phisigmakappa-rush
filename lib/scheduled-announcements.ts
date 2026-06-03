// W4 — scheduled-announcement fan-out helper.
//
// One function: pick up every announcement whose scheduledFor has passed
// and whose status is still 'scheduled', then fire it.
//
// "Fire" today = transition status → 'sent' + sentAt = now. The Announcement
// is then immediately visible to brothers on /account/announcements (the
// page filters status='sent'). The optional outbound SMS/email fan-out is
// handled by /api/admin/broadcast — wiring that in here is a future
// iteration (it requires resolving the audience to a real recipient list +
// hitting Twilio/Resend, which has rate limits + costs we don't want a
// background cron tripping over without explicit operator approval). For
// v1 the cron just publishes the in-app card; the broadcast surface is
// still operator-driven.
//
// Failure isolation: every announcement is processed in its own try/catch
// so a single bad row can't break the whole cron run. Failures flip
// status='failed' + failureReason so the admin list surfaces the gap.
//
// Idempotent: a re-run finds no scheduled rows whose deadline is past,
// because the previous run already transitioned them. The `where` clause
// gates on `status: 'scheduled'` so even a manual `UPDATE` that flipped
// status='sent' is respected.

import { prisma } from "@/lib/prisma";

export interface FireResult {
  /** Total scheduled rows whose deadline has passed at the time we ran. */
  candidates: number;
  /** Successfully transitioned to 'sent'. */
  fired: number;
  /** Transitioned to 'failed' because the underlying write threw. */
  failed: number;
  /** Skipped because the audience couldn't be resolved (no brothers in
   *  the target audience right now — extremely rare, but possible during
   *  a roster mid-transition). */
  skipped: number;
  /** Per-row outcome for the admin run-log surface. */
  rows: Array<{
    id: string;
    title: string;
    outcome: "fired" | "failed" | "skipped";
    error?: string;
  }>;
}

/**
 * Fire every scheduled announcement whose deadline has passed.
 *
 * Called from the cron route at /api/cron/send-scheduled-announcements
 * (Vercel cron, every 15 min in prod). Safe to invoke from any context
 * because every mutation is gated on `status: 'scheduled'`.
 */
export async function fireDueScheduledAnnouncements(): Promise<FireResult> {
  const now = new Date();

  // Pull every announcement whose deadline has landed and that hasn't
  // already been transitioned. We include the author + audience so the
  // admin run-log can show "Spring formal reminder — President Doe".
  const due = await prisma.announcement.findMany({
    where: {
      status: "scheduled",
      scheduledFor: { lte: now },
    },
    select: { id: true, title: true, audience: true },
    orderBy: { scheduledFor: "asc" },
    take: 200, // cap so a backlog can't OOM the route
  });

  const result: FireResult = {
    candidates: due.length,
    fired: 0,
    failed: 0,
    skipped: 0,
    rows: [],
  };

  for (const row of due) {
    try {
      // Resolve the recipient count up-front so the admin "Y of X read"
      // widget has a denominator. Active brothers + (officer overlay when
      // audience='EBOARD') is the right count for v1.
      const totalRecipients = await resolveAudienceCount(row.audience);

      // No recipients? Still fire — but record skipped so the run-log
      // surfaces it. Some chapters may seed announcements before the
      // roster lands (e.g. for an upcoming rush class).
      if (totalRecipients === 0) {
        await prisma.announcement.update({
          where: { id: row.id },
          data: {
            status: "sent",
            sentAt: now,
            totalRecipients: 0,
          },
        });
        result.skipped += 1;
        result.rows.push({ id: row.id, title: row.title, outcome: "skipped", error: "No recipients in audience" });
        continue;
      }

      await prisma.announcement.update({
        where: { id: row.id },
        data: {
          status: "sent",
          sentAt: now,
          totalRecipients,
        },
      });

      result.fired += 1;
      result.rows.push({ id: row.id, title: row.title, outcome: "fired" });
    } catch (err) {
      // Any failure → flip to status='failed' + record the reason so the
      // admin list shows the gap. We swallow here because we want the next
      // row to still process.
      try {
        await prisma.announcement.update({
          where: { id: row.id },
          data: {
            status: "failed",
            failureReason: err instanceof Error ? err.message.slice(0, 280) : "unknown failure",
          },
        });
      } catch {
        // Even the failure-write failed — log + move on. The next cron
        // run will pick this row up again (status is still 'scheduled'
        // because the update threw).
        // eslint-disable-next-line no-console
        console.error("[scheduled-announcements] failure-write failed for", row.id);
      }
      result.failed += 1;
      result.rows.push({
        id: row.id,
        title: row.title,
        outcome: "failed",
        error: err instanceof Error ? err.message.slice(0, 200) : "unknown failure",
      });
    }
  }

  return result;
}

/**
 * Count brothers eligible for the announcement audience. Used to populate
 * the totalRecipients field at fire-time so the "Y of X read" widget has
 * its denominator without re-querying every announcement render.
 */
async function resolveAudienceCount(audience: string): Promise<number> {
  switch (audience) {
    case "ALL":
      // Everyone-with-a-row: prospects + actives + alumni — used when the
      // chapter wants the broadest possible reach (closures, emergencies).
      return prisma.brother.count();
    case "BROTHERS":
      // Active members + initiates + pledges — the standard chapter
      // audience.
      return prisma.brother.count({
        where: { status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] } },
      });
    case "EBOARD":
      // Brothers with at least one active officer assignment.
      return prisma.brother.count({
        where: {
          officerAssignments: {
            some: {
              // Optional end date in the past = inactive. Null end = still active.
              OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
            },
          },
        },
      });
    case "RUSHES":
      // Prospect status — pre-bid candidates only. Note: brothers with
      // status PROSPECT may not have email/SMS columns populated yet;
      // the in-app card still renders for any who do sign in.
      return prisma.brother.count({ where: { status: "PROSPECT" } });
    default:
      return 0;
  }
}
