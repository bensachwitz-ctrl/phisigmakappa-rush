// scripts/seed-review-account.mjs
//
// Create (idempotently) the Apple App Review sign-in account the iOS listing
// hands the reviewer. The iOS app is LOGIN-ONLY (no in-app demo), so Apple
// Review needs a real, working member account to exercise the app — otherwise
// they reject under Guideline 2.1. This seeds an OFFICER Brother + its PortalUser
// on a chapter (default: phisig) so the reviewer can test BOTH the member and
// the exec/officer surfaces (exec is server-gated on Brother.position — see
// lib/member-capabilities.ts — so the seeded position "President" is what unlocks
// the officer switcher).
//
// SAFE + IDEMPOTENT: upserts by email, so re-running just refreshes the password.
// It writes ONLY this one review account into the target chapter's schema.
//
// Secrets: the DB URL is read from the local env at RUNTIME (never printed or
// committed). Run it from the repo root where .env.local lives:
//
//   node scripts/seed-review-account.mjs
//
// Override any of these via env if desired:
//   GS_REVIEW_SUBDOMAIN (default "phisig")
//   GS_REVIEW_EMAIL     (default "appreview@greekstack.app")
//   GS_REVIEW_PASSWORD  (default "GreekStack!Review2026")
//   GS_REVIEW_NAME      (default "Apple App Review")
//   GS_REVIEW_POSITION  (default "President"  — must be an officer seat to get exec)

import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load env the way Next does locally: .env.local wins, then .env.production.local,
// then .env. We do NOT print any of it.
for (const f of [".env.local", ".env.production.local", ".env"]) {
  if (existsSync(f)) loadEnv({ path: f, override: false });
}

// scrypt$<saltHex>$<hashHex> — MUST match lib/password.ts exactly so the app's
// verifyPassword() accepts the seeded hash.
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const SUBDOMAIN = (process.env.GS_REVIEW_SUBDOMAIN || "phisig").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
const EMAIL = (process.env.GS_REVIEW_EMAIL || "appreview@greekstack.app").trim().toLowerCase();
// NO hardcoded password: this seeds a REAL, working login on a live chapter, so a
// baked-in default would commit a usable credential to the repo. Supply it at run
// time (the current value lives in ios/AppStore/LISTING.md for the Apple reviewer):
//   GS_REVIEW_PASSWORD='...' node scripts/seed-review-account.mjs
const PASSWORD = process.env.GS_REVIEW_PASSWORD || "";
const NAME = process.env.GS_REVIEW_NAME || "Apple App Review";
const POSITION = process.env.GS_REVIEW_POSITION || "President";

if (!PASSWORD) {
  console.error(
    "✗ Set GS_REVIEW_PASSWORD to the reviewer password (see ios/AppStore/LISTING.md), e.g.\n" +
      "    GS_REVIEW_PASSWORD='GreekStack!Review2026' node scripts/seed-review-account.mjs",
  );
  process.exit(1);
}

async function main() {
  const base = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!base) {
    console.error(
      "✗ No DATABASE_URL(_UNPOOLED) in env. Run from the repo root where .env.local exists.",
    );
    process.exit(1);
  }
  const schema = `schema_${SUBDOMAIN}`;
  const sep = base.includes("?") ? "&" : "?";
  const url = `${base}${sep}schema=${schema}`;

  const db = new PrismaClient({ datasources: { db: { url } } });
  const passwordHash = hashPassword(PASSWORD);

  try {
    // Self-heal: some early-provisioned chapter schemas predate PortalUser.mustReset
    // (it was missing from lib/schema.sql). ADD COLUMN IF NOT EXISTS is idempotent,
    // so the upsert below can't 500 on a drifted schema. No-op on healthy schemas.
    // NOTE: schema-QUALIFIED — Prisma's ?schema= URL param does NOT set the
    // connection search_path (it stays "$user",public), so an UNQUALIFIED raw ALTER
    // would wrongly hit public."PortalUser". Prisma's own model queries DO qualify
    // with the schema, so the upsert targets schema_<sub>."PortalUser" correctly.
    await db.$executeRawUnsafe(
      `ALTER TABLE ${schema}."PortalUser" ADD COLUMN IF NOT EXISTS "mustReset" BOOLEAN NOT NULL DEFAULT false;`,
    );

    // 1) The Brother row (the member of record). position → officer = exec access.
    const brother = await db.brother.upsert({
      where: { email: EMAIL },
      update: { passwordHash, position: POSITION, role: "ADMIN", status: "ACTIVE" },
      create: {
        name: NAME,
        email: EMAIL,
        passwordHash,
        position: POSITION,
        role: "ADMIN",
        status: "ACTIVE",
        year: "Senior",
        major: "Computer Science",
        pledgeClass: "Review Class",
      },
    });

    // 2) The PortalUser (what login authenticates against; brother-role session).
    await db.portalUser.upsert({
      where: { email: EMAIL },
      update: { passwordHash, role: "brother", brotherId: brother.id, mustReset: false },
      create: { email: EMAIL, passwordHash, role: "brother", brotherId: brother.id },
    });

    console.log("✓ Review account ready on chapter '%s' (%s):", SUBDOMAIN, schema);
    console.log("    email:    %s", EMAIL);
    console.log("    password: %s", PASSWORD);
    console.log("    role:     Brother (officer/President → exec view enabled)");
    console.log("  Sign in on the iOS app: pick the chapter's school → chapter → Brother tab.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗ Seed failed:", e && e.message ? e.message : e);
  process.exit(1);
});
