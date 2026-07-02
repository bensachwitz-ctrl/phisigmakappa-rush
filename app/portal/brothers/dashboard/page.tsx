import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, portalMustResetRedirect } from "@/lib/portal-auth";
import { loadMemberStanding } from "@/lib/points-server";
import BrothersDashboardClient from "./BrothersDashboardClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brothers Portal Dashboard",
  description: "Active brother dashboard for chapter management.",
};

function isNextSignal(err: unknown): boolean {
  return !!err && typeof err === "object" && "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_");
}

export default async function BrothersDashboardPage() {
  const sess = requireRole("brother");
  if (!sess) {
    redirect("/portal/brothers");
  }

  // PHASE-3 OTP gate: a session created by verifying a reset code is flagged
  // mustReset and can only reach the "create new password" step until done.
  const resetTo = await portalMustResetRedirect();
  if (resetTo) {
    redirect(resetTo);
  }

  let brother;
  try {
    let brotherId: string | null | undefined = null;
    if (sess.portal) {
      const portalUser = await prisma.portalUser.findUnique({
        where: { id: sess.portal.userId },
      });
      brotherId = portalUser?.brotherId;
    }

    if (sess.isAdmin && !brotherId) {
      // Admin override (an admin with no linked brother profile previews the
      // brother dashboard). Pick a DETERMINISTIC member — ordered by name then
      // id — so the same admin always lands on the same profile rather than an
      // arbitrary Prisma-default row. The client renders an "Admin Override
      // Mode" badge plus the member's name in the header, so whose data is shown
      // is always visible.
      const firstBrother = await prisma.brother.findFirst({
        where: { passwordHash: { not: null } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      brotherId = firstBrother?.id;
    }

    if (!brotherId) {
      redirect("/portal/brothers?error=not-onboarded");
    }

    brother = await prisma.brother.findUnique({
      where: { id: brotherId },
      include: {
        bigBrother: {
          select: { id: true, name: true, email: true, phone: true }
        },
        littles: {
          select: { id: true, name: true, email: true, phone: true }
        }
      }
    });
  } catch (err) {
    if (isNextSignal(err)) throw err;
    console.error("[brothers dashboard] load failed:", err);
    redirect("/portal/brothers?error=unavailable");
  }

  if (!brother) {
    redirect("/portal/brothers?error=not-found");
  }

  // ── Dashboard data load ────────────────────────────────────────────────────
  // Every query below was previously UNGUARDED, so a single transient DB error
  // — or a tenant whose schema predates one of these tables — threw past the
  // graceful redirect above and dumped the brother onto the generic error
  // boundary (inconsistent with the deliberately .catch()-guarded loadMemberStanding
  // below). Wrap the whole load so ANY failure degrades to the same graceful
  // "?error=unavailable" redirect as the brother lookup. Next's redirect() throws
  // a NEXT_REDIRECT control signal, so re-throw those untouched.
  let meetings, chores, serviceLogs, events, serviceEvents, duesPayments,
    polls, announcements, alumniNetwork, jobPostings, configs;
  try {
  // All 11 reads below are INDEPENDENT (each keyed on the already-known
  // brother.id or on static filters), so run them concurrently in one
  // Promise.all instead of a serial await-waterfall — the dashboard load drops
  // from the sum of 11 round-trips to the slowest single query (critique
  // council: member-portal perceived speed). Order MUST match the destructure.
  [
    meetings, chores, serviceLogs, events, serviceEvents, duesPayments,
    polls, announcements, alumniNetwork, jobPostings, configs,
  ] = await Promise.all([
    // Chapter meeting attendance
    prisma.chapterMeeting.findMany({
      orderBy: { scheduledAt: "desc" },
      include: {
        attendance: {
          where: { memberId: brother.id }
        }
      }
    }),
    // Chore wheel assignments
    prisma.choreWheelAssignment.findMany({
      where: { memberId: brother.id },
      orderBy: { weekStarting: "desc" },
      include: {
        task: true
      }
    }),
    // Service hour logs
    prisma.serviceHourLog.findMany({
      where: { memberId: brother.id },
      orderBy: { performedAt: "desc" },
      include: {
        serviceEvent: {
          select: { id: true, title: true }
        }
      }
    }),
    // All upcoming events (so the brother can RSVP)
    prisma.event.findMany({
      where: {
        startsAt: { gte: new Date() }
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        dressCode: true,
        startsAt: true,
        endsAt: true,
        category: true,
        rsvps: {
          where: { brotherId: brother.id },
          select: { status: true, note: true }
        }
      }
    }),
    // Approved service events for log association
    prisma.serviceEvent.findMany({
      where: {
        status: "approved",
        eventDate: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } // last 60 days to future
      },
      orderBy: { eventDate: "desc" },
      select: {
        id: true,
        title: true,
        eventDate: true,
        partnerOrg: true
      }
    }),
    // Past dues payments
    prisma.duesPayment.findMany({
      where: { brotherId: brother.id },
      orderBy: { createdAt: "desc" }
    }),
    // Active surveys/polls
    prisma.poll.findMany({
      where: {
        audience: { in: ["BROTHERS", "ALL"] },
        closedAt: null
      },
      include: {
        votes: {
          select: {
            id: true,
            brotherId: true,
            alumniId: true,
            optionId: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    // Pinned & recent announcements
    prisma.announcement.findMany({
      where: {
        audience: { in: ["BROTHERS", "ALL"] },
        status: "sent"
      },
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" }
      ],
      take: 15,
      select: {
        id: true,
        title: true,
        body: true,
        pinned: true,
        createdAt: true,
        author: {
          select: { name: true, position: true }
        },
        pollId: true,
        poll: {
          select: {
            id: true,
            question: true,
            options: true,
            createdById: true,
            closesAt: true,
            closedAt: true,
            audience: true,
            createdAt: true,
            updatedAt: true,
            votes: {
              select: {
                id: true,
                brotherId: true,
                alumniId: true,
                optionId: true
              }
            }
          }
        }
      }
    }),
    // Directory of opted-in alumni for networking
    prisma.alumniProfile.findMany({
      where: { optInDirectory: true },
      orderBy: { graduationYear: "desc" },
      select: {
        id: true,
        fullName: true,
        preferredName: true,
        graduationYear: true,
        pledgeClass: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        employer: true,
        jobTitle: true,
        linkedinUrl: true,
        bio: true,
      }
    }),
    // Career opportunities / job postings
    prisma.jobPosting.findMany({
      orderBy: { createdAt: "desc" }
    }),
    // Stripe dues configs from the SiteConfig KV store
    prisma.siteConfig.findMany({
      where: {
        key: {
          in: ["dues.enabled", "dues.amountCents", "dues.year", "dues.label", "dues.stripePublishableKey"]
        }
      }
    }),
  ]);
  } catch (err) {
    if (isNextSignal(err)) throw err;
    console.error("[brothers dashboard] data load failed:", err);
    redirect("/portal/brothers?error=unavailable");
  }

  const duesEnabled = configs.find(c => c.key === "dues.enabled")?.value === "true";
  const duesAmountCents = parseInt(configs.find(c => c.key === "dues.amountCents")?.value || "0", 10);
  const duesConfig = {
    enabled: duesEnabled,
    amountCents: duesAmountCents,
    year: configs.find(c => c.key === "dues.year")?.value || "",
    label: configs.find(c => c.key === "dues.label")?.value || "Active Dues",
    stripePublishableKey: configs.find(c => c.key === "dues.stripePublishableKey")?.value || "",
    // "Configured" = the chapter has actually set dues up: online dues is enabled
    // AND a positive amount is set. A chapter that never touched dues (no plan, no
    // amount) is NOT configured, so the member-facing Dues card/tab is hidden for
    // plain members (exec/admin still see it so they can finish setup).
    configured: duesEnabled && duesAmountCents > 0,
  };

  // Engagement / good-standing — computed from existing signals (no new tables).
  // Best-effort: a failure here must never break the dashboard, so degrade to
  // null and the widget simply doesn't render.
  const standing = await loadMemberStanding(brother.id).catch(() => null);

  // Formatting helper
  const formattedBrother = {
    ...brother,
    createdAt: brother.createdAt.toISOString(),
    updatedAt: brother.updatedAt.toISOString(),
    lastSeen: brother.lastSeen.toISOString(),
    initiationDate: brother.initiationDate ? brother.initiationDate.toISOString() : null,
  };

  const formattedEvents = events.map(e => ({
    id: e.id,
    name: e.name,
    description: e.description,
    location: e.location,
    dressCode: e.dressCode,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    category: e.category,
    myRsvp: e.rsvps[0] || null,
  }));

  const formattedServiceEvents = serviceEvents.map(se => ({
    ...se,
    eventDate: se.eventDate.toISOString(),
  }));

  const formattedDuesPayments = duesPayments.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    duesPaidAt: p.status === "PAID" ? p.updatedAt.toISOString() : null,
  }));

  const formattedMeetings = meetings.map(m => ({
    id: m.id,
    title: m.title,
    scheduledAt: m.scheduledAt.toISOString(),
    duration: m.duration,
    location: m.location,
    notes: m.notes,
    status: m.status,
    myAttendance: m.attendance[0] || null,
  }));

  const formattedChores = chores.map(c => ({
    ...c,
    weekStarting: c.weekStarting.toISOString(),
    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
  }));

  const formattedServiceLogs = serviceLogs.map(l => ({
    id: l.id,
    description: l.description,
    hoursLogged: Number(l.hoursLogged),
    performedAt: l.performedAt.toISOString(),
    status: l.status,
    approvedAt: l.approvedAt ? l.approvedAt.toISOString() : null,
    rejectionReason: l.rejectionReason,
    createdAt: l.createdAt.toISOString(),
    serviceEvent: l.serviceEvent,
  }));

  const formattedAnnouncements = announcements.map(a => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    poll: a.poll ? {
      ...a.poll,
      createdAt: a.poll.createdAt.toISOString(),
      updatedAt: a.poll.updatedAt.toISOString(),
      closesAt: a.poll.closesAt ? a.poll.closesAt.toISOString() : null,
      closedAt: a.poll.closedAt ? a.poll.closedAt.toISOString() : null,
    } : null
  }));

  const formattedJobPostings = jobPostings.map(j => ({
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    description: j.description,
    requirements: j.requirements,
    salary: j.salary,
    contactName: j.contactName,
    contactEmail: j.contactEmail,
    contactPhone: j.contactPhone,
    postedById: j.postedById,
    postedByName: j.postedByName,
    postedByRole: j.postedByRole,
    createdAt: j.createdAt.toISOString(),
  }));

  return (
    <BrothersDashboardClient
      brother={formattedBrother}
      meetings={formattedMeetings}
      chores={formattedChores}
      serviceLogs={formattedServiceLogs}
      events={formattedEvents}
      serviceEvents={formattedServiceEvents}
      duesPayments={formattedDuesPayments}
      polls={polls}
      announcements={formattedAnnouncements}
      alumniNetwork={alumniNetwork}
      jobPostings={formattedJobPostings}
      duesConfig={duesConfig}
      standing={standing ? { score: standing.result.score, max: standing.result.max, pct: standing.result.pct, standing: standing.result.standing, breakdown: standing.result.breakdown } : null}
      isAdmin={sess.isAdmin}
    />
  );
}
