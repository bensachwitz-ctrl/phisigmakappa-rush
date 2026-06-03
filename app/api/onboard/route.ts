import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { centralDb, getSubdomain } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setBrotherCookie } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    subdomain: rawSubdomain,
    fraternityName,
    fraternityShort,
    greekLetters,
    greekLettersGlyphs,
    schoolName,
    schoolShort,
    charterYear,
    foundingYear,
    fraternityLetters,
    primaryColor,
    darkColor,
    softColor,
    rushEmail,
    rushPhone,
    instagramHandle,
    instagramUrl,
    address,
    cityState,
    adminName,
    adminEmail,
    adminPassword,
    billingPlan,
  } = body;

  const subdomain = (rawSubdomain || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (!subdomain || subdomain === "www" || subdomain === "greeklifesystems") {
    return NextResponse.json({ ok: false, error: "Invalid or reserved subdomain" }, { status: 400 });
  }

  if (!fraternityName || !greekLetters || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  try {
    // 1. Verify subdomain uniqueness in central database
    const existingTenant = await centralDb.tenant.findUnique({
      where: { subdomain },
    });

    if (existingTenant) {
      return NextResponse.json({ ok: false, error: "Subdomain is already taken" }, { status: 400 });
    }

    const schemaName = `schema_${subdomain.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // 2. Create the PostgreSQL schema dynamically
    await centralDb.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);

    // 3. Read and run the schema DDL statement by statement
    const sqlFilePath = path.join(process.cwd(), "lib", "schema.sql");
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error("Database DDL schema file not found. Run migrations first.");
    }
    let sqlContent = fs.readFileSync(sqlFilePath, "utf8");

    // Strip Unicode BOM character if present
    if (sqlContent.startsWith("\uFEFF")) {
      sqlContent = sqlContent.slice(1);
    }

    // Split SQL by semicolons, filtering out SQL comment lines
    const statements = sqlContent
      .split(";")
      .map((s) => {
        return s
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim();
      })
      .filter((s) => s.length > 0);

    const baseUri = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
    const separator = baseUri.includes("?") ? "&" : "?";
    const tenantDbUrl = `${baseUri}${separator}schema=${schemaName}&options=-c%20search_path=${schemaName}`;

    const tenantPrisma = new PrismaClient({
      datasources: {
        db: {
          url: tenantDbUrl,
        },
      },
    });

    // Execute each table, index, and key constraint creation query in the tenant schema
    for (const statement of statements) {
      try {
        await tenantPrisma.$executeRawUnsafe(statement);
      } catch (err: any) {
        // Ignore errors if the table/index already exists, but log other failures
        if (!err.message?.includes("already exists")) {
          console.warn(`Statement warning on schema ${schemaName}:`, err.message);
        }
      }
    }

    // 4. Create the central Tenant record
    const tenant = await centralDb.tenant.create({
      data: {
        subdomain,
        name: fraternityName.trim(),
        school: schoolName.trim(),
        isActive: true,
      },
    });

    // 5. Hash password and seed the tenant configurations
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

    // Upsert site settings into the tenant-specific tables
    for (const [key, value] of Object.entries(updates)) {
      await tenantPrisma.siteConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    // Create the admin member
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

    // Create the PortalUser credential
    await tenantPrisma.portalUser.create({
      data: {
        role: "brother",
        email: adminEmail.trim().toLowerCase(),
        passwordHash: hashed,
        brotherId: brother.id,
        lastLoginAt: new Date(),
      },
    });

    // Set authentication cookie for the admin session
    setBrotherCookie(brother.id, true);

    // Clean up temporary client connection
    await tenantPrisma.$disconnect();

    // Construct the dynamic subdomain redirect URL
    const host = req.headers.get("host") || "greeklifesystems.vercel.app";
    const port = host.includes("localhost:") ? `:${host.split("localhost:")[1]}` : "";
    const domain = host.includes("localhost") ? "localhost" : "greeklifesystems.vercel.app";
    const redirectUrl = `https://${subdomain}.${domain}${port}/admin`;

    return NextResponse.json({ ok: true, url: redirectUrl });
  } catch (err: any) {
    console.error("Multi-tenant onboarding failed:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to initialize chapter SaaS instance" },
      { status: 500 }
    );
  }
}
