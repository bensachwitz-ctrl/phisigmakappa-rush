import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { generateAndUploadSignedPdf } from "@/lib/esign";
import { getSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/bid/[token] — PNM bid-response endpoint. Public (no admin auth)
 * because the token IS the auth: knowing it proves the PNM received the
 * bid email/SMS from the chapter.
 *
 * POST { choice: "ACCEPTED" | "DECLINED", reason?: string, signatureName?: string, agreedToHazingWaiver?: boolean }
 *
 * On success:
 *   - Rush.status -> ACCEPTED | DECLINED
 *   - Rush.bidRespondedAt -> now
 *   - Rush.bidResponseChoice -> choice
 *   - Rush.bidToken -> null   (single-use; forwarded link can't be replayed)
 *   - AuditLog row written ("BID_ACCEPTED" or "BID_DECLINED")
 *
 * Returns 404 for invalid/expired/used tokens (don't leak which one).
 */

const BodySchema = z.object({
  choice: z.enum(["ACCEPTED", "DECLINED"]),
  reason: z.string().max(2000).optional(),
  signatureName: z.string().min(2).max(100).optional(),
  agreedToHazingWaiver: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  // Token shape guard — must look like hex. Bails on garbage URLs before
  // we hit the DB and avoids leaking timing info on token format.
  if (!/^[a-f0-9]{16,64}$/i.test(token)) {
    return NextResponse.json({ ok: false, error: "Invalid link" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid choice" }, { status: 400 });
  }

  const { choice, reason, signatureName, agreedToHazingWaiver } = parsed.data;

  if (choice === "ACCEPTED" && (!signatureName || !agreedToHazingWaiver)) {
    return NextResponse.json({ ok: false, error: "Signature and waiver agreement are required for acceptance" }, { status: 400 });
  }

  const rush = await prisma.rush.findUnique({
    where: { bidToken: token },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      bidTokenExpiresAt: true,
      bidRespondedAt: true,
      notes: true,
      enrichmentData: true,
    },
  });

  if (!rush) {
    return NextResponse.json({ ok: false, error: "Invalid link" }, { status: 404 });
  }
  if (rush.bidRespondedAt) {
    // Already responded — treat as a no-op success so a double-click
    // doesn't error out the user.
    return NextResponse.json({ ok: true, alreadyResponded: true });
  }
  if (rush.bidTokenExpiresAt && rush.bidTokenExpiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "Link expired" }, { status: 410 });
  }

  // Handle signature & PDF upload for Acceptance
  let pdfUrl: string | undefined;
  let noteAddition = "";

  if (choice === "ACCEPTED" && signatureName) {
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
    const fraternityName = cfg["chapter.fraternityName"] || "Phi Sigma Kappa";
    const greekLetters = cfg["chapter.greekLetters"] || "";
    const organization = [fraternityName, greekLetters].filter(Boolean).join(" - ") || "Greek Chapter";

    try {
      pdfUrl = await generateAndUploadSignedPdf({
        name: signatureName,
        email: rush.email || "",
        phone: rush.phone || undefined,
        organization,
        documentTitle: "Membership Bid Acceptance & Zero-Tolerance Anti-Hazing Agreement",
        ipAddress,
        userAgent,
        consentText: `I hereby accept the bid of membership to ${organization} and certify that I have read and agree to all terms, including the Zero-Tolerance Anti-Hazing Agreement. I understand that hazing is strictly prohibited and that my digital signature constitutes a legally binding acceptance of these terms.`,
      }, `${rush.id}_bid_acceptance`);
    } catch (err) {
      console.error("Failed to generate/upload e-signed PDF:", err);
    }

    noteAddition = `\n\n[${new Date().toISOString().slice(0, 10)} accepted bid] Digitally signed by ${signatureName}.${pdfUrl ? ` PDF Certificate: ${pdfUrl}` : ""}`;
  } else if (choice === "DECLINED" && reason) {
    noteAddition = `\n\n[${new Date().toISOString().slice(0, 10)} declined bid] ${reason.trim()}`;
  }

  // Prepare enrichmentData JSON payload containing the verification URL
  let newEnrichmentData = rush.enrichmentData || "";
  if (pdfUrl) {
    try {
      const parsedData = newEnrichmentData ? JSON.parse(newEnrichmentData) : {};
      parsedData.bidWaiverUrl = pdfUrl;
      parsedData.signatureName = signatureName;
      parsedData.signedAt = new Date().toISOString();
      newEnrichmentData = JSON.stringify(parsedData);
    } catch {
      newEnrichmentData = JSON.stringify({ bidWaiverUrl: pdfUrl, signatureName, signedAt: new Date().toISOString() });
    }
  }

  // Single transaction: record response + flip status + clear token.
  // Token nulled so a forwarded link or replay can't double-respond.
  await prisma.rush.update({
    where: { id: rush.id },
    data: {
      status: choice, // ACCEPTED | DECLINED
      bidRespondedAt: new Date(),
      bidResponseChoice: choice,
      bidToken: null,
      bidTokenExpiresAt: null,
      notes: (rush.notes || "") + noteAddition,
      ...(pdfUrl ? { enrichmentData: newEnrichmentData } : {}),
    },
  });

  await audit({
    action: choice === "ACCEPTED" ? "BID_ACCEPTED" : "BID_DECLINED",
    subjectType: "Rush",
    subjectId: rush.id,
    subjectName: rush.name,
    details: choice === "DECLINED" && reason
      ? `reason given (${reason.length} chars)`
      : choice === "ACCEPTED" && pdfUrl
      ? `digitally signed: ${signatureName} (PDF generated)`
      : null,
    req,
  });

  return NextResponse.json({ ok: true });
}
