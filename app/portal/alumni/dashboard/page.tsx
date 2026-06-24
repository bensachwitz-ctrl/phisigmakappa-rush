import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, portalMustResetRedirect } from "@/lib/portal-auth";
import DashboardClient from "./DashboardClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alumni Portal Dashboard",
  description: "Stay connected with the chapter and fellow alumni.",
};

// next/navigation redirect() + notFound() signal via a thrown object whose
// `digest` starts with "NEXT_". Re-throw those so routing still works; treat
// everything else as a real failure to bounce on.
function isNextSignal(err: unknown): boolean {
  return !!err && typeof err === "object" && "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_");
}

export default async function AlumniDashboardPage() {
  const sess = requireRole("alumni");
  if (!sess) {
    redirect("/portal/alumni");
  }

  // PHASE-3 OTP gate: an OTP-verified session is flagged mustReset and may only
  // reach the "create new password" step until the password is set.
  const resetTo = await portalMustResetRedirect();
  if (resetTo) {
    redirect(resetTo);
  }

  // Load the alumnus profile (+ donations). Wrapped so a DB connectivity
  // failure — most often a missing DATABASE_URL on the host — bounces the
  // user to the login screen instead of crashing into the global "We hit a
  // snag" error boundary. redirect() is re-thrown via isNextSignal so the
  // not-registered / not-found redirects still work.
  let alumniProfile;
  try {
    // Resolve alumni profile ID
    let alumniId: string | null | undefined = null;
    if (sess.portal) {
      const portalUser = await prisma.portalUser.findUnique({
        where: { id: sess.portal.userId },
      });
      alumniId = portalUser?.alumniId;
    }

    if (sess.isAdmin && !alumniId) {
      // If admin is overriding, pick the first alumnus profile in the system
      const firstAlumni = await prisma.alumniProfile.findFirst();
      alumniId = firstAlumni?.id;
    }

    if (!alumniId) {
      // No alumni profile found, redirect to registration
      redirect("/portal/alumni/register");
    }

    // Fetch the Alumnus profile
    alumniProfile = await prisma.alumniProfile.findUnique({
      where: { id: alumniId },
      include: {
        donations: {
          orderBy: { recordedAt: "desc" }
        }
      }
    });
  } catch (err) {
    if (isNextSignal(err)) throw err;
    console.error("[alumni dashboard] load failed:", err);
    redirect("/portal/alumni?error=unavailable");
  }

  if (!alumniProfile) {
    redirect("/portal/alumni/register");
  }

  // `alumniId` is needed by the vouches query below; re-derive from the
  // resolved profile (it's the same id) so it stays in scope after the try.
  const alumniId = alumniProfile.id;

  // Fetch active undergraduate brothers roster
  const brothers = await prisma.brother.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      year: true,
      major: true,
      position: true,
      pledgeClass: true,
      headshotUrl: true,
    },
  });

  // Fetch all alumni who opted into directory
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
    },
  });

  // Fetch all active PNMs in rush
  const allPnms = await prisma.rush.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hometown: true,
      major: true,
      year: true,
    },
  });

  // Fetch existing vouches by this alumnus
  const vouches = await prisma.alumniVouch.findMany({
    where: { alumniId },
  });

  // Fetch active polls open to alumni. R46 — include "ALL"-audience polls
  // too (mirrors the events query above which is audience IN [ALL, ALUMNI]),
  // so a poll created for the whole chapter reaches alumni, not only
  // alumni-exclusive ones.
  const polls = await prisma.poll.findMany({
    where: {
      audience: { in: ["ALUMNI", "ALL"] },
      closedAt: null,
    },
    include: {
      votes: {
        select: {
          id: true,
          brotherId: true,
          alumniId: true,
          optionId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch events visible to alumni
  const events = await prisma.event.findMany({
    where: {
      audience: { in: ["ALL", "ALUMNI"] },
      startsAt: { gte: new Date() },
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
    },
  });

  // Fetch pinned & recent announcements for Alumni
  const announcements = await prisma.announcement.findMany({
    where: {
      audience: { in: ["ALUMNI", "ALL"] },
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
  });

  // Fetch career opportunities / job postings
  const jobPostings = await prisma.jobPosting.findMany({
    orderBy: { createdAt: "desc" }
  });

  // Collapse type definition safety
  const formattedAlumni = {
    ...alumniProfile,
    graduationYear: alumniProfile.graduationYear,
  };

  const formattedEvents = events.map(e => ({
    ...e,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
  }));

  const formattedDonations = (alumniProfile?.donations || []).map(d => ({
    ...d,
    recordedAt: d.recordedAt.toISOString(),
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

  return (
    <DashboardClient
      alumni={formattedAlumni}
      brothers={brothers}
      alumniNetwork={alumniNetwork}
      allPnms={allPnms}
      vouches={vouches}
      polls={polls}
      events={formattedEvents}
      donations={formattedDonations}
      jobPostings={formattedJobPostings}
      announcements={formattedAnnouncements}
      isAdmin={sess.isAdmin}
    />
  );
}
