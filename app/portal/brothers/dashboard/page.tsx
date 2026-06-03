import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/portal-auth";
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

export default async function BrothersDashboardPage({
  searchParams,
}: {
  searchParams: { as?: string };
}) {
  const sess = requireRole("brother");
  if (!sess) {
    redirect("/portal/brothers");
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
      // Admin override: NEVER auto-pick an arbitrary member — that rendered a
      // random brother's full dues/PII ledger. Require an explicit ?as=<id>
      // (admin chose who to view); otherwise send them to the roster to pick.
      if (searchParams?.as) {
        brotherId = searchParams.as;
      } else {
        redirect("/admin/brothers?portalView=1");
      }
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

  // Fetch Chapter Meeting Attendance
  const meetings = await prisma.chapterMeeting.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      attendance: {
        where: { memberId: brother.id }
      }
    }
  });

  // Fetch Chore Wheel Assignments
  const chores = await prisma.choreWheelAssignment.findMany({
    where: { memberId: brother.id },
    orderBy: { weekStarting: "desc" },
    include: {
      task: true
    }
  });

  // Fetch Service Hour Logs
  const serviceLogs = await prisma.serviceHourLog.findMany({
    where: { memberId: brother.id },
    orderBy: { performedAt: "desc" },
    include: {
      serviceEvent: {
        select: { id: true, title: true }
      }
    }
  });

  // Fetch all upcoming events (so the brother can RSVP)
  const events = await prisma.event.findMany({
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
  });

  // Fetch approved service events for log association
  const serviceEvents = await prisma.serviceEvent.findMany({
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
  });

  // Fetch past dues payments
  const duesPayments = await prisma.duesPayment.findMany({
    where: { brotherId: brother.id },
    orderBy: { createdAt: "desc" }
  });

  // Fetch active surveys/polls
  const polls = await prisma.poll.findMany({
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
  });

  // Fetch pinned & recent announcements
  const announcements = await prisma.announcement.findMany({
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
      }
    }
  });

  // Fetch directory of opted-in alumni for networking
  const alumniNetwork = await prisma.alumniProfile.findMany({
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
  });

  // Load Stripe dues configs from SiteConfig KV store
  const configs = await prisma.siteConfig.findMany({
    where: {
      key: {
        in: ["dues.enabled", "dues.amountCents", "dues.year", "dues.label", "dues.stripePublishableKey", "chapter.billingPlan"]
      }
    }
  });

  const duesConfig = {
    enabled: configs.find(c => c.key === "dues.enabled")?.value === "true",
    amountCents: parseInt(configs.find(c => c.key === "dues.amountCents")?.value || "0", 10),
    year: configs.find(c => c.key === "dues.year")?.value || "",
    label: configs.find(c => c.key === "dues.label")?.value || "Active Dues",
    stripePublishableKey: configs.find(c => c.key === "dues.stripePublishableKey")?.value || "",
    billingPlan: configs.find(c => c.key === "chapter.billingPlan")?.value || "dues_split",
  };

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
      duesConfig={duesConfig}
      isAdmin={sess.isAdmin}
    />
  );
}
