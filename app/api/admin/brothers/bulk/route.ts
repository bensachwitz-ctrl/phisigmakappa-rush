import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, isSameOrigin, getCurrentBrother } from "@/lib/auth";
import { guardBillingWrite } from "@/lib/billing-guard";
import { audit } from "@/lib/audit";
import { getChapterIdentity, type ChapterIdentity } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(req: Request) {
  return process.env.SITE_URL || `${new URL(req.url).origin}`;
}

/** Escape caller-supplied plain strings before HTML interpolation. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Branded onboarding-invite email — identical chrome to the single-invite
 *  sender in app/api/admin/brother-invites/route.ts (per-tenant Resend creds +
 *  the chapter's brand-tinted masthead/CTA, never a hardcoded red). Kept here so
 *  the bulk/single-add path actually DELIVERS the invite it creates. */
async function sendInviteEmail(
  to: string,
  link: string,
  sender: string,
  identity: ChapterIdentity,
  brandHex: string,
) {
  const memberLower = identity.terms.memberLower; // "brother" | "sister" | "member"
  const where = [identity.greekLetters, identity.schoolShort].filter(Boolean).join(", ");
  const html = renderEmail({
    brandHex,
    chapterName: identity.chapterAttribution,
    chapterSubline: identity.schoolName || undefined,
    heading: `You're being added to ${identity.fraternityShort}.`,
    bodyHtml: `<p style="margin:0;">${
      sender ? `${esc(sender)} from the chapter` : "The chapter"
    } invited you to join the ${identity.terms.membersLower} directory${where ? ` at ${esc(where)}` : ""}.</p>`,
    cta: { label: `Complete your ${memberLower} profile`, url: link },
    footerNote: `Or open this URL: ${esc(link)} · Link expires in 30 days.${
      identity.tagline ? ` ${esc(identity.tagline)}` : ""
    }`,
  });
  const text = renderEmailText({
    heading: `You're being added to ${identity.fraternityShort}.`,
    lines: [
      `${sender ? `${sender} from the chapter` : "The chapter"} invited you to join the ${identity.terms.membersLower} directory${where ? ` at ${where}` : ""}.`,
      "Link expires in 30 days.",
    ],
    cta: { label: `Complete your ${memberLower} profile`, url: link },
    chapterName: identity.chapterAttribution,
  });
  const res = await sendEmail({
    to,
    subject: `Welcome to ${identity.fraternityName} — finish your profile`,
    html,
    text,
  });
  return { sent: !!res.ok, reason: res.ok ? "ok" : (res as any).error || "send-failed" };
}

// Public-safe brother fields — mirrors the single-create route so passwordHash
// never ships back to the client on any path.
const PUBLIC_BROTHER_SELECT = {
  id: true, name: true, email: true, phone: true,
  year: true, major: true, position: true, pledgeClass: true,
  bio: true, headshotUrl: true,
  duesPaid: true, serviceHours: true, studyHours: true,
  role: true,
  createdAt: true, updatedAt: true, lastSeen: true,
  status: true,
  pledgeClassName: true,
  pledgeLineNumber: true,
  initiationDate: true,
  graduationYear: true,
  academicStanding: true,
} as const;

// Per-row schema — intentionally permissive on optional fields (the wizard
// already trims/validates client-side); the server is the authority. Only
// `name` is required. Matches the column set the single-create route accepts.
const RowSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  gradYear: z.string().max(40).optional().or(z.literal("")),
  major: z.string().max(120).optional().or(z.literal("")),
  position: z.string().max(120).optional().or(z.literal("")),
  pledgeClass: z.string().max(80).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
});

const BodySchema = z.object({
  // `row` is the 0-based index from the client so it can map results back to
  // its editable table even after the server reorders or dedupes.
  members: z
    .array(z.object({ row: z.number().int().min(0) }).passthrough())
    .min(1)
    .max(500),
  // When true, also issue a brother onboarding invite per successfully-created
  // row that has an email. Best-effort — a failed invite never fails the row.
  sendInvites: z.boolean().optional(),
});

