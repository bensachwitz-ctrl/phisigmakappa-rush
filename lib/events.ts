import { getCalDiyConfig } from "./messaging-config";

/**
 * Event + booking helpers.
 *
 *   1. ICS generation — buildEventIcs() produces a single-event RFC-5545
 *      calendar file for an "Add to calendar" button on any chapter event.
 *      Pure + side-effect-free, so it's safe in route handlers and at build.
 *   2. cal.diy push — pushEventToCalDiy() registers a created chapter event as
 *      a bookable slot on the configured cal.diy/Cal.com instance (e.g. rush
 *      meetings). DEGRADES GRACEFULLY: when no cal.diy URL/API key is set, it
 *      no-ops and the event still has its in-app row + ICS download. No fake
 *      "booked".
 *   3. Reminder hooks — eventReminderText() builds the shared SMS/email reminder
 *      copy so lib/sms + lib/email callers can fire event reminders uniformly.
 *
 * The full public *feed* (webcal subscription of all public events) lives in
 * app/api/events.ics/route.ts and is unchanged — this module is the per-event
 * "add this one event to my calendar" + booking-push complement.
 */

export type EventLike = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

// ── ICS primitives (shared with the feed route's formatting rules) ───────────

/** Format a Date as iCalendar UTC timestamp YYYYMMDDTHHMMSSZ. */
export function formatIcsDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/** Escape iCalendar text per RFC 5545: backslash, semicolon, comma, newline. */
export function escapeIcs(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * RFC 5545 §3.1 line folding by UTF-8 octet length (not JS string length).
 * Lines >75 octets are split; continuations start with a single space.
 */
export function foldIcsLine(line: string): string {
  const MAX = 75;
  const bytes = Buffer.from(line, "utf-8");
  if (bytes.length <= MAX) return line;
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < bytes.length) {
    const room = chunks.length === 0 ? MAX : MAX - 1;
    let end = Math.min(cursor + room, bytes.length);
    while (end > cursor && (bytes[end] & 0b1100_0000) === 0b1000_0000) end--;
    if (end === cursor) end = Math.min(cursor + room, bytes.length);
    const chunk = bytes.subarray(cursor, end).toString("utf-8");
    chunks.push(chunks.length === 0 ? chunk : " " + chunk);
    cursor = end;
  }
  return chunks.join("\r\n");
}

/**
 * Build a single-event ICS document for an "Add to calendar" button/download.
 *
 * @param event    the chapter event
 * @param opts.host UID host (defaults to "greekstack") for RFC-unique UIDs
 * @param opts.prodId PRODID vendor token (defaults to the platform name)
 * @param opts.url  optional event URL embedded in the VEVENT
 */
export function buildEventIcs(
  event: EventLike,
  opts: { host?: string; prodId?: string; url?: string } = {},
): string {
  const host = opts.host || "greekstack";
  const prodId = opts.prodId || "-//Greekstack//Chapter Events//EN";
  const now = new Date();
  const start = formatIcsDate(event.startsAt);
  const endSource =
    event.endsAt ??
    new Date(new Date(event.startsAt).getTime() + 2 * 60 * 60 * 1000);
  const end = formatIcsDate(endSource);
  const stamp = formatIcsDate(event.updatedAt || event.createdAt || now);
  const uid = `${event.id}@${host}`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(event.name)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : "",
    event.location ? `LOCATION:${escapeIcs(event.location)}` : "",
    opts.url ? `URL:${escapeIcs(opts.url)}` : "",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.filter(Boolean).map(foldIcsLine).join("\r\n") + "\r\n";
}

/**
 * Build the relative URL of the per-event ICS endpoint. Calendar apps and the
 * "Add to calendar" button both point here. Mirrors /api/events/[id]/ics.
 */
export function eventIcsHref(eventId: string): string {
  return `/api/events/${encodeURIComponent(eventId)}/ics`;
}

// ── Reminder copy (shared by SMS + email reminder hooks) ─────────────────────

/** Compact reminder line for an event — used by SMS (short) + email. */
export function eventReminderText(
  event: EventLike,
  opts: { chapterShort?: string; timezone?: string } = {},
): string {
  const when = formatHumanWhen(event.startsAt, opts.timezone);
  const where = event.location ? ` at ${event.location}` : "";
  const lead = opts.chapterShort ? `${opts.chapterShort}: ` : "";
  return `${lead}Reminder — ${event.name} is ${when}${where}.`;
}

function formatHumanWhen(d: Date | string, timezone?: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "America/New_York",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

// ── cal.diy / Cal.com booking push ───────────────────────────────────────────

export type CalDiyPushResult = {
  /** false when cal.diy isn't configured (URL/API key) — caller no-ops. */
  configured: boolean;
  /** true when the push succeeded. */
  ok: boolean;
  /** cal.diy event/booking id when returned. */
  id?: string;
  /** Booking/share URL for the created slot when available, else the portal URL. */
  bookingUrl?: string;
  error?: string;
};

/**
 * Push a chapter event to cal.diy/Cal.com as a bookable slot. Best-effort:
 *
 *   • No cal.diy URL configured        → { configured: false, ok: false } (no-op)
 *   • URL but no API key (embed-only)  → { configured: true, ok: false,
 *                                          bookingUrl } so the UI can still link
 *                                          the booking portal without an API push
 *   • URL + API key                    → attempts a Cal.com v2 event-type/slot
 *                                          create; returns the booking URL
 *
 * The Cal.com REST surface varies by self-host version; we attempt the v2
 * event-types create and tolerate failure (returning the portal URL) so a
 * version mismatch never breaks event creation.
 */
export async function pushEventToCalDiy(
  event: EventLike,
  opts: { durationMinutes?: number } = {},
): Promise<CalDiyPushResult> {
  const cfg = await getCalDiyConfig();
  if (!cfg.url) {
    return { configured: false, ok: false };
  }
  const portalUrl = cfg.url;

  // Embed-only mode: a URL is set but no API key → we can't push programmatically,
  // but the booking portal link is still useful. Surface it, mark ok:false so the
  // caller knows nothing was created server-side.
  if (!cfg.apiKey) {
    return { configured: true, ok: false, bookingUrl: portalUrl };
  }

  // Derive duration from start/end when present, else the opt/30-min default.
  const durationMinutes =
    opts.durationMinutes ||
    (event.endsAt
      ? Math.max(
          15,
          Math.round(
            (new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60000,
          ),
        )
      : 30);

  const base = portalUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/v2/event-types`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: event.name,
        slug: slugify(`${event.name}-${event.id}`),
        description: event.description || undefined,
        lengthInMinutes: durationMinutes,
        // Cal.com hides nothing extra; the chapter publishes its own avail.
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // Soft-fail to the portal URL so event creation still succeeds.
      return {
        configured: true,
        ok: false,
        bookingUrl: portalUrl,
        error: `cal.diy ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
      };
    }
    const json: any = await res.json().catch(() => null);
    const id = json?.data?.id || json?.id;
    const slug = json?.data?.slug || json?.slug;
    const bookingUrl = slug ? `${base}/${slug}` : portalUrl;
    return { configured: true, ok: true, id: id ? String(id) : undefined, bookingUrl };
  } catch (err: any) {
    return {
      configured: true,
      ok: false,
      bookingUrl: portalUrl,
      error: err?.message || "cal.diy push failed",
    };
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
