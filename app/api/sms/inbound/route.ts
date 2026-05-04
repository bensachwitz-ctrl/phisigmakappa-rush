import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verify the X-Twilio-Signature header on inbound webhooks.
 *
 * Twilio computes HMAC-SHA1 of (full URL + sorted form params) using the
 * account auth token, base64-encoded. This blocks an attacker from forging
 * STOP / opt-out events for arbitrary phone numbers — without verification,
 * anyone could destroy our TCPA audit trail by spamming this endpoint.
 *
 * Returns true if the signature is valid (or if TWILIO_AUTH_TOKEN isn't set,
 * which is dev / preview mode — log a warning but still accept so local
 * testing isn't blocked).
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signatureHeader: string | null
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    console.warn("[sms/inbound] TWILIO_AUTH_TOKEN not set — accepting unverified");
    return true;
  }
  if (!signatureHeader) return false;
  // Concatenate URL with sorted (key + value) pairs per Twilio's spec.
  const sorted = Object.keys(params).sort();
  let signed = url;
  for (const k of sorted) signed += k + params[k];
  const expected = crypto
    .createHmac("sha1", token)
    .update(signed, "utf-8")
    .digest("base64");
  // Constant-time compare to avoid timing attacks.
  if (expected.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

/** Strict E.164 / domestic US-style validator — at least 7 digits, optional +. */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[^\d+]/g, "");
  // E.164: + followed by 7-15 digits. Domestic: 10-11 digits.
  return /^\+?\d{7,15}$/.test(digits);
}

/**
 * Twilio inbound-SMS webhook. Configure Twilio Messaging Service to point its
 * "A MESSAGE COMES IN" handler at  POST https://phisigmakappa.vercel.app/api/sms/inbound
 *
 * Recognized keywords (case-insensitive, leading/trailing whitespace tolerated):
 *   YES / Y / CONFIRM        → flips smsConfirmed = true on the matching rushee's
 *                              most recent RushConsent + auto-replies confirmation
 *   STOP / UNSUBSCRIBE / END
 *   QUIT / CANCEL / OPTOUT   → flips optedOut = true; stops all further sends
 *   HELP / INFO              → replies with help info + advisor email
 *
 * Twilio expects a TwiML XML response. We always 200 with a valid TwiML body.
 */
export async function POST(req: Request) {
  let from = "";
  let body = "";
  let allParams: Record<string, string> = {};
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = await req.json();
      allParams = Object.fromEntries(
        Object.entries(json).map(([k, v]) => [k, String(v ?? "")])
      );
      from = String(json.From || json.from || "");
      body = String(json.Body || json.body || "");
    } else {
      const form = await req.formData();
      form.forEach((v, k) => { allParams[k] = String(v); });
      from = String(form.get("From") || "");
      body = String(form.get("Body") || "");
    }
  } catch {
    // Twilio retries on non-200 — return empty TwiML so we don't loop.
    return twiml("");
  }

  // Verify Twilio signed this request. In production with TWILIO_AUTH_TOKEN
  // set, an unsigned/forged POST is rejected with 403 — this stops an attacker
  // from using this webhook to opt out arbitrary phone numbers.
  const signature = req.headers.get("x-twilio-signature");
  // Twilio signs against the exact URL it called (incl. query string).
  const url = new URL(req.url).toString();
  if (!verifyTwilioSignature(url, allParams, signature)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const phone = (from || "").trim();
  const keyword = (body || "").trim().toUpperCase();

  // Reject malformed phone numbers — anything that isn't roughly E.164 means
  // either Twilio gave us junk or a forged request slipped past signature
  // verification. Returning 400 keeps garbage out of the suppression list.
  if (!phone || !isValidPhone(phone)) {
    return new NextResponse("Bad Request: invalid From", { status: 400 });
  }

  // CRITICAL CTIA / 10DLC RULE: STOP and HELP must ALWAYS produce a correct
  // reply, regardless of whether the sending phone is on file. Carriers test
  // these keywords as part of brand registration and will downrank or reject
  // a campaign that fails them. So we handle the universal keywords FIRST,
  // before any DB lookup, and reply even when the number is not in our records.
  const isStop = ["STOP", "UNSUBSCRIBE", "END", "QUIT", "CANCEL", "OPTOUT", "REVOKE"].includes(keyword);
  const isHelp = ["HELP", "INFO"].includes(keyword);
  const isStart = ["START", "RESUBSCRIBE", "UNSTOP", "YES", "Y", "CONFIRM"].includes(keyword);

  // Lookup the rushee + latest consent (best-effort — null if not on file).
  const digits = phone.replace(/^\+1/, "").replace(/\D/g, "");
  const rushee = digits.length >= 7 ? await prisma.rush.findFirst({
    where: { phone: { contains: digits } },
    orderBy: { createdAt: "desc" },
  }) : null;
  const latestConsent = rushee ? await prisma.rushConsent.findFirst({
    where: { rushId: rushee.id },
    orderBy: { createdAt: "desc" },
  }) : null;

  // ── HELP keyword — ALWAYS reply (CTIA mandate) ─────────────────────────
  if (isHelp) {
    return twiml(
      "Phi Sigma Kappa Gamma Triton (USC) rush updates. Up to 8 msgs per rush cycle. Msg & data rates may apply. Reply STOP to opt out. Help: rush@phisig-usc.com or visit https://phisigmakappa.vercel.app/parents."
    );
  }

  // ── STOP keyword — ALWAYS reply (CTIA mandate) ─────────────────────────
  if (isStop) {
    if (latestConsent) {
      // EVIDENCE PRESERVATION: do NOT flip smsConfirmed back to false. The user
      // may have confirmed earlier, then opted out — both facts matter for the
      // TCPA audit trail. Only flip optedOut + timestamp; keep prior smsConfirmed
      // state intact so the receipt accurately reflects the historical record.
      await prisma.rushConsent.update({
        where: { id: latestConsent.id },
        data: { optedOut: true, optedOutAt: new Date() },
      });
    }
    return twiml(
      "Phi Sigma Kappa Gamma Triton (USC): you're opted out. No further messages. Reply START to resubscribe. Msg & data rates may apply."
    );
  }

  // ── YES / START — confirmation or re-subscription ──────────────────────
  if (isStart) {
    if (rushee && latestConsent) {
      const isYes = ["YES", "Y", "CONFIRM"].includes(keyword);
      await prisma.rushConsent.update({
        where: { id: latestConsent.id },
        data: isYes
          ? { smsConfirmed: true, smsConfirmedAt: new Date(), optedOut: false, optedOutAt: null }
          : { optedOut: false, optedOutAt: null },
      });
      const first = rushee.name.split(/\s+/)[0] || "there";
      return twiml(
        isYes
          ? `Phi Sig USC: confirmed — thanks ${first}! We'll text when the Fall '26 rush schedule drops. Reply STOP anytime.`
          : `Phi Sig USC: welcome back ${first}. Reply STOP anytime.`
      );
    }
    // Unknown number replying YES/START — friendly redirect.
    return twiml("Phi Sigma Kappa Gamma Triton (USC): we don't have your info on file. Sign up at https://phisigmakappa.vercel.app or email rush@phisig-usc.com.");
  }

  // ── Unrecognized keyword ───────────────────────────────────────────────
  return twiml(
    "Phi Sigma Kappa Gamma Triton (USC): reply YES to confirm rush updates, STOP to opt out, HELP for help. Msg & data rates may apply."
  );
}

/** Wrap a plain reply body in TwiML XML. */
function twiml(message: string) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}
