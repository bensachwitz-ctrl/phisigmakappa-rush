import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enrichRushee } from "@/lib/enrich";
import { getSiteConfig } from "@/lib/site-config";
import { chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { isAdminAuthed } from "@/lib/auth";
import { getTwilioConfig } from "@/lib/messaging-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bump this whenever the legal disclosure copy STRUCTURE changes. Persisted
// alongside each consent receipt so we can prove what the user saw at consent
// time even after the on-page wording is updated. TCPA defense relies on this.
//
// 2026-05-05 (R11): added the 47 CFR §64.1200(f)(9) "automated technology"
// disclosure language so the receipt qualifies as prior express written
// consent under TCPA. The R10 audit caught its absence as a class-action vector.
//
// White-label: the ORG IDENTITY inside the disclosure is now derived per-tenant
// from SiteConfig (chapterIdentityFromCfg) — see buildSmsDisclosureText. A
// non-Phi-Sig tenant's RushConsent row stores THEIR org name, never a hardcoded
// chapter. The version is unchanged because only the substituted identity
// differs, not the legal structure (purpose, ADAD disclosure, rates, frequency,
// STOP/HELP, not-a-condition).
const DISCLOSURE_VERSION = "2026-05-05";

/**
 * Build the recorded express-written-consent disclosure for the CURRENT tenant.
 * Every TCPA-required element is preserved verbatim — actual org name, purpose
 * (recruitment/rush messages), automated-technology disclosure, "Msg & data
 * rates may apply", message-frequency, "Reply STOP to opt out, HELP for help",
 * and the not-a-condition-of-membership clause. Only the chapter IDENTITY is
 * substituted. When cfg is unset the org falls back to a NEUTRAL "this chapter"
 * (never "Phi Sigma Kappa"), so the apex / an unconfigured tenant still stores
 * a legally-complete receipt.
 */
function buildSmsDisclosureText(cfg: Record<string, string>): string {
  const id = chapterIdentityFromCfg(cfg);
  // "Phi Sigma Kappa Gamma Triton (USC)" → built from the tenant's identity;
  // neutral "this chapter" when nothing is configured.
  const org =
    [id.chapterFullName, id.schoolShort ? `(${id.schoolShort})` : ""]
      .filter(Boolean)
      .join(" ")
      .trim() || "this chapter";
  return (
    "I am 18+ — or I am 17 and have a parent or legal guardian's permission to sign up. " +
    `I agree to receive recurring marketing and informational text and email recruitment/rush messages from ${org} ` +
    "sent using an automatic telephone dialing system or other automated technology. " +
    "Msg frequency varies (up to about 8 msgs per rush cycle). Msg & data rates may apply. " +
    "Reply HELP for help, STOP to opt out at any time. " +
    "Consent to receive these messages is not a condition of any membership consideration. " +
    "My information will only be used to communicate about recruitment/rush and is never sold or shared."
  );
}

/**
 * Fire a confirmation SMS to the rushee asking them to reply YES to confirm.
 * Best-effort: if Twilio is not configured or fails, we log and move on. The
 * RushConsent record is what determines TCPA compliance, not the send result.
 */
async function sendDoubleOptInSms(phone: string, firstName: string, receiptId: string, orgLabel: string) {
  try {
    const { accountSid: sid, authToken: token, phoneNumber: from } = await getTwilioConfig();
    if (!sid || !token || !from) {
      console.info("[double-opt-in] Twilio config not set; skipping confirmation SMS for", receiptId);
      return;
    }
    // Org label is the tenant's identity (neutral "The chapter" fallback) — no
    // hardcoded chapter in the confirmation SMS for non-Phi-Sig tenants.
    const who = orgLabel || "The chapter";
    const body = `${who}: hey ${firstName}! Reply YES to confirm rush updates (about 6-8 msgs/cycle). Reply HELP for help, STOP to opt out. Msg & data rates may apply.`;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: phone, Body: body }),
    });
  } catch (err) {
    console.warn("[double-opt-in]", err);
  }
}

