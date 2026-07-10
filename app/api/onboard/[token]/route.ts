import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateAndUploadSignedPdf } from "@/lib/esign";
import { getSiteConfig } from "@/lib/site-config";
import { getClientIp } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).max(40).optional().or(z.literal("")),
  year: z.string().optional(),
  major: z.string().optional(),
  position: z.string().optional(),
  pledgeClass: z.string().optional(),
  bio: z.string().max(2000).optional(),
  headshotUrl: z.string().url().optional().or(z.literal("")),
  password: z.string().min(6).max(120).optional(),
  confirmPassword: z.string().min(6).max(120).optional(),
  signatureName: z.string().min(2).max(100),
  agreedToHazingWaiver: z.boolean(),
});

async function loadInvite(token: string) {
  const invite = await prisma.brotherInvite.findUnique({ where: { token } });
  if (!invite) return { invite: null, reason: "not-found" as const };
  if (invite.status === "REVOKED") return { invite, reason: "revoked" as const };
  if (invite.status === "COMPLETED") return { invite, reason: "completed" as const };
  if (invite.expiresAt < new Date()) {
    await prisma.brotherInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return { invite, reason: "expired" as const };
  }
  return { invite, reason: "ok" as const };
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const { invite, reason } = await loadInvite(params.token);
  if (!invite) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
  return NextResponse.json({
    ok: reason === "ok",
    reason,
    invite: {
      email: invite.email,
      phone: invite.phone,
      prefillName: invite.prefillName,
      invitedBy: invite.invitedBy,
      status: invite.status,
      expiresAt: invite.expiresAt,
    },
  });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { invite, reason } = await loadInvite(params.token);
  if (!invite || reason !== "ok") {
    return NextResponse.json({ ok: false, error: `Invite ${reason}` }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the form and try again." }, { status: 400 });
  }
  const data = parsed.data;
  const cleanName = data.name.trim();

  if (!data.signatureName || !data.agreedToHazingWaiver) {
    return NextResponse.json({ ok: false, error: "Waiver signature and agreement are required to complete onboarding." }, { status: 400 });
  }

  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    return NextResponse.json({ ok: false, error: "Passwords don't match" }, { status: 400 });
  }
  const passwordHash = data.password ? hashPassword(data.password) : undefined;

  const existing = await prisma.brother.findUnique({ where: { name: cleanName } });

  // ACCOUNT-TAKEOVER GUARD (P0): a redeem may only update an EXISTING brother when
  // that brother is the invite's own bound target. Otherwise an invite holder could
  // supply the name of any current member (including an ADMIN) and overwrite their
  // passwordHash, seizing the account. Bind the redeem to the invite via, in order:
  //   1. a pre-bound target brotherId (defensive; not currently set until completion),
  //   2. the invite's prefillName matching the existing brother's name, or
  //   3. the invite's email matching the existing brother's email.
  // If the invite has no bound target that matches this existing brother, we reject:
  // the caller may still create a brand-new brother (the `else` branch below), but may
  // never mutate an unrelated member's record.
  if (existing) {
    const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
    const inviteName = norm(invite.prefillName);
    const inviteEmail = norm(invite.email);
    const existingName = norm(existing.name);
    const existingEmail = norm(existing.email);

    const boundByBrotherId = !!invite.brotherId && invite.brotherId === existing.id;
    const boundByName = inviteName.length > 0 && inviteName === existingName;
    const boundByEmail = inviteEmail.length > 0 && inviteEmail === existingEmail;

    if (!boundByBrotherId && !boundByName && !boundByEmail) {
      return NextResponse.json(
        { ok: false, error: "This name is already registered to another member. Please contact your chapter administrator." },
        { status: 409 },
      );
    }
  }

  let brother;
  if (existing) {
    brother = await prisma.brother.update({
      where: { id: existing.id },
      data: {
        email: data.email || existing.email,
        phone: data.phone || existing.phone,
        year: data.year || existing.year,
        major: data.major || existing.major,
        position: data.position || existing.position,
        pledgeClass: data.pledgeClass || existing.pledgeClass,
        bio: data.bio || existing.bio,
        headshotUrl: data.headshotUrl || existing.headshotUrl,
        passwordHash: passwordHash || existing.passwordHash,
        lastSeen: new Date(),
      },
    });
  } else {
    brother = await prisma.brother.create({
      data: {
        name: cleanName,
        email: data.email || null,
        phone: data.phone || null,
        year: data.year || null,
        major: data.major || null,
        position: data.position || null,
        pledgeClass: data.pledgeClass || null,
        bio: data.bio || null,
        headshotUrl: data.headshotUrl || null,
        passwordHash: passwordHash || null,
        role: "MEMBER",
      },
    });
  }

  // Handle signature & PDF upload for Onboarding Anti-Hazing Waiver
  let pdfUrl: string | undefined;
  const ipAddress = getClientIp(req) || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  const fraternityName = cfg["chapter.fraternityName"] || "Phi Sigma Kappa";
  const greekLetters = cfg["chapter.greekLetters"] || "";
  const organization = [fraternityName, greekLetters].filter(Boolean).join(" - ") || "Greek Chapter";

  try {
    pdfUrl = await generateAndUploadSignedPdf({
      name: data.signatureName,
      email: brother.email || "",
      phone: brother.phone || undefined,
      organization,
      documentTitle: "Anti-Hazing Waiver & Onboarding Agreement",
      ipAddress,
      userAgent,
      consentText: `I hereby accept membership to ${organization} and certify that I have read and agree to all terms, including the Zero-Tolerance Anti-Hazing Agreement. I understand that hazing is strictly prohibited and that my digital signature constitutes a legally binding acceptance of these terms.`,
    }, `${brother.id}_onboarding_waiver`);
  } catch (err) {
    console.error("Failed to generate/upload onboarding signed PDF:", err);
  }

  // Create Document row in DB associated with the Brother
  if (pdfUrl) {
    try {
      await prisma.document.create({
        data: {
          name: "Anti-Hazing Waiver & Onboarding Agreement",
          description: `Digitally signed by ${data.signatureName} during onboarding. Verification hash is recorded.`,
          url: pdfUrl,
          blobUrl: pdfUrl,
          category: "POLICIES",
          visibility: "OFFICERS",
          uploadedById: brother.id,
          fileName: `${brother.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}_onboarding_waiver.pdf`,
        },
      });
    } catch (dbErr) {
      console.error("Failed to create Document record for onboarding waiver:", dbErr);
    }
  }

  await prisma.brotherInvite.update({
    where: { id: invite.id },
    data: { status: "COMPLETED", brotherId: brother.id, completedAt: new Date() },
  });

  return NextResponse.json({ ok: true, brother: { id: brother.id, name: brother.name } });
}
