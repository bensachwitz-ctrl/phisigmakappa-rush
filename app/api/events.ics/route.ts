import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public iCalendar feed of upcoming public rush events.
 *
 * Brothers and rushees can subscribe via webcal://phisigmakappa.vercel.app/api/events.ics
 * (most calendar apps recognize that scheme and auto-refresh). Direct https:// also works
 * for one-shot import.
 *
 * Only public events (`isPrivate: false`) appear in the feed — invite-only formals
 * and bid nights are intentionally hidden. The feed includes events from 30 days
 * ago through the next 6 months so calendar apps showing "this month" still
 * render attended events without growing the feed unbounded.
 */
export async function GET(req: Request) {
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const origin = new URL(req.url).origin;

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const until = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months out

  let events: Awaited<ReturnType<typeof prisma.event.findMany>> = [];
  try {
    events = await prisma.event.findMany({
      where: {
        isPrivate: false,
        startsAt: { gte: since, lte: until },
      },
      orderBy: { startsAt: "asc" },
    });
  } catch {
    events = [];
  }

  const calendarName = "Phi Sigma Kappa Gamma Triton — Rush at USC";
  const calendarDesc =
    "Public rush events for Phi Sigma Kappa Gamma Triton at the University of South Carolina. Subscribe to get every event automatically.";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Phi Sigma Kappa Gamma Triton//Rush USC//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    `X-WR-CALDESC:${escapeIcs(calendarDesc)}`,
    "X-WR-TIMEZONE:America/New_York",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const e of events) {
    const start = formatIcsDate(e.startsAt);
    const end = formatIcsDate(e.endsAt ?? new Date(e.startsAt.getTime() + 2 * 60 * 60 * 1000));
    const uid = `${e.id}@phisigmakappa.vercel.app`;
    const stamp = formatIcsDate(e.updatedAt || e.createdAt || now);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(e.name)}`,
      e.description ? `DESCRIPTION:${escapeIcs(e.description)}` : "",
      e.location ? `LOCATION:${escapeIcs(e.location)}` : "",
      e.dressCode ? `X-DRESS-CODE:${escapeIcs(e.dressCode)}` : "",
      `URL:${origin}/#schedule`,
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`,
      `CATEGORIES:Rush,${escapeIcs(cfg["philanthropy.beneficiaryShort"] || "Phi Sigma Kappa")}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  // Filter empty lines (the optional ones above), fold each line at 75 octets
  // per RFC 5545 §3.1, and CRLF-terminate. Outlook desktop and some Android
  // calendar parsers silently reject events whose DESCRIPTION/LOCATION line
  // exceeds 75 octets unless folded.
  const body =
    lines.filter(Boolean).map(foldIcsLine).join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="phisigmakappa-rush.ics"',
      // 1 hour browser cache + 6h edge cache; calendar apps re-fetch on their own schedule.
      "Cache-Control": "public, max-age=3600, s-maxage=21600",
      "CDN-Cache-Control": "public, max-age=21600",
    },
  });
}

/** Format a Date as iCalendar UTC timestamp YYYYMMDDTHHMMSSZ. */
function formatIcsDate(d: Date | string): string {
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
function escapeIcs(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * RFC 5545 §3.1 line folding. Lines longer than 75 octets MUST be split, and
 * each continuation MUST start with a single whitespace character (space).
 * We fold by UTF-8 byte length (not JS string length) because RFC measures
 * octets — a non-ASCII char like "—" is 3 octets but 1 JS code unit.
 */
function foldIcsLine(line: string): string {
  const MAX = 75;
  const bytes = Buffer.from(line, "utf-8");
  if (bytes.length <= MAX) return line;
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < bytes.length) {
    // First chunk uses the full 75 octets; continuation chunks reserve one
    // octet for the leading space, so use 74.
    const room = chunks.length === 0 ? MAX : MAX - 1;
    let end = Math.min(cursor + room, bytes.length);
    // Don't slice mid-multibyte. Walk back until we land on a UTF-8 boundary.
    while (end > cursor && (bytes[end] & 0b1100_0000) === 0b1000_0000) end--;
    if (end === cursor) end = Math.min(cursor + room, bytes.length);
    const chunk = bytes.subarray(cursor, end).toString("utf-8");
    chunks.push(chunks.length === 0 ? chunk : " " + chunk);
    cursor = end;
  }
  return chunks.join("\r\n");
}
