import { prisma } from "@/lib/prisma";
import { EventsManager } from "@/components/admin/events-manager";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  let events: any[] = [];
  try {
    events = await prisma.event.findMany({ orderBy: { startsAt: "asc" } });
  } catch {
    events = [];
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
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Public events show on the rush page. Private events are invite-only.
        </p>
      </div>
      <EventsManager initial={serializable as any} />
    </main>
  );
}
