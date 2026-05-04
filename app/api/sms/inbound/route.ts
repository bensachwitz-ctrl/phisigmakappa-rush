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

  // Find the latest active rushee record by phone. We don't store phone in the
  // consent table directly (it lives on Rush), so we lookup the rushee first.
  const rushee = await prisma.rush.findFirst({
    where: { phone: { contains: phone.replace(/^\+1/, "").replace(/\D/g, "") } },
    orderBy: { createdAt: "desc" },
  });

  if (!rushee) {
    return twiml("Phi Sig USC: we don't have a record matching this number. Reach us at rush@phisig-usc.com.");
  }

  const latestConsent = await prisma.rushConsent.findFirst({
    where: { rushId: rushee.id },
    orderBy: { createdAt: "desc" },
  });
  if (!latestConsent) return twiml("");

  if (["YES", "Y", "CONFIRM"].includes(keyword)) {
    await prisma.rushConsent.update({
      where: { id: latestConsent.id },
      data: { smsConfirmed: true, smsConfirmedAt: new Date(), optedOut: false, optedOutAt: null },
    });
    return twiml(`Phi Sig USC: confirmed — thanks ${rushee.name.split(/\s+/)[0]}! We'll text when the Fall '26 rush schedule drops. Reply STOP anytime.`);
  }

  if (["STOP", "UNSUBSCRIBE", "END", "QUIT", "CANCEL", "OPTOUT"].includes(keyword)) {
    await prisma.rushConsent.update({
      where: { id: latestConsent.id },
      data: { optedOut: true, optedOutAt: new Date(), smsConfirmed: false },
    });
    return twiml("Phi Sig USC: you've been opted out. You won't receive further messages. Reply START to opt back in.");
  }

  if (["START", "RESUBSCRIBE", "UNSTOP"].includes(keyword)) {
    await prisma.rushConsent.update({
      where: { id: latestConsent.id },
      data: { optedOut: false, optedOutAt: null },
    });
    return twiml("Phi Sig USC: you're opted back in. Reply STOP anytime to leave.");
  }

  if (["HELP", "INFO"].includes(keyword)) {
    return twiml("Phi Sig USC rush updates. Reply YES to confirm, STOP to opt out. Up to ~6-8 msgs/cycle. Help: rush@phisig-usc.com.");
  }

  // Anything else — log and reply with the help canned response.
  return twiml("Phi Sig USC: reply YES to confirm rush updates, STOP to opt out, HELP for help.");
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
