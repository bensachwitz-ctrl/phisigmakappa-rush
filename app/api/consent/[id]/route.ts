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
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = (params?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const receipt = await prisma.rushConsent.findUnique({ where: { id } });
  if (!receipt) {
    return NextResponse.json({ ok: false, error: "Receipt not found" }, { status: 404 });
  }

  // Truncate the IP last octet for privacy: only first three octets are useful
  // for evidence; the full IP is retained server-side but not surfaced publicly.
  const truncatedIp = receipt.ipAddress
    ? receipt.ipAddress.replace(/\.\d+$/, ".***").replace(/:[a-f0-9]+$/i, ":****")
    : null;

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
