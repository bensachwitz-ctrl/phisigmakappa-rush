import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setBrotherCookie } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 1. Check if already onboarded
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));
  if (cfg["chapter.onboarded"] === "true") {
    return NextResponse.json({ ok: false, error: "Onboarding already completed" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    fraternityName,
    fraternityShort,
    greekLetters,
    greekLettersGlyphs,
    schoolName,
    schoolShort,
    charterYear,
    foundingYear,
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
  } = body;

  // Simple validation
  if (!fraternityName || !greekLetters || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  try {
    const hashed = hashPassword(adminPassword);

    // Save configurations
    const updates: Record<string, string> = {
      "chapter.fraternityName": fraternityName.trim(),
      "chapter.fraternityShort": (fraternityShort || fraternityName).trim(),
      "chapter.greekLetters": greekLetters.trim(),
      "chapter.greekLettersGlyphs": (greekLettersGlyphs || "").trim(),
      "chapter.schoolName": (schoolName || "").trim(),
      "chapter.schoolShort": (schoolShort || "").trim(),
      "chapter.charterYear": (charterYear || "").trim(),
      "chapter.foundingYear": (foundingYear || "").trim(),
      "brand.primaryHex": (primaryColor || "#C8102E").trim(),
      "brand.primaryDarkHex": (darkColor || "#A20D26").trim(),
      "brand.primarySoftHex": (softColor || "#FCEFF1").trim(),
      "contact.rushEmail": (rushEmail || "").trim(),
      "contact.rushPhone": (rushPhone || "").trim(),
      "contact.instagramHandle": (instagramHandle || "").trim(),
      "contact.instagramUrl": (instagramUrl || "").trim(),
      "contact.address": (address || "").trim(),
      "contact.cityState": (cityState || "").trim(),
    };

    // Upsert each configuration key
    for (const [key, value] of Object.entries(updates)) {
      await prisma.siteConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    // Create the admin brother
    const brother = await prisma.brother.create({
      data: {
        name: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        phone: rushPhone ? rushPhone.trim() : null,
        role: "ADMIN",
        position: "President", // Default position
        passwordHash: hashed,
        status: "ACTIVE",
      },
    });

    // Create the PortalUser for browser login
    await prisma.portalUser.create({
      data: {
        role: "brother",
        email: adminEmail.trim().toLowerCase(),
        passwordHash: hashed,
        brotherId: brother.id,
        lastLoginAt: new Date(),
      },
    });

    // Mark setup complete
    await prisma.siteConfig.upsert({
      where: { key: "chapter.onboarded" },
      update: { value: "true" },
      create: { key: "chapter.onboarded", value: "true" },
    });

    // Set admin cookie so they are logged in automatically
    setBrotherCookie(brother.id, true);

    await audit({
      action: "ONBOARDING_COMPLETED",
      subjectType: "Settings",
      subjectId: null,
      subjectName: "Setup Completed",
      details: `Onboarded chapter: ${fraternityName} ${greekLetters} at ${schoolName}. Admin: ${adminName}.`,
      req,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Onboarding failed:", err);
    return NextResponse.json({ ok: false, error: "Failed to save onboarding configuration" }, { status: 500 });
  }
}
