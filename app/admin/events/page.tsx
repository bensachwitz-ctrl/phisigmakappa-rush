import { prisma } from "@/lib/prisma";
import { EventsManager } from "@/components/admin/events-manager";
import { AddEventButton } from "@/components/admin/add-event-button";
import { BrotherEventsSection } from "@/components/brother/brother-events-section";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { IconEvents } from "@/components/brand/icons";
import { getCurrentSession } from "@/lib/auth";
import { checkOfficerPermission } from "@/lib/permissions";
import { getSiteConfig } from "@/lib/site-config";
import { CalcomEmbed } from "@/components/CalcomEmbed";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const session = await getCurrentSession();
  const isBrother = !!session;

  // P2 fix: this page used to gate the whole manager on `session.isAdmin`, so a
  // real events officer (Secretary / Recruitment / Social / Philanthropy /
  // Brotherhood Chair / VP / Marshal — all hold events:write) couldn't manage
  // events even though the RBAC model grants it. Mirror the announcements
  // pattern: events:read admits the manager surface, events:write governs the
  // create/edit/delete controls. Super-admins pass both.
  const { allowed: canManage } = await checkOfficerPermission("events", "read");
  const { allowed: canWrite } = await checkOfficerPermission("events", "write");

  let events: any[] = [];
  if (canManage) {
    try {
      events = await prisma.event.findMany({ orderBy: { startsAt: "asc" } });
    } catch {
      events = [];
    }
  }
  const serializable = events.map((e) => ({
    ...e,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  // Chapter's optional Cal.com / Cal.diy scheduler handle. Set on
  // /admin/settings → Calendar; blank = the CalcomEmbed self-hides so this
  // surface is never a broken frame.
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const calDiyUrl = cfg["calendar.calDiyUrl"] || "";

  return (
    <div className="container py-8">
      {/* Page-header "+ Add event" — lives at the top of the events page
          for admins so they can drop a new event without scrolling past the
          brother calendar. Triggers the EventsManager dialog via a custom
          DOM event. */}
      <AdminPageHeader
        icon={IconEvents}
        title="Events"
        subtitle={
          canManage
            ? "Public events show on the rush page. Private events are invite-only."
            : "RSVP for upcoming chapter events."
        }
        action={canWrite ? <AddEventButton /> : undefined}
      />

      {isBrother && (
        <section aria-labelledby="brother-calendar-heading" className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2
                id="brother-calendar-heading"
                className="text-xl font-semibold tracking-tight"
              >
                Brother calendar
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Upcoming chapter events. RSVP so the e-board has a real
                headcount.
              </p>
            </div>
          </div>
          <BrotherEventsSection />
        </section>
      )}

      {/* Self-serve scheduling — the chapter's Cal.com / Cal.diy booker, shown to
          brothers and visitors when a handle is configured. Self-hides otherwise. */}
      <div className="mb-10">
        <CalcomEmbed
          calUrl={calDiyUrl}
          subtitle="Grab a time with the chapter for rush coffees, interviews, and more."
        />
      </div>

      {canManage && (
        <section id="manage-events" aria-labelledby="admin-events-heading" className="scroll-mt-24">
          <div className="mb-4">
            <h2
              id="admin-events-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Manage events
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {canWrite
                ? "Create, edit, and track attendance."
                : "Review the chapter schedule. Ask an events officer to add or edit."}
            </p>
          </div>
          <EventsManager initial={serializable as any} canWrite={canWrite} />
        </section>
      )}
    </div>
  );
}
