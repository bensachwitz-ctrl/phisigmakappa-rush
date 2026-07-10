import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { guardOfficerOrAdmin } from "@/lib/permissions";
import { guardBillingWrite } from "@/lib/billing-guard";
import { audit } from "@/lib/audit";
import { pushEventToCalDiy } from "@/lib/events";
import { routeEventToRecipients, listPortalRecipients } from "@/lib/notify/prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_CATEGORIES = ["RUSH", "DATE", "BROTHERHOOD", "CHAPTER", "SOCIAL", "OTHER"] as const;

const EventSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  dressCode: z.string().max(120).optional().or(z.literal("")),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().or(z.literal("")),
  isPrivate: z.boolean().optional().default(false),
  category: z.enum(EVENT_CATEGORIES).optional().default("OTHER"),
  // Edit mode: when an `id` is supplied the route updates instead of creates,
  // so the admin "Edit" button on each event card can re-use this endpoint.
  id: z.string().optional(),
});

export async function GET() {
  // Returns the FULL admin event list — including isPrivate events — so it needs
  // the officer/admin floor (the API twin of the /admin layout boundary), not
  // isAdminAuthed() alone (which any valid member-login cookie passes). Member-
  // facing calendar surfaces read their own non-admin endpoint, not this one.
  const denied = await guardOfficerOrAdmin();
  if (denied) return denied;
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // Admin-only — only the rush chair / e-board should create or edit events.
  // Members see events through /api/brother/events (read-only).
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  // Billing WRITE guard (P1): a locked-out chapter may not create/edit/delete events.
  const billingLocked = await guardBillingWrite();
  if (billingLocked) return billingLocked;
  try {
    const body = await req.json();
    const data = EventSchema.parse(body);

    // If `id` is supplied, this is an edit — update the existing row instead of
    // creating a new one. Lets the admin Events panel reuse one POST endpoint
    // for both add + edit, with the form deciding which mode based on whether
    // an id is bound to the form state.
    if (data.id) {
      const updated = await prisma.event.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description || null,
          location: data.location || null,
          dressCode: data.dressCode || null,
          startsAt: new Date(data.startsAt),
          endsAt: data.endsAt ? new Date(data.endsAt) : null,
          isPrivate: !!data.isPrivate,
          category: data.category || "OTHER",
        },
      });
      await audit({
        action: "EVENT_UPDATED",
        subjectType: "Event",
        subjectId: updated.id,
        subjectName: updated.name,
        details: `${updated.category}${updated.isPrivate ? " · private" : ""}`,
        req,
      });
      return NextResponse.json({ ok: true, event: updated });
    }

    // NEW-event past-date guard (backlog #6). Reject creating an event whose
    // start time is already in the past — a fat-fingered year / AM-PM shouldn't
    // silently publish a "past" event onto the brother calendar or the public
    // schedule. This mirrors the intent of the existing meeting past-date guard
    // (app/admin/meetings/meetings-client.tsx) but as a HARD server-side 400 so
    // the rule holds for every API client, not just the web form. We guard ONLY
    // creation: the edit branch above is intentionally NOT gated, so an admin can
    // still correct details on an event that has already happened. `data.startsAt`
    // arrives as a UTC ISO string (the form converts the chapter-local wall-clock
    // to UTC before POSTing), so comparing against Date.now() is timezone-safe. A
    // small grace window absorbs clock skew + the seconds between form-fill and
    // submit so an event set for "a moment ago" isn't rejected.
    const startsAtDate = new Date(data.startsAt);
    if (Number.isNaN(startsAtDate.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Please choose a valid start date and time." },
        { status: 400 },
      );
    }
    const PAST_GRACE_MS = 5 * 60 * 1000;
    if (startsAtDate.getTime() < Date.now() - PAST_GRACE_MS) {
      return NextResponse.json(
        {
          ok: false,
          error: "This event's start time is in the past. Pick a future date and time.",
        },
        { status: 400 },
      );
    }

    const created = await prisma.event.create({
      data: {
        name: data.name,
        description: data.description || null,
        location: data.location || null,
        dressCode: data.dressCode || null,
        startsAt: startsAtDate,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isPrivate: !!data.isPrivate,
        category: data.category || "OTHER",
      },
    });
    await audit({
      action: "EVENT_CREATED",
      subjectType: "Event",
      subjectId: created.id,
      subjectName: created.name,
      details: `${created.category} · ${new Date(created.startsAt).toLocaleDateString()}${created.isPrivate ? " · private" : ""}`,
      req,
    });

    // Optional cal.diy booking push for public (bookable) events — e.g. rush
    // meetings. Degrades gracefully: when cal.diy isn't configured this no-ops
    // and event creation is unaffected. Never blocks the response on a booking
    // failure; we surface the result so the UI can show a "booking link" toast.
    let calDiy: Awaited<ReturnType<typeof pushEventToCalDiy>> | null = null;
    if (!created.isPrivate) {
      calDiy = await pushEventToCalDiy(created).catch(() => null);
    }

    // notify #2 — route the new event to each opted-in recipient's chosen
    // external channels (per-user prefs). Best-effort; never blocks the create.
    const recipients = await listPortalRecipients(["brother", "alumni"]);
    await routeEventToRecipients(
      {
        event: "event.posted",
        title: `New event: ${created.name}`,
        body: created.description || created.location || "A new chapter event was posted.",
        url: "/portal/brothers/dashboard",
      },
      recipients,
    );

    return NextResponse.json({ ok: true, event: created, calDiy });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isAdminRole()) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  // Billing WRITE guard (P1): a locked-out chapter may not create/edit/delete events.
  const billingLocked = await guardBillingWrite();
  if (billingLocked) return billingLocked;
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const victim = await prisma.event.findUnique({
    where: { id },
    select: { name: true, category: true, startsAt: true },
  }).catch(() => null);
  await prisma.event.delete({ where: { id } });
  await audit({
    action: "EVENT_DELETED",
    subjectType: "Event",
    subjectId: id,
    subjectName: victim?.name || null,
    details: victim ? `${victim.category} · was ${new Date(victim.startsAt).toLocaleDateString()}` : null,
    req,
  });
  return NextResponse.json({ ok: true });
}
