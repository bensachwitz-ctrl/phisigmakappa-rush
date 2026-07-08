import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { forEachTenant } from "@/lib/prisma";
import { getChapterIdentity, chapterIdentityFromCfg } from "@/lib/chapter-identity";
import { getSiteConfig } from "@/lib/site-config";
import {
  verifyTwilioSignatureMultiToken,
  collectCandidateTwilioTokens,
} from "@/lib/twilio-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Strict E.164 / domestic US-style validator — at least 7 digits, optional +. */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[^\d+]/g, "");
  // E.164: + followed by 7-15 digits. Domestic: 10-11 digits.
  return /^\+?\d{7,15}$/.test(digits);
}

/**
 * Normalize a phone the SAME way app/api/send-sms/route.ts does, so an inbound
 * From matches what outbound stored. Mirror — do not diverge from send-sms.
 */
function normalizePhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return p.startsWith("+") ? p : `+${d}`;
}

/**
 * Twilio inbound-SMS webhook. Configure Twilio Messaging Service to point its
 * "A MESSAGE COMES IN" handler at  POST https://greekstack.vercel.app/api/sms/inbound
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
  // Twilio signs against the exact PUBLIC URL it called (incl. query string).
  // Behind Vercel's proxy `req.url` reflects the internal host/proto, which
  // would not match what Twilio signed → every real request 403s. Rebuild the
  // public URL from the forwarded headers (proto + host the edge received),
  // preserving the original path + query, and fall back to req.url's own host
  // only when the forwarded headers are absent (e.g. direct/local calls).
  const reqUrl = new URL(req.url);
  const fwdProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const fwdHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.split(",")[0]?.trim();
  const url = `${fwdProto || reqUrl.protocol.replace(/:$/, "")}://${
    fwdHost || reqUrl.host
  }${reqUrl.pathname}${reqUrl.search}`;
  // Tenant-aware verification: accept if the signature matches the platform env
  // token OR any active chapter's own configured Twilio auth token, so a chapter
  // on its own Twilio account isn't 403'd (which would silently break STOP).
  const candidateTokens = await collectCandidateTwilioTokens();
  if (!verifyTwilioSignatureMultiToken(url, allParams, signature, candidateTokens)) {
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

  // ── TENANT RESOLUTION (TCPA-critical) ──────────────────────────────────
  // Twilio calls this webhook server-to-server with NO chapter subdomain, so
  // the Host-proxy `prisma` would resolve to the EMPTY `public` schema and the
  // STOP/opt-out + YES write would land nowhere — a rushee who texts STOP would
  // keep getting blasted. Instead we fan out across EVERY active chapter's
  // schema (exactly like the crons) and find the chapter(s) whose Rush has this
  // From number. Suppression must apply EVERYWHERE the number exists, so we
  // collect ALL matching tenants and write the consent change to each.
  const digits = phone.replace(/^\+1/, "").replace(/\D/g, "");
  const normalized = normalizePhone(phone);
  type Match = {
    db: PrismaClient;
    rusheeName: string;
    consentId: string | null;
  };
  let matches: Match[] = [];
  if (digits.length >= 7) {
    const perTenant = await forEachTenant<Match | null>(async (db) => {
      // Match on the normalized E.164 OR the bare digit string, since stored
      // phone formats vary (some rows pre-date normalization).
      const rush = await db.rush.findFirst({
        where: { OR: [{ phone: normalized }, { phone: { contains: digits } }] },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true },
      });
      if (!rush) return null;
      const consent = await db.rushConsent.findFirst({
        where: { rushId: rush.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      return { db, rusheeName: rush.name, consentId: consent?.id ?? null };
    });
    matches = perTenant
      .filter((t) => t.ok && t.result)
      .map((t) => t.result as Match);
  }

  // Representative rushee + consent for the REPLY copy (first-name personalization
  // + the rushee/consent gating below). Writes still target ALL matching tenants.
  const rushee = matches.length ? { name: matches[0].rusheeName } : null;
  const latestConsent = matches.some((m) => m.consentId) ? {} : null;

  // Chapter identity for all CTIA-mandated replies. WHITE-LABEL: Twilio hits this
  // apex webhook with NO chapter Host, so getChapterIdentity()/getSiteConfig()
  // resolve through the Host proxy to the EMPTY public schema and would sign every
  // reply with a neutral/placeholder (or wrong) brand. The opt-out WRITES already
  // fan out per-tenant (matches[]); derive the reply copy from the SAME matched
  // tenant's schema so a rushee who texts STOP gets a reply signed by the chapter
  // they actually belong to. Only an UNKNOWN number (no match) falls back to the
  // Host-proxied identity — there's no tenant to attribute to then.
  let identity;
  let cfg: Record<string, string>;
  if (matches.length) {
    const rows = await matches[0].db.siteConfig
      .findMany()
      .catch(() => [] as { key: string; value: string }[]);
    cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    identity = chapterIdentityFromCfg(cfg);
  } else {
    identity = await getChapterIdentity();
    cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  }
  const rushEmail = (cfg["contact.rushEmail"] || cfg["contact.advisorEmail"] || "").trim();
  const helpClause = rushEmail ? ` Help: ${rushEmail}.` : "";
  const emailClause = rushEmail ? ` or email ${rushEmail}` : "";
  // Resolve the site URL from env, else the request's own origin — so the
  // privacy/sign-up link points at THIS deploy, never a hardcoded legacy host.
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
  const chapterSig = `${identity.fraternityName} ${identity.greekLetters} (${identity.schoolShort})`;
  const shortSig = identity.chapterAttribution;

  // ── HELP keyword — ALWAYS reply (CTIA mandate) ─────────────────────────
  if (isHelp) {
    return twiml(
      `${chapterSig} rush updates. Up to 8 msgs per rush cycle. Msg & data rates may apply. Reply STOP to opt out.${helpClause} Privacy: ${siteUrl}/privacy`
    );
  }

  // ── STOP keyword — ALWAYS reply (CTIA mandate) ─────────────────────────
  if (isStop) {
    // EVIDENCE PRESERVATION: do NOT flip smsConfirmed back to false. The user
    // may have confirmed earlier, then opted out — both facts matter for the
    // TCPA audit trail. Only flip optedOut + timestamp; keep prior smsConfirmed
    // state intact so the receipt accurately reflects the historical record.
    // Apply to EVERY tenant that has this number (suppression is global).
    for (const m of matches) {
      if (!m.consentId) continue;
      try {
        await m.db.rushConsent.update({
          where: { id: m.consentId },
          data: { optedOut: true, optedOutAt: new Date() },
        });
      } catch {
        // One tenant's write must never block the reply or the others.
      }
    }
    return twiml(
      `${chapterSig}: you're opted out. No further messages. Reply START to resubscribe. Msg & data rates may apply.`
    );
  }

  // ── YES / START — confirmation or re-subscription ──────────────────────
  if (isStart) {
    if (rushee && latestConsent) {
      const isYes = ["YES", "Y", "CONFIRM"].includes(keyword);
      // Apply the confirm / re-subscribe to EVERY tenant that has this number.
      for (const m of matches) {
        if (!m.consentId) continue;
        try {
          await m.db.rushConsent.update({
            where: { id: m.consentId },
            data: isYes
              ? { smsConfirmed: true, smsConfirmedAt: new Date(), optedOut: false, optedOutAt: null }
              : { optedOut: false, optedOutAt: null },
          });
        } catch {
          // Isolate per-tenant failures so the reply + other tenants proceed.
        }
      }
      const first = rushee.name.split(/\s+/)[0] || "there";
      return twiml(
        isYes
          ? `${shortSig}: confirmed — thanks ${first}! We'll text when the rush schedule drops. Reply STOP anytime.`
          : `${shortSig}: welcome back ${first}. Reply STOP anytime.`
      );
    }
    // Unknown number replying YES/START — friendly redirect.
    return twiml(`${chapterSig}: we don't have your info on file. Sign up at ${siteUrl}${emailClause}.`);
  }

  // ── Unrecognized keyword ───────────────────────────────────────────────
  return twiml(
    `${chapterSig}: reply YES to confirm rush updates, STOP to opt out, HELP for help. Msg & data rates may apply.`
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
