import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = String(body.token || "").trim();
  const password = String(body.password || "").trim();

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
  }

  // Find PortalUser by magicToken
  const portalUser = await prisma.portalUser.findFirst({
    where: {
      magicToken: token,
      magicTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!portalUser) {
    return NextResponse.json({ error: "Invalid or expired password reset token." }, { status: 400 });
  }

  // Hash new password
  const hashedPassword = hashPassword(password);

  // Update PortalUser password
  await prisma.portalUser.update({
    where: { id: portalUser.id },
    data: {
      passwordHash: hashedPassword,
      magicToken: null,
      magicTokenExpiresAt: null,
    },
  });

  // If a brother record is linked, update it there too
  if (portalUser.role === "brother" && portalUser.brotherId) {
    await prisma.brother.update({
      where: { id: portalUser.brotherId },
      data: { passwordHash: hashedPassword },
    });
  }

  return NextResponse.json({ ok: true, message: "Password has been reset successfully." });
}
