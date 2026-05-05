import { prisma } from "@/lib/prisma";
import { EventsManager } from "@/components/admin/events-manager";
import { AddEventButton } from "@/components/admin/add-event-button";
import { BrotherEventsSection } from "@/components/brother/brother-events-section";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const session = await getCurrentSession();
  const isBrother = !!session;
  const isAdmin = !!session?.isAdmin;

  let events: any[] = [];
  if (isAdmin) {
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

  return (
    <main className="container py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Public events show on the rush page. Private events are invite-only."
              : "RSVP for upcoming chapter events."}
          </p>
        </div>
        {/* Page-header "+ Add event" — lives at the top of the events page
            for admins so they can drop a new event without scrolling past the
            brother calendar. Triggers the EventsManager dialog via a custom
            DOM event. */}
        {isAdmin && <AddEventButton />}
      </div>

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

      {isAdmin && (
        <section id="manage-events" aria-labelledby="admin-events-heading" className="scroll-mt-24">
          <div className="mb-4">
            <h2
              id="admin-events-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Manage events
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Create, edit, and track attendance.
            </p>
          </div>
          <EventsManager initial={serializable as any} />
        </section>
      )}
    </main>
  );
}
