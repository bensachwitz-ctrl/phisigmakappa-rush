import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { loadInvite } from "@/lib/brother-invite";

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
});

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
  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    return NextResponse.json({ ok: false, error: "Passwords don't match" }, { status: 400 });
  }
  const passwordHash = data.password ? hashPassword(data.password) : undefined;

  const existing = await prisma.brother.findUnique({ where: { name: cleanName } });
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

  await prisma.brotherInvite.update({
    where: { id: invite.id },
    data: { status: "COMPLETED", brotherId: brother.id, completedAt: new Date() },
  });

  return NextResponse.json({ ok: true, brother: { id: brother.id, name: brother.name } });
}