/**
 * Auto-enrich a rushee in the background — non-blocking. The submission
 * response goes back to the rushee immediately; enrichment writes to DB
 * when it resolves so the admin sees enriched info on the next page view.
 */
async function autoEnrichInBackground(rushId: string, rushee: {
  name: string; hometown: string | null; major: string | null; year: string | null;
}) {
  try {
    const enrichment = await enrichRushee(rushee);
    await prisma.rush.update({
      where: { id: rushId },
      data: {
        enrichmentData: JSON.stringify(enrichment),
        enrichedAt: new Date(),
      },
    });
  } catch (err) {
    // Enrichment is best-effort. Never let a failure here affect the user.
    console.warn("[auto-enrich]", err);
  }
}

const RushSchema = z.object({
  // Names must contain at least two letter characters (any Unicode letter
  // category — supports José / Lin Wei-Lo / Kai'lani / etc.). The prior
  // permissive `.min(2).max(120)` accepted strings of pure question marks
  // ("??????") or punctuation that resulted from upstream encoding loss.
  // We don't lock to ASCII because that would reject legitimate non-Western
  // names — we just demand SOME letters.
  name: z
    .string()
    .min(2)
    .max(120)
    .refine((s) => (s.match(/\p{L}/gu) || []).length >= 2, {
      message: "Name must contain at least two letters",
    }),
  // Email is OPTIONAL per the form ("Email (optional)" label). The form
  // synthesizes a "<name>-<ts>@noemail.local" fallback before sending, but
  // we ALSO accept truly empty strings or omitted fields here so any direct
  // API client (booth tablet shortcut, automated test, third-party form)
  // doesn't get a 400 just because the PNM didn't have a personal email.
  // Empty values land in the server fallback path below.
  email: z
    .union([z.string().email().max(160), z.literal(""), z.undefined()])
    .optional(),
  phone: z.string().min(7).max(40),
  hometown: z.string().max(120).optional().or(z.literal("")),
  major: z.string().max(120).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  highSchoolInfo: z.string().max(2000).optional().or(z.literal("")),
  backgroundInfo: z.string().max(2000).optional().or(z.literal("")),
  headshotUrl: z.string().url().max(2048).optional().or(z.literal("")),
  ageAttestation: z.enum(["ADULT_18_PLUS", "MINOR_17_WITH_GUARDIAN_PERMISSION"]).optional(),
  website: z.string().max(500).optional().or(z.literal("")),
  customAnswers: z.record(z.string(), z.string().max(1000)).optional(),
});

