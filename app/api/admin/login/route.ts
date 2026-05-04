import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setBrotherCookie, clearAdminCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdminSchema = z.object({
  mode: z.literal("admin"),
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(120),
  // legacy field — accepted but ignored
  name: z.string().optional(),
});

const BrotherSchema = z.object({
  mode: z.literal("brother"),
  firstName: z.string().min(1).max(40),
  password: z.string().min(1).max(120),
});

// Legacy shape used by older client builds (treated as admin login).
const LegacySchema = z.object({
  name: z.string().min(2).max(80),
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // ─── Admin login ─────────────────────────────────────────────────────────
  const adminParsed = AdminSchema.safeParse(body);
  const legacyParsed = !adminParsed.success ? LegacySchema.safeParse(body) : null;
  if (adminParsed.success || legacyParsed?.success) {
    const data: any = adminParsed.success ? adminParsed.data : legacyParsed!.data;
    const expectedUser = process.env.ADMIN_USERNAME || "Phisig";
    const expectedPass = process.env.ADMIN_PASSWORD || "DamnProud";
    // Case-insensitive compare so the e-board doesn't fail login over a capitalization typo.
    const userOk = data.username.trim().toLowerCase() === expectedUser.toLowerCase();
    const passOk = (data.password || "").toLowerCase() === expectedPass.toLowerCase();
    if (!userOk || !passOk) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }
    // Single shared admin record — username = the credential. If the legacy "name"
    // field was supplied (older client), prefer it so existing admin Brothers keep
    // their attribution. Otherwise use a stable "Chapter Admin" record.
    const cleanName = (data.name && data.name.trim()) || "Chapter Admin";
    let brother = await prisma.brother.findUnique({ where: { name: cleanName } });
    if (!brother) {
      brother = await prisma.brother.create({ data: { name: cleanName, role: "ADMIN" } });
    } else {
      await prisma.brother.update({
        where: { id: brother.id },
        data: { lastSeen: new Date(), role: "ADMIN" },
      });
    }
    setBrotherCookie(brother.id, true);
    return NextResponse.json({
      ok: true,
      brother: { id: brother.id, name: brother.name },
      role: "ADMIN",
    });
  }

  // ─── Brother login ───────────────────────────────────────────────────────
  const brotherParsed = BrotherSchema.safeParse(body);
  if (brotherParsed.success) {
    const { firstName, password } = brotherParsed.data;
    const fn = firstName.trim();
    if (!fn) {
      return NextResponse.json({ ok: false, error: "First name is required" }, { status: 400 });
    }
    // Match Brothers whose name starts with "<firstName> " (case-insensitive)
    // OR whose full name is exactly <firstName>.
    const candidates = await prisma.brother.findMany({
      where: {
        OR: [
          { name: { startsWith: fn + " ", mode: "insensitive" } },
          { name: { equals: fn, mode: "insensitive" } },
        ],
        passwordHash: { not: null },
      },
      take: 10,
    });
    if (candidates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No brother found with that first name. Check with the rush chair if you haven't completed onboarding yet." },
        { status: 401 }
      );
    }
    const match = candidates.find((b) => verifyPassword(password, b.passwordHash));
    if (!match) {
      return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
    }
    await prisma.brother.update({ where: { id: match.id }, data: { lastSeen: new Date() } });
    setBrotherCookie(match.id, false);
    return NextResponse.json({
      ok: true,
      brother: { id: match.id, name: match.name },
      role: "MEMBER",
    });
  }

  return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
}

export async function DELETE() {
  clearAdminCookie();
  return NextResponse.json({ ok: true });
}
