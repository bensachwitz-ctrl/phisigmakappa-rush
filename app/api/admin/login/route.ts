import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { setBrotherCookie, clearAdminCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Constant-time string compare. crypto.timingSafeEqual throws on length
 * mismatch — pad both sides to the longer of the two to avoid leaking
 * which one was longer, then compare. Used to compare admin passwords.
 */
function constantTimeStringEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  bufA.write(a, "utf8");
  bufB.write(b, "utf8");
  // We must still check length last so the boolean doesn't leak — XOR-fold
  // the length-mismatch into the result.
  return crypto.timingSafeEqual(bufA, bufB) && a.length === b.length;
}

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

    // Per-IP brute-force throttle: 5 failed attempts within 15 minutes →
    // hard-block for the remainder of the 15-min window. The shared admin
    // password is the single most attractive target on this site, so we
    // CANNOT allow unlimited attempts.
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    if (ipAddress) {
      try {
        const since = new Date(Date.now() - 15 * 60 * 1000);
        const failedRecent = await prisma.rushSubmitLog.count({
          where: {
            ipAddress,
            status: "ADMIN_LOGIN_FAILED",
            createdAt: { gte: since },
          },
        });
        if (failedRecent >= 5) {
          return NextResponse.json(
            { ok: false, error: "Too many failed attempts. Wait 15 minutes and try again." },
            { status: 429, headers: { "Retry-After": "900" } },
          );
        }
      } catch {
        // Lookup failure — fail open to avoid locking out admins during DB issues.
      }
    }

    // SECURITY: the shared-admin login only exists when BOTH env vars are
    // explicitly configured. We deliberately ship NO hardcoded fallback
    // (previously "Phisig"/"DamnProud") — this repo is shareable/templateable,
    // so a buyer who deploys without setting these must NOT silently run on
    // publicly-known credentials. When unset, the shared path is disabled and
    // only per-chapter DB admin accounts (Brother role=ADMIN + passwordHash)
    // can sign in.
    const envUser = process.env.ADMIN_USERNAME;
    const envPass = process.env.ADMIN_PASSWORD;
    const sharedAdminEnabled = Boolean(envUser && envPass);

    const sharedUserOk =
      sharedAdminEnabled &&
      data.username.trim().toLowerCase() === envUser!.toLowerCase();
    const sharedPassOk =
      sharedAdminEnabled &&
      constantTimeStringEqual(String(data.password || ""), envPass!);

    let matchedAdminBrother = null;
    let loginSuccess = sharedUserOk && sharedPassOk;

    if (!loginSuccess) {
      const dbAdmin = await prisma.brother.findFirst({
        where: {
          OR: [
            { email: { equals: data.username.trim(), mode: "insensitive" } },
            { name: { equals: data.username.trim(), mode: "insensitive" } }
          ],
          role: "ADMIN",
        },
      });
      if (dbAdmin && verifyPassword(data.password, dbAdmin.passwordHash)) {
        loginSuccess = true;
        matchedAdminBrother = dbAdmin;
      }
    }

    if (!loginSuccess) {
      if (ipAddress) {
        prisma.rushSubmitLog.create({
          data: { ipAddress, status: "ADMIN_LOGIN_FAILED" },
        }).catch(() => {});
      }
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    if (ipAddress) {
      prisma.rushSubmitLog.deleteMany({
        where: { ipAddress, status: "ADMIN_LOGIN_FAILED" },
      }).catch(() => {});
    }

    let brother = matchedAdminBrother;
    if (!brother) {
      const cleanName = (data.name && data.name.trim()) || "Chapter Admin";
      brother = await prisma.brother.findUnique({ where: { name: cleanName } });
      if (!brother) {
        brother = await prisma.brother.create({ data: { name: cleanName, role: "ADMIN" } });
      } else {
        await prisma.brother.update({
          where: { id: brother.id },
          data: { lastSeen: new Date(), role: "ADMIN" },
        });
      }
    } else {
      await prisma.brother.update({
        where: { id: brother.id },
        data: { lastSeen: new Date() },
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
