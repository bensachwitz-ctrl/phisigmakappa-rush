import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = await req.json();
      from = String(json.From || json.from || "");
      body = String(json.Body || json.body || "");
    } else {
      const form = await req.formData();
      from = String(form.get("From") || "");
      body = String(form.get("Body") || "");
    }
  } catch {
    // Twilio retries on non-200 — return empty TwiML so we don't loop.
    return twiml("");
  }

  const phone = (from || "").trim();
  const keyword = (body || "").trim().toUpperCase();

  if (!phone) return twiml("");

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
      "Phi Sigma Kappa Gamma Triton (USC): rush updates from us. Up to ~6-8 msgs/cycle. Msg & data rates may apply. Reply STOP to opt out. Email rush@phisig-usc.com for help."
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