type RowResult = {
  row: number;
  status: "added" | "duplicate" | "error";
  id?: string;
  name?: string;
  error?: string;
};

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Bad origin" }, { status: 403 });
  const billingLocked = await guardBillingWrite();
  if (billingLocked) return billingLocked;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });

  const { members, sendInvites } = parsed.data;

  // Pull existing name/email pairs ONCE so we can dedupe in-memory and report
  // "duplicate" rather than relying on a P2002 round-trip per row. We still
  // catch P2002 below as the authoritative guard (covers races + the unique
  // index), but the pre-check gives accurate per-row reasons and avoids
  // burning insert attempts.
  const existing = await prisma.brother
    .findMany({ select: { name: true, email: true } })
    .catch(() => [] as Array<{ name: string; email: string | null }>);
  const seenNames = new Set(existing.map((b) => b.name.trim().toLowerCase()));
  const seenEmails = new Set(
    existing.map((b) => (b.email || "").trim().toLowerCase()).filter(Boolean)
  );

  const results: RowResult[] = [];
  // Track within-batch dupes too — two identical pasted rows must not both
  // insert (the second would 500 on the unique index otherwise).
  const batchNames = new Set<string>();
  const batchEmails = new Set<string>();

  for (const raw of members) {
    const rowIndex = typeof raw.row === "number" ? raw.row : results.length;

    const rowParsed = RowSchema.safeParse(raw);
    if (!rowParsed.success) {
      const first = rowParsed.error.issues[0];
      results.push({
        row: rowIndex,
        status: "error",
        name: typeof raw.name === "string" ? raw.name : undefined,
        error: first ? `${first.path.join(".") || "field"}: ${first.message}` : "Invalid row",
      });
      continue;
    }

    const r = rowParsed.data;
    const nameKey = r.name.trim().toLowerCase();
    const emailKey = (r.email || "").trim().toLowerCase();

    // Duplicate detection — against the DB AND earlier rows in this batch.
    if (seenNames.has(nameKey) || batchNames.has(nameKey)) {
      results.push({ row: rowIndex, status: "duplicate", name: r.name, error: "Name already in directory" });
      continue;
    }
    if (emailKey && (seenEmails.has(emailKey) || batchEmails.has(emailKey))) {
      results.push({ row: rowIndex, status: "duplicate", name: r.name, error: "Email already in directory" });
      continue;
    }

    // Map wizard fields → Brother columns. Empty strings collapse to null so we
    // don't write "" into nullable columns (and so the unique email index treats
    // blank emails as absent rather than colliding).
    const data: Record<string, any> = {
      name: r.name.trim(),
      email: emailKey ? r.email!.trim() : null,
      phone: r.phone?.trim() || null,
      year: r.year?.trim() || null,
      gradYear: r.gradYear?.trim() || null,
      major: r.major?.trim() || null,
      position: r.position?.trim() || null,
      pledgeClass: r.pledgeClass?.trim() || null,
      bio: r.bio?.trim() || null,
    };

    try {
      // Each row is its own create — NOT a single transaction. A bad row 9 must
      // not roll back good rows 1-8 (partial-success is the contract here, and
      // it's safer than all-or-nothing for a paste-and-import flow). The unique
      // index is the integrity backstop, so we never end in a corrupt state.
      const created = await prisma.brother.create({ data: data as any, select: PUBLIC_BROTHER_SELECT });
      seenNames.add(nameKey);
      batchNames.add(nameKey);
      if (emailKey) { seenEmails.add(emailKey); batchEmails.add(emailKey); }
      results.push({ row: rowIndex, status: "added", id: created.id, name: created.name });
    } catch (err: any) {
      if (err?.code === "P2002") {
        // Lost a race (or a case/whitespace variant slipped past the pre-check).
        results.push({ row: rowIndex, status: "duplicate", name: r.name, error: "Already exists" });
      } else {
        results.push({ row: rowIndex, status: "error", name: r.name, error: "Could not create" });
      }
    }
  }

  const added = results.filter((x) => x.status === "added");
  const duplicates = results.filter((x) => x.status === "duplicate").length;
  const errors = results.filter((x) => x.status === "error").length;

  if (added.length > 0) {
    await audit({
      action: "BROTHERS_BULK_CREATED",
      subjectType: "Brother",
      subjectId: null,
      subjectName: `${added.length} brothers`,
      details: `bulk import — ${added.length} added, ${duplicates} duplicate, ${errors} error`,
      req,
    });
  }

  // Optional: fire onboarding invites for the freshly-created brothers that
  // have a REAL email. Best-effort and decoupled — we hand back which rows got
  // an invite so the UI can surface it, but a delivery failure never flips the
  // row's "added" status (nor fails the batch).
  //
  // `invited`         = BrotherInvite rows created (a token now exists).
  // `inviteEmailsSent`= invites whose onboarding email actually delivered.
  // We report BOTH so the wizard toast can't over-claim "sent" when delivery
  // silently no-ops (the exact bug this route used to ship: it created the
  // token but never emailed it, stranding new members with no link).
  let invited = 0;
  let inviteEmailsSent = 0;
  if (sendInvites && added.length > 0) {
    // Pull identity + brand color + sender ONCE before the loop so every invite
    // shares the same chapter signature and the email masthead/CTA render in
    // THIS chapter's brand color (mirrors brother-invites/route.ts).
    const sender = await getCurrentBrother().catch(() => null);
    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    const identity = await getChapterIdentity().catch(() => null);
    const brandHex = cfg["brand.primaryHex"] || "";
    const senderName = sender?.name || "";

    for (const a of added) {
      // Re-read the email for this created brother (PUBLIC_BROTHER_SELECT
      // included it, but `added` only kept id+name — look it up cheaply).
      const b = await prisma.brother
        .findUnique({ where: { id: a.id! }, select: { email: true, name: true } })
        .catch(() => null);
      const email = b?.email?.trim();
      // Skip blank + synthetic placeholder addresses (the rush flow mints
      // "<name>-<ts>@noemail.local" rows that must never be emailed).
      if (!email || email.endsWith("@noemail.local")) continue;

      // Each invite is fully isolated: a single bad row (create OR send) must
      // not abort the rest of the batch.
      try {
        const token = crypto.randomBytes(24).toString("base64url");
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await prisma.brotherInvite.create({
          data: {
            token,
            email,
            phone: null,
            prefillName: b?.name || a.name || null,
            invitedBy: sender?.name || null,
            expiresAt,
          },
        });
        invited += 1;

        // ACTUALLY deliver the onboarding link. Best-effort: a send failure
        // leaves the invite row intact (admin can re-send) but does NOT count
        // toward inviteEmailsSent, so the toast stays honest.
        if (identity) {
          try {
            const link = `${baseUrl(req)}/onboard/${token}`;
            const r = await sendInviteEmail(email, link, senderName, identity, brandHex);
            if (r.sent) inviteEmailsSent += 1;
          } catch {
            // swallow — invite created, email failed; reported via the count gap
          }
        }
      } catch {
        // create failed for this row — skip and keep going
      }
    }
  }

  return NextResponse.json({
    ok: true,
    results,
    summary: { added: added.length, duplicates, errors, invited, inviteEmailsSent },
  });
}
