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

/**
 * Per-IP brute-force throttle: 5 failed login attempts within 15 minutes →
 * hard-block for the remainder of the window. Returns true when the caller is
 * currently over the limit. Fails OPEN on DB errors so a transient DB issue
 * never locks legitimate users out. Shared by both the admin and brother
 * branches — login passwords are the most attractive target on this site, so
 * neither path can allow unlimited attempts.
 */
async function isIpThrottled(ipAddress: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const failedRecent = await prisma.rushSubmitLog.count({
      where: {
        ipAddress,
        status: "ADMIN_LOGIN_FAILED",
        createdAt: { gte: since },
      },
    });
    return failedRecent >= 5;
  } catch {
    // Lookup failure — fail open to avoid locking out users during DB issues.
    return false;
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  // ─── Admin login ─────────────────────────────────────────────────────────
  const adminParsed = AdminSchema.safeParse(body);
  const legacyParsed = !adminParsed.success ? LegacySchema.safeParse(body) : null;
  if (adminParsed.success || legacyParsed?.success) {
    const data: any = adminParsed.success ? adminParsed.data : legacyParsed!.data;

    if (ipAddress && (await isIpThrottled(ipAddress))) {
      return NextResponse.json(
        { ok: false, error: "Too many failed attempts. Wait 15 minutes and try again." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }

    // PRODUCTION FAIL-CLOSED GUARD — mirrors the secret-guard pattern in
    // lib/auth.ts (getSecret). In production we REFUSE to operate when
    // ADMIN_PASSWORD is missing OR still equals the historical default
    // ("DamnProud"). Shipping the well-known default to prod would let anyone
    // log in as chapter admin with a guessable password. We disable the SHARED
    // login path entirely (per-chapter DB admins still work via the branch
    // below) rather than 500 the whole route, so a chapter that relies on DB
    // admins isn't taken down by an unset shared credential.
    const DEFAULT_ADMIN_PASSWORD = "DamnProud";
    const isProd =
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production";
    const rawAdminPass = process.env.ADMIN_PASSWORD;
    const sharedDisabledInProd =
      isProd && (!rawAdminPass || rawAdminPass === DEFAULT_ADMIN_PASSWORD);

    // Shared-credential login requires ADMIN_PASSWORD to be EXPLICITLY set — no
    // hardcoded fallback. The old "DamnProud" default meant every chapter whose
    // operator hadn't set the env var accepted a well-known password as admin.
    // When unset, the shared path is disabled and only per-chapter DB admins
    // (brother.role=ADMIN with a passwordHash) can log in. Username keeps a
    // non-secret default so existing logins don't break.
    const expectedUser = process.env.ADMIN_USERNAME || "Phisig";
    // In production, the default/empty password NEVER enables the shared path.
    const expectedPass = sharedDisabledInProd ? undefined : rawAdminPass;
    const sharedConfigured = !!expectedPass;

    const sharedUserOk =
      sharedConfigured && data.username.trim().toLowerCase() === expectedUser.toLowerCase();
    const sharedPassOk =
      sharedConfigured && constantTimeStringEqual(String(data.password || ""), expectedPass!);

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

    // Same per-IP throttle as the admin branch — the brother branch loads
    // candidates by first-name startsWith and bcrypt-checks each, so it is just
    // as brute-forceable and MUST be rate-limited too.
    if (ipAddress && (await isIpThrottled(ipAddress))) {
      return NextResponse.json(
        { ok: false, error: "Too many failed attempts. Wait 15 minutes and try again." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
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
    const match =
      candidates.length > 0
        ? candidates.find((b) => verifyPassword(password, b.passwordHash))
        : null;
    // Collapse "no such brother" and "wrong password" into ONE generic message
    // so an attacker can't enumerate which first names exist.
    if (!match) {
      if (ipAddress) {
        prisma.rushSubmitLog.create({
          data: { ipAddress, status: "ADMIN_LOGIN_FAILED" },
        }).catch(() => {});
      }
      return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
    }
    if (ipAddress) {
      prisma.rushSubmitLog.deleteMany({
        where: { ipAddress, status: "ADMIN_LOGIN_FAILED" },
      }).catch(() => {});
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
