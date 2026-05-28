import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/portal-auth";
import DashboardClient from "./DashboardClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alumni Portal Dashboard",
  description: "Stay connected with the chapter and fellow alumni.",
};

export default async function AlumniDashboardPage() {
  const sess = requireRole("alumni");
  if (!sess) {
    redirect("/portal/alumni");
  }

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
  const alumniProfile = await prisma.alumniProfile.findUnique({
    where: { id: alumniId },
    include: {
      donations: {
        orderBy: { recordedAt: "desc" }
      }
    }
  });

  if (!alumniProfile) {
    redirect("/portal/alumni/register");
  }

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

  // Fetch active polls open to alumni
  const polls = await prisma.poll.findMany({
    where: { 
      audience: "ALUMNI",
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
      isAdmin={sess.isAdmin}
    />
  );
}