export async function POST(req: Request) {
  try {
    // TCPA evidence — captured at the moment of submission.
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // ── Rate limit ────────────────────────────────────────────────────────
    // Block > 30 submits from the same IP in 60 minutes. Real rushees submit
    // once; bots and spam loops hit the form repeatedly. 30/hour gives a
    // booth-tablet on chapter Wi-Fi enough headroom to enter a full day of
    // PNMs (Fall rush booths routinely capture 20-50 walk-ups in a session).
    // Authenticated admin sessions skip the limit entirely — the rush chair
    // running booth from the admin laptop shouldn't be throttled at all.
    const adminBooth = isAdminAuthed();
    if (ipAddress && !adminBooth) {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recent = await prisma.rushSubmitLog.count({
          where: { ipAddress, createdAt: { gte: oneHourAgo } },
        });
        if (recent >= 30) {
          await prisma.rushSubmitLog.create({
            data: { ipAddress, status: "RATE_LIMITED" },
          }).catch(() => {});
          // Pull rush email from cfg so a chapter that changes their address
          // in admin doesn't dead-letter rate-limited rushees to the default.
          const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
          const rushEmail =
            cfg["contact.rushEmail"] || cfg["contact.advisorEmail"] || cfg["contact.email"] || "";
          return NextResponse.json(
            {
              ok: false,
              error: rushEmail
                ? `Too many submissions. If this isn't a typo, email ${rushEmail} and we'll get you on the list.`
                : `Too many submissions. If this isn't a typo, reach out to the chapter directly and we'll get you on the list.`,
            },
            { status: 429, headers: { "Retry-After": "3600" } },
          );
        }
      } catch {
        // If the rate-limit lookup itself fails, fail open — never block a
        // real PNM because of an infra glitch.
      }
    }

    const body = await req.json();
    const parsed = RushSchema.parse(body);

    // Honeypot tripped — silently 200 without touching the DB or sending SMS.
    // Returning a real-looking success keeps the bot from rotating IPs to
    // retry, while the consent ledger and Twilio quota stay clean.
    if (parsed.website && parsed.website.trim() !== "") {
      return NextResponse.json({ ok: true, updated: false }, { status: 200 });
    }

    // Email fallback: if the PNM submitted without an email (or the form
    // skipped the synthesizer for some reason), generate a stable
    // <slugified-name>-<random>@noemail.local placeholder. Same shape the
    // form synthesizer used to create — keeps the unique-email Prisma index
    // happy without forcing PNMs to invent a fake address.
    const rawEmail = (parsed.email || "").toString().trim();
    const synthEmail =
      rawEmail ||
      `${parsed.name.replace(/\s+/g, ".").toLowerCase()}-${Date.now()}@noemail.local`;

    const data = {
      ...parsed,
      email: synthEmail.toLowerCase(),
      name: parsed.name.trim(),
      phone: parsed.phone.trim(),
    };

    const ageAttestation = data.ageAttestation || "ADULT_18_PLUS";

    // Build the tenant-specific consent disclosure ONCE for this request so
    // both the re-affirmation and first-submission RushConsent rows store the
    // SAME text — and that text names THIS chapter (or a neutral fallback),
    // never a hardcoded one. getSiteConfig resolves the current tenant schema;
    // on failure we fall back to empty cfg → neutral "this chapter" copy.
    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    const disclosureText = buildSmsDisclosureText(cfg);
    // Short org label for the confirmation SMS sender prefix (neutral fallback).
    const cfgIdentity = chapterIdentityFromCfg(cfg);
    const orgLabel =
      cfgIdentity.chapterAttribution || cfgIdentity.chapterFullName || cfgIdentity.fraternityName || "The chapter";

    // Best-effort log of accepted submission for rate-limit math.
    if (ipAddress) {
      prisma.rushSubmitLog.create({
        data: { ipAddress, email: data.email, status: "ACCEPTED" },
      }).catch(() => {});
    }

    // Format custom answers to append to notes
    const customAnswers = parsed.customAnswers;
    let customNote = "";
    if (customAnswers && Object.keys(customAnswers).length > 0) {
      customNote = "\n\n[Custom Form Answers]";
      for (const [q, a] of Object.entries(customAnswers)) {
        if (a && a.trim()) {
          customNote += `\n${q}: ${a.trim()}`;
        }
      }
    }

    // Look up existing record to safely merge notes & enrichmentData
    const existingRush = await prisma.rush.findUnique({
      where: { email: data.email },
      select: { id: true, notes: true, enrichmentData: true },
    });

    let newEnrichmentData = existingRush?.enrichmentData || "";
    if (customAnswers && Object.keys(customAnswers).length > 0) {
      try {
        const parsedData = newEnrichmentData ? JSON.parse(newEnrichmentData) : {};
        parsedData.customAnswers = {
          ...(parsedData.customAnswers || {}),
          ...customAnswers,
        };
        newEnrichmentData = JSON.stringify(parsedData);
      } catch {
        newEnrichmentData = JSON.stringify({ customAnswers });
      }
    }

    const headshotPreserve = data.headshotUrl || undefined;
    let upserted;

    if (existingRush) {
      upserted = await prisma.rush.update({
        where: { id: existingRush.id },
        data: {
          name: data.name,
          phone: data.phone,
          hometown: data.hometown || null,
          major: data.major || null,
          year: data.year || null,
          highSchoolInfo: data.highSchoolInfo || null,
          backgroundInfo: data.backgroundInfo || null,
          ...(headshotPreserve ? { headshotUrl: headshotPreserve } : {}),
          notes: (existingRush.notes || "") + customNote,
          ...(newEnrichmentData ? { enrichmentData: newEnrichmentData } : {}),
        },
      });
    } else {
      upserted = await prisma.rush.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          hometown: data.hometown || null,
          major: data.major || null,
          year: data.year || null,
          highSchoolInfo: data.highSchoolInfo || null,
          backgroundInfo: data.backgroundInfo || null,
          headshotUrl: data.headshotUrl || null,
          notes: customNote || null,
          ...(newEnrichmentData ? { enrichmentData: newEnrichmentData } : {}),
        },
      });
    }

    // ── Per-email idempotency window ─────────────────────────────────────
    // BEFORE the new-vs-update split: if this email already produced a
    // consent receipt within the last 60s, return that same receipt as the
    // canonical response. This covers both branches of the isNewRecord
    // heuristic (which fails on rapid <2s back-to-back submits because
    // updatedAt - createdAt is near zero). The result: any duplicate POST
    // from the same email within 60s is fully idempotent — same rush.id,
    // same consentReceipt.id, no duplicate Twilio SMS, no DB bloat.
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const recentReceipt = await prisma.rushConsent.findFirst({
      where: { rushId: upserted.id, createdAt: { gte: sixtySecondsAgo } },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);

    if (recentReceipt) {
      return NextResponse.json({
        ok: true,
        id: upserted.id,
        updated: true,
        consentReceipt: {
          id: recentReceipt.id,
          version: recentReceipt.disclosureVersion,
          createdAt: recentReceipt.createdAt,
        },
      });
    }

    // We don't get a clean "was-this-an-update" signal from upsert. Use
    // createdAt vs updatedAt timestamps as a heuristic — within 2s of
    // creation = first write, otherwise treat as re-submission.
    const isNewRecord = upserted.updatedAt.getTime() - upserted.createdAt.getTime() < 2_000;

    if (!isNewRecord) {
      // Re-affirmation outside the 60s idempotency window: this is a
      // genuine fresh re-submit (real users coming back hours/days later
      // to update their info). Record a brand-new consent receipt because
      // they just re-checked the disclosure box.
      const receipt = await prisma.rushConsent.create({
        data: {
          rushId: upserted.id,
          disclosureVersion: DISCLOSURE_VERSION,
          disclosureText,
          ipAddress,
          userAgent,
          ageAttestation,
        },
      });
      return NextResponse.json({
        ok: true,
        id: upserted.id,
        updated: true,
        consentReceipt: { id: receipt.id, version: DISCLOSURE_VERSION, createdAt: receipt.createdAt },
      });
    }

    const created = upserted;

    // First-submission consent receipt
    const receipt = await prisma.rushConsent.create({
      data: {
        rushId: created.id,
        disclosureVersion: DISCLOSURE_VERSION,
        disclosureText,
        ipAddress,
        userAgent,
        ageAttestation,
      },
    });

    // Fire auto-enrichment — searches Google/LinkedIn/IG/USC directory/MaxPreps
    // for additional info about the rushee. Doesn't block the response.
    await autoEnrichInBackground(created.id, {
      name: data.name,
      hometown: data.hometown || null,
      major: data.major || null,
      year: data.year || null,
    });

    // Fire double-opt-in confirmation SMS in the background.
    sendDoubleOptInSms(data.phone, data.name.split(/\s+/)[0] || "there", receipt.id, orgLabel);

    return NextResponse.json({
      ok: true,
      id: created.id,
      updated: false,
      consentReceipt: { id: receipt.id, version: DISCLOSURE_VERSION, createdAt: receipt.createdAt },
    });
  } catch (err) {
    // Best-effort: log invalid attempts so spam patterns are visible
    const ipForLog =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    if (ipForLog) {
      prisma.rushSubmitLog.create({
        data: { ipAddress: ipForLog, status: "INVALID" },
      }).catch(() => {});
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[/api/rush]", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // public count for the landing page social proof
  const count = await prisma.rush.count();
  return NextResponse.json({ count });
}
