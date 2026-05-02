import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setBrotherCookie, clearAdminCookie } from "@/lib/auth";

export const runtime = "nodejs";

const LoginSchema = z.object({
  name: z.string().min(2).max(80),
  password: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }
  const { name, password } = parsed.data;

  const expected = process.env.ADMIN_PASSWORD || "phisig-dev";
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const cleanName = name.trim();
  let brother = await prisma.brother.findUnique({ where: { name: cleanName } });
  if (!brother) {
    brother = await prisma.brother.create({
      data: { name: cleanName, role: "MEMBER" },
    });
  } else {
    await prisma.brother.update({
      where: { id: brother.id },
      data: { lastSeen: new Date() },
    });
  }

  setBrotherCookie(brother.id);
  return NextResponse.json({ ok: true, brother: { id: brother.id, name: brother.name } });
}

export async function DELETE() {
  clearAdminCookie();
  return NextResponse.json({ ok: true });
}
