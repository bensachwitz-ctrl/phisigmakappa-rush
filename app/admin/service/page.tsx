import { prisma } from "@/lib/prisma";
import { requireOfficerPermission, checkOfficerPermission } from "@/lib/permissions";
import { ServiceClient } from "./service-client";

export const dynamic = "force-dynamic";

export default async function ServicePage() {
  await requireOfficerPermission("service", "read");
  const { allowed: canWrite } = await checkOfficerPermission("service", "write");

  // Pending (submitted) service-hour submissions — the default approval queue.
  const hours = await prisma.serviceHourLog.findMany({
    where: { status: "submitted" },
    orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
    include: {
      member: { select: { id: true, name: true, status: true } },
      serviceEvent: { select: { id: true, title: true, partnerOrg: true } },
    },
  });

  const events = await prisma.serviceEvent.findMany({
    orderBy: [{ eventDate: "desc" }],
    include: { _count: { select: { hours: true } } },
  });

  const partners = await prisma.servicePartnerOrg.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  // Serialize Decimal + Date fields to plain JSON for the client boundary.
  const serializedHours = hours.map((h) => ({
    id: h.id,
    memberId: h.memberId,
    serviceEventId: h.serviceEventId,
    description: h.description,
    hoursLogged: Number(h.hoursLogged),
    performedAt: h.performedAt.toISOString(),
    status: h.status,
    rejectionReason: h.rejectionReason,
    createdAt: h.createdAt.toISOString(),
    member: h.member,
    serviceEvent: h.serviceEvent,
  }));

  const serializedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    partnerOrg: e.partnerOrg,
    partnerUrl: e.partnerUrl,
    eventDate: e.eventDate.toISOString(),
    hoursPerSlot: e.hoursPerSlot == null ? null : Number(e.hoursPerSlot),
    status: e.status,
    hoursCount: e._count.hours,
  }));

  const serializedPartners = partners.map((p) => ({
    id: p.id,
    name: p.name,
    website: p.website,
    contactEmail: p.contactEmail,
    contactPhone: p.contactPhone,
    description: p.description,
    active: p.active,
  }));

  return (
    <ServiceClient
      initialHours={serializedHours}
      initialEvents={serializedEvents}
      initialPartners={serializedPartners}
      canWrite={canWrite}
    />
  );
}
