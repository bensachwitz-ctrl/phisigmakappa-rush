import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { centralDb } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setBrotherCookie } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-IP rate limit on tenant creation. Each provisioning spins up a Postgres
// schema + ~42 tables, so an open/unauth endpoint is a cheap way to exhaust the
// database. In-memory is fine for a single instance; a multi-instance deploy
// would want a Redis-backed limiter.
const onboardAttempts = new Map<string, number[]>();
const ONBOARD_WINDOW_MS = 60 * 60 * 1000; // 1h
const ONBOARD_LIMIT = 5;
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (onboardAttempts.get(ip) || []).filter((t) => now - t < ONBOARD_WINDOW_MS);
  if (recent.length >= ONBOARD_LIMIT) return true;
  recent.push(now);
  onboardAttempts.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (ip !== "unknown" && isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many chapters created from this network. Try again in an hour." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    subdomain: rawSubdomain,
    fraternityName, fraternityShort, greekLetters, greekLettersGlyphs,
    schoolName, schoolShort, charterYear, foundingYear, fraternityLetters,
    primaryColor, darkColor, softColor,
    rushEmail, rushPhone, instagramHandle, instagramUrl, address, cityState,
    adminName, adminEmail, adminPassword, billingPlan,
  } = body;

  const subdomain = (rawSubdomain || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (!subdomain || subdomain === "www" || subdomain === "greeklifesystems") {
    return NextResponse.json({ ok: false, error: "Invalid or reserved subdomain" }, { status: 400 });
  }
  if (!fraternityName || !greekLetters || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (String(adminPassword).length < 8) {
    return NextResponse.json({ ok: false, error: "Admin password must be at least 8 characters" }, { status: 400 });
  }

  // schemaName is built ONLY from the sanitized subdomain ([a-z0-9-] -> _), so
  // it is safe to interpolate into raw SQL (no injection surface).
  const schemaName = `schema_${subdomain.replace(/[^a-zA-Z0-9]/g, "_")}`;
  let tenantPrisma: PrismaClient | null = null;
  let schemaCreated = false;

  try {
    // 0. Self-bootstrap the central registry table so a fresh deploy never 500s
    //    on the first signup (the public schema may lack public."Tenant" if
    //    `prisma db push` was never run against it). Idempotent + cheap.
    await centralDb.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS public."Tenant" ("id" TEXT NOT NULL, "subdomain" TEXT NOT NULL, "domain" TEXT, "name" TEXT, "school" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id"));`,
    );
    await centralDb.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_subdomain_key" ON public."Tenant"("subdomain");`,
    );

    // 1. Reserve the subdomain via the central registry (uniqueness).
    const existingTenant = await centralDb.tenant.findUnique({ where: { subdomain } });
    if (existingTenant) {
      return NextResponse.json({ ok: false, error: "Subdomain is already taken" }, { status: 400 });
    }

    // 2. Create the tenant's Postgres schema.
    await centralDb.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
    schemaCreated = true;

    // 3. Run the tenant DDL (lib/schema.sql) into the new schema. FAIL HARD on
    //    any error other than "already exists" so we never leave a half-built
    //    tenant — the catch below drops the schema and the subdomain stays free.
    const sqlFilePath = path.join(process.cwd(), "lib", "schema.sql");
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error("Database DDL schema file not found.");
    }
    let sqlContent = fs.readFileSync(sqlFilePath, "utf8");
    if (sqlContent.startsWith("﻿")) sqlContent = sqlContent.slice(1);
    const statements = sqlContent
      .split(";")
      .map((s) => s.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n").trim())
      .filter((s) => s.length > 0);

    const baseUri = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
    const separator = baseUri.includes("?") ? "&" : "?";
    const tenantDbUrl = `${baseUri}${separator}schema=${schemaName}&options=-c%20search_path=${schemaName}`;
    tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } });

    for (const statement of statements) {
      try {
        await tenantPrisma.$executeRawUnsafe(statement);
      } catch (err: any) {
        if (!err?.message?.includes("already exists")) {
          throw new Error(`Tenant DDL failed: ${err?.message || "unknown error"}`);
        }
      }
    }

    // 4. Seed tenant config + the admin account into the tenant schema.
    const hashed = hashPassword(adminPassword);
    const updates: Record<string, string> = {
      "chapter.fraternityName": fraternityName.trim(),
      "chapter.fraternityShort": (fraternityShort || fraternityName).trim(),
      "chapter.greekLetters": greekLetters.trim(),
      "chapter.greekLettersGlyphs": (greekLettersGlyphs || "").trim(),
      "chapter.schoolName": (schoolName || "").trim(),
      "chapter.schoolShort": (schoolShort || "").trim(),
      "chapter.charterYear": (charterYear || "").trim(),
      "chapter.foundingYear": (foundingYear || "").trim(),
      "chapter.fraternityLetters": (fraternityLetters || "ΦΣΚ").trim(),
      "brand.primaryHex": (primaryColor || "#C8102E").trim(),
      "brand.primaryDarkHex": (darkColor || "#A20D26").trim(),
      "brand.primarySoftHex": (softColor || "#FCEFF1").trim(),
      "contact.rushEmail": (rushEmail || "").trim(),
      "contact.rushPhone": (rushPhone || "").trim(),
      "contact.instagramHandle": (instagramHandle || "").trim(),
      "contact.instagramUrl": (instagramUrl || "").trim(),
      "contact.address": (address || "").trim(),
      "contact.cityState": (cityState || "").trim(),
      "billing.plan": (billingPlan || "dues_split").trim(),
      "chapter.onboarded": "true",
    };
    for (const [key, value] of Object.entries(updates)) {
      await tenantPrisma.siteConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
    }

    const brother = await tenantPrisma.brother.create({
      data: {
        name: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        phone: rushPhone ? rushPhone.trim() : null,
        role: "ADMIN",
        position: "President",
        passwordHash: hashed,
        status: "ACTIVE",
      },
    });

    await tenantPrisma.portalUser.create({
      data: {
        role: "brother",
        email: adminEmail.trim().toLowerCase(),
        passwordHash: hashed,
        brotherId: brother.id,
        lastLoginAt: new Date(),
      },
    });

    // 5. Only now — with the tenant fully built — write the central registry
    //    row, so a registry entry always implies a complete, usable tenant.
    await centralDb.tenant.create({
      data: {
        subdomain,
        name: fraternityName.trim(),
        school: (schoolName || "").trim(),
        isActive: true,
      },
    });

    setBrotherCookie(brother.id, true);
    await tenantPrisma.$disconnect();
    tenantPrisma = null;

    // Build the subdomain redirect (http on localhost, https in prod).
    const host = req.headers.get("host") || "greeklifesystems.vercel.app";
    const isLocal = host.includes("localhost");
    const port = isLocal && host.includes("localhost:") ? `:${host.split("localhost:")[1]}` : "";
    const domain = isLocal ? "localhost" : "greeklifesystems.vercel.app";
    const proto = isLocal ? "http" : "https";
    const redirectUrl = `${proto}://${subdomain}.${domain}${port}/admin`;

    return NextResponse.json({ ok: true, url: redirectUrl });
  } catch (err: any) {
    console.error("Multi-tenant onboarding failed:", err);
    // Roll back the half-created schema so the subdomain can be retried cleanly.
    // The registry row is written last, so on failure it never exists yet.
    try {
      if (tenantPrisma) await tenantPrisma.$disconnect();
    } catch {}
    if (schemaCreated) {
      await centralDb
        .$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`)
        .catch(() => {});
    }
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to initialize chapter SaaS instance" },
      { status: 500 },
    );
  }
}
