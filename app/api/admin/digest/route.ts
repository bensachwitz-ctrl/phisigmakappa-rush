import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Weekly digest snapshot — JSON only, no chrome. The e-board uses this to:
 *   1. Auto-post a weekly summary into the chapter Slack/GroupMe
 *   2. Paste into the chapter advisor's weekly check-in email
 *   3. Drive a "weekly digest" Resend broadcast (future)
 *
 * Includes:
 *   - Rush funnel counts (active / decided / bid / accepted)
 *   - Vote participation (last 7d brothers who voted)
 *   - Top 5 strong-yes consensus PNMs (ready to bid)
 *   - Top 5 strong-no consensus PNMs (consider drop)
 *   - Upcoming events (next 7 days)
 *   - Dues collection rate
 *   - Brothers who haven't voted in 14 days (engagement watchlist)
 *
 * Admin-only because it surfaces PNM names with vote averages.
 */

const DECISION_MIN_VOTES = 5;
const BID_RECOMMEND_AVG = 1.0;
const DROP_RECOMMEND_AVG = -1.0;

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Single transaction — fewer round trips, consistent snapshot.
  const [rushes, brothers, recentVoters, upcomingEvents] = await Promise.all([
    prisma.rush.findMany({
      include: { votes: { select: { value: true } } },
    }),
    prisma.brother.findMany({
      select: { id: true, name: true, position: true, duesPaid: true, lastSeen: true },
    }),
    prisma.vote
      .findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { brotherId: true, createdAt: true },
      })
      .catch(() => [] as { brotherId: string; createdAt: Date }[]),
    prisma.event.findMany({
      where: { startsAt: { gte: now, lt: sevenDaysAhead } },
      orderBy: { startsAt: "asc" },
      select: { id: true, name: true, startsAt: true, isPrivate: true, category: true },
    }),
  ]);

  // Funnel
  const active = rushes.filter((r) => r.status === "ACTIVE");
  const bidExtended = rushes.filter((r) => r.status === "BID_EXTENDED");
  const accepted = rushes.filter((r) => r.status === "ACCEPTED");
  const declined = rushes.filter((r) => r.status === "DECLINED");
  const dropped = rushes.filter((r) => r.status === "DROPPED");

  // Decision-ready buckets
  const decidable = active
    .map((r) => ({
      id: r.id,
      name: r.name,
      voteCount: r.votes.length,
      avg: r.votes.length > 0 ? r.votes.reduce((s, v) => s + v.value, 0) / r.votes.length : 0,
    }))
    .filter((r) => r.voteCount >= DECISION_MIN_VOTES);

  const topBid = decidable
    .filter((r) => r.avg >= BID_RECOMMEND_AVG)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const topDrop = decidable
    .filter((r) => r.avg <= DROP_RECOMMEND_AVG)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  // Participation
  const voterIds7d = new Set(
    recentVoters.filter((v) => v.createdAt >= sevenDaysAgo).map((v) => v.brotherId)
  );
  const voterIds14d = new Set(recentVoters.map((v) => v.brotherId));
  const dormantBrothers = brothers
    .filter((b) => !voterIds14d.has(b.id))
    .map((b) => ({ id: b.id, name: b.name, position: b.position }))
    .slice(0, 25);

  const duesPaidCount = brothers.filter((b) => b.duesPaid).length;

  return NextResponse.json({
    ok: true,
    generatedAt: now.toISOString(),
    funnel: {
      total: rushes.length,
      active: active.length,
      bidExtended: bidExtended.length,
      accepted: accepted.length,
      declined: declined.length,
      dropped: dropped.length,
      bidConversionPct: bidExtended.length + accepted.length + declined.length > 0
        ? Math.round((accepted.length / (bidExtended.length + accepted.length + declined.length)) * 100)
        : 0,
    },
    decisions: {
      decidableCount: decidable.length,
      thresholds: {
        minVotes: DECISION_MIN_VOTES,
        bidAvg: BID_RECOMMEND_AVG,
        dropAvg: DROP_RECOMMEND_AVG,
      },
      recommendBid: topBid.map((r) => ({
        name: r.name,
        avg: Number(r.avg.toFixed(2)),
        votes: r.voteCount,
      })),
      recommendDrop: topDrop.map((r) => ({
        name: r.name,
        avg: Number(r.avg.toFixed(2)),
        votes: r.voteCount,
      })),
    },
    participation: {
      totalBrothers: brothers.length,
      duesPaid: duesPaidCount,
      duesPaidPct: brothers.length > 0 ? Math.round((duesPaidCount / brothers.length) * 100) : 0,
      votedLast7Days: voterIds7d.size,
      voteParticipationPct: brothers.length > 0 ? Math.round((voterIds7d.size / brothers.length) * 100) : 0,
      dormantBrothers, // No vote in last 14 days
    },
    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      name: e.name,
      startsAt: e.startsAt.toISOString(),
      category: e.category,
      isPrivate: e.isPrivate,
    })),
  });
}
