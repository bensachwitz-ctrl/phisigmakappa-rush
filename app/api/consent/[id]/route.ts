import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public consent-receipt lookup. Returns the verbatim disclosure text the
 * rushee saw at consent time, plus the timestamp + IP (truncated) + UA snapshot.
 *
 * Provides an externally verifiable audit trail per TCPA recordkeeping rules
 * without leaking PII (no name, no phone, no email surfaced — only what the
 * rushee themselves agreed to).
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = (params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  // Per-IP rate limit. The receipt cuids are unguessable in normal flow (the
  // rushee gets their own ID after submission), but if an admin export ever
  // leaks IDs, an attacker shouldn't be able to bulk-enumerate them. 30
  // lookups per hour per IP is plenty for legitimate self-audit.
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  if (ipAddress) {
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await prisma.rushSubmitLog.count({
        where: { ipAddress, status: "CONSENT_LOOKUP", createdAt: { gte: since } },
      });
      if (recent >= 30) {
        return NextResponse.json(
          { ok: false, error: "Too many lookups. Try again in an hour." },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }
    } catch {
      // Fail open on DB error — never lock a legitimate self-audit out.
    }
  }

  const receipt = await prisma.rushConsent.findUnique({ where: { id } });
  if (!receipt) {
    return NextResponse.json({ ok: false, error: "Receipt not found" }, { status: 404 });
  }

  // Truncate the IP last octet for privacy: only first three octets are useful
  // for evidence; the full IP is retained server-side but not surfaced publicly.
  const truncatedIp = receipt.ipAddress
    ? receipt.ipAddress.replace(/\.\d+$/, ".***").replace(/:[a-f0-9]+$/i, ":****")
    : null;

  // Best-effort log so the rate-limit count above sees this lookup. Fires
  // before return so it can't run after the response (which would never
  // happen because the previous return short-circuited).
  if (ipAddress) {
    prisma.rushSubmitLog
      .create({ data: { ipAddress, status: "CONSENT_LOOKUP" } })
      .catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    receipt: {
      id: receipt.id,
      disclosureVersion: receipt.disclosureVersion,
      disclosureText: receipt.disclosureText,
      ageAttestation: receipt.ageAttestation,
      ipAddress: truncatedIp,
      userAgentSummary: receipt.userAgent ? receipt.userAgent.slice(0, 120) : null,
      smsConfirmed: receipt.smsConfirmed,
      smsConfirmedAt: receipt.smsConfirmedAt,
      optedOut: receipt.optedOut,
      optedOutAt: receipt.optedOutAt,
      createdAt: receipt.createdAt,
    },
  });
}
