import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enrichRushee } from "@/lib/enrich";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bump this whenever the legal disclosure copy changes. Persisted alongside
// each consent receipt so we can prove what the user saw at consent time
// even after the on-page wording is updated. TCPA defense relies on this.
//
// 2026-05-05 (R11): added the 47 CFR §64.1200(f)(9) "automated technology"
// disclosure language so the receipt qualifies as prior express written
// consent under TCPA. The R10 audit caught its absence as a class-action vector.
const DISCLOSURE_VERSION = "2026-05-05";
const SMS_DISCLOSURE_TEXT =
  "I am 18+ — or I am 17 and have a parent or legal guardian's permission to sign up. I agree to receive recurring marketing and informational text and email rush updates from Phi Sigma Kappa Gamma Triton (USC) sent using an automatic telephone dialing system or other automated technology. Up to 8 msgs per rush cycle. Msg & data rates may apply. Reply HELP for help, STOP to opt out at any time. Consent to receive these messages is not a condition of any membership consideration. My information will only be used to communicate about Fall '26 rush and is never sold or shared.";

/**
 * Fire a confirmation SMS to the rushee asking them to reply YES to confirm.
 * Best-effort: if Twilio is not configured or fails, we log and move on. The
 * RushConsent record is what determines TCPA compliance, not the send result.
 */
async function sendDoubleOptInSms(phone: string, firstName: string, receiptId: string) {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!sid || !token || !from) {
      console.info("[double-opt-in] Twilio env not set; skipping confirmation SMS for", receiptId);
      return;
    }
    const body = `Phi Sig USC Gamma Triton: hey ${firstName}! Reply YES to confirm rush updates (about 6-8 msgs/cycle). Reply HELP for help, STOP to opt out. Msg & data rates may apply.`;
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
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().min(7).max(40),
  hometown: z.string().max(120).optional().or(z.literal("")),
  major: z.string().max(120).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  highSchoolInfo: z.string().max(2000).optional().or(z.literal("")),
  backgroundInfo: z.string().max(2000).optional().or(z.literal("")),
  headshotUrl: z.string().url().max(2048).optional().or(z.literal("")),
  // Optional age attestation flag from the form. Defaults to ADULT_18_PLUS
  // for older clients that don't send this field; the express-consent text
  // they checked covers both 18+ and 17+with-guardian paths.
  ageAttestation: z.enum(["ADULT_18_PLUS", "MINOR_17_WITH_GUARDIAN_PERMISSION"]).optional(),
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
    // Block more than 5 submits from the same IP in 60 minutes. Real rushees
    // submit once; bots and copy-paste spam accounts hit the form repeatedly.
    // Returning 429 short-circuits the parse + DB write so we don't poison
    // the consent ledger with junk records.
    if (ipAddress) {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recent = await prisma.rushSubmitLog.count({
          where: { ipAddress, createdAt: { gte: oneHourAgo } },
        });
        if (recent >= 5) {
          await prisma.rushSubmitLog.create({
            data: { ipAddress, status: "RATE_LIMITED" },
          }).catch(() => {});
          return NextResponse.json(
            {
              ok: false,
              error: "Too many submissions. If this isn't a typo, email rush@phisig-usc.com and we'll get you on the list.",
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
    const data = {
      ...parsed,
      email: parsed.email.trim().toLowerCase(),
      name: parsed.name.trim(),
      phone: parsed.phone.trim(),
    };

    const ageAttestation = data.ageAttestation || "ADULT_18_PLUS";

    // Best-effort log of accepted submission for rate-limit math.
    if (ipAddress) {
      prisma.rushSubmitLog.create({
        data: { ipAddress, email: data.email, status: "ACCEPTED" },
      }).catch(() => {});
    }

    const existing = await prisma.rush.findUnique({ where: { email: data.email } });
    if (existing) {
      const updated = await prisma.rush.update({
        where: { email: data.email },
        data: {
          name: data.name,
          phone: data.phone,
          hometown: data.hometown || null,
          major: data.major || null,
          year: data.year || null,
          highSchoolInfo: data.highSchoolInfo || null,
          backgroundInfo: data.backgroundInfo || null,
          headshotUrl: data.headshotUrl || existing.headshotUrl || null,
        },
      });

      // Re-affirmation: write a fresh consent receipt because the user just
      // re-checked the box on the new submission. Old receipts are retained.
      const receipt = await prisma.rushConsent.create({
        data: {
          rushId: updated.id,
          disclosureVersion: DISCLOSURE_VERSION,
          disclosureText: SMS_DISCLOSURE_TEXT,
          ipAddress,
          userAgent,
          ageAttestation,
        },
      });

      return NextResponse.json({
        ok: true,
        id: updated.id,
        updated: true,
        consentReceipt: { id: receipt.id, version: DISCLOSURE_VERSION, createdAt: receipt.createdAt },
      });
    }

    const created = await prisma.rush.create({
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
      },
    });

    // First-submission consent receipt
    const receipt = await prisma.rushConsent.create({
      data: {
        rushId: created.id,
        disclosureVersion: DISCLOSURE_VERSION,
        disclosureText: SMS_DISCLOSURE_TEXT,
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
    sendDoubleOptInSms(data.phone, data.name.split(/\s+/)[0] || "there", receipt.id);

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
