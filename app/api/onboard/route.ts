import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { centralDb } from "@/lib/prisma";
import { ensureTenantRegistry } from "@/lib/tenant-bootstrap";
import { hashPassword } from "@/lib/password";
import { setBrotherCookie } from "@/lib/auth";
import { logger, errorSink } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { renderEmail, renderEmailText } from "@/lib/email-template";
import { sendSalesEmail } from "@/lib/sales-contact";
import fs from "fs";
import path from "path";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { platformSubscriptionDescription } from "@/lib/platform-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/onboard";

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

/** Escape caller-supplied plain strings before interpolating into welcome-email HTML. */
function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    orgType,
    fraternityName, fraternityShort, greekLetters, greekLettersGlyphs,
    schoolName, schoolShort, charterYear, foundingYear, fraternityLetters,
    primaryColor, darkColor, softColor, logoUrl,
    rushEmail, rushPhone, instagramHandle, instagramUrl, schoolInstagramHandle, address, cityState,
    adminName, adminEmail, adminPassword, billingPlan,
    // Pricing method + live-edited hero copy from the upgraded wizard.
    plan: rawPlan,
    heroHeadline, heroTagline,
    // Lifted promo/discount code from the wizard.
    promoCode: rawPromoCode,
    paymentMethodId,
  } = body;

  const subdomain = (rawSubdomain || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Reserved-subdomain denylist + format guard. A provisioned subdomain becomes
  // a live host (sub.greekstack.vercel.app) AND a Postgres schema, so
  // platform/route names and common service hostnames must never be claimable —
  // otherwise a self-serve signup could squat "admin", "api", "webhook", a name
  // that shadows platform routing, or (via punycode "xn--") a homograph host.
  const RESERVED = new Set([
    "www", "greekstack", "greeklifesystems", "greek-life-systems", "apex", "_apex",
    "admin", "api", "app", "apps", "dashboard", "portal", "auth", "login",
    "mail", "email", "smtp", "imap", "ftp", "ns", "ns1", "ns2", "dns",
    "static", "assets", "cdn", "img", "images", "media", "files", "uploads",
    "vercel", "next", "_next", "status", "health", "test", "staging", "dev",
    "billing", "stripe", "webhook", "webhooks", "internal", "system", "root",
    "support", "help", "docs", "blog", "about", "pricing", "demo", "onboard",
    "signup", "register", "account", "accounts", "settings", "config", "null",
  ]);
  // 3–63 chars, start/end alphanumeric, hyphens allowed only in the middle.
  const validFormat = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(subdomain);
  if (
    !subdomain ||
    subdomain.length < 3 ||
    !validFormat ||
    subdomain.includes("--") || // blocks "xn--" punycode + double-hyphen abuse
    RESERVED.has(subdomain)
  ) {
    return NextResponse.json(
      { ok: false, error: "That subdomain is invalid or reserved — please choose another." },
      { status: 400 },
    );
  }
  if (!fraternityName || !greekLetters || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  // Validate the admin email format. This address becomes the admin's login AND
  // the destination for the welcome email + every future reset — a malformed
  // value would create an unrecoverable account and bounce all chapter email.
  // Conservative single-@ check (no spaces, a dot in the domain); we never want
  // to provision a tenant whose only admin can't sign in.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(adminEmail).trim())) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid admin email address." },
      { status: 400 },
    );
  }
  if (String(adminPassword).length < 8) {
    return NextResponse.json({ ok: false, error: "Admin password must be at least 8 characters" }, { status: 400 });
  }

  const promoCode = typeof rawPromoCode === "string" ? rawPromoCode.trim().toUpperCase() : "";
  const isPromoValid = ["GREEKFREE", "WELCOME100", "SILICON"].includes(promoCode);

  // schemaName is built ONLY from the sanitized subdomain ([a-z0-9-] -> _), so
  // it is safe to interpolate into raw SQL (no injection surface).
  const schemaName = `schema_${subdomain.replace(/[^a-zA-Z0-9]/g, "_")}`;
  let tenantPrisma: PrismaClient | null = null;
  let schemaCreated = false;

  try {
    // 0. Ensure the central registry table exists so a fresh deploy never 500s
    //    on the first signup (the public schema may lack public."Tenant" if
    //    `prisma db push` was never run against it). The DDL is hoisted into
    //    lib/tenant-bootstrap.ts and PROCESS-MEMOIZED there — it runs at most
    //    once per server instance, NOT on every signup as the inline version
    //    did. Still idempotent, so a cold instance self-heals on first signup.
    await ensureTenantRegistry();

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
    // STRIP full-line `--` comments BEFORE splitting on `;`. Doing it in this
    // order is load-bearing: a comment line may itself contain a semicolon
    // (e.g. "-- ...additive columns; idempotent so a re-run..."). If we split on
    // `;` first, the text AFTER that semicolon ("idempotent so a") no longer
    // starts with `--`, survives the per-line comment filter, and gets prepended
    // to the next statement as raw SQL — producing a "syntax error at or near
    // 'idempotent'" that would break EVERY signup. Removing comment lines from
    // the source first makes the splitter robust to any `;` inside a comment.
    const statements = sqlContent
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
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
    // Org type drives the member-noun terminology layer (Brother/Sister/Member).
    // Validate against the known set so an unexpected/forged body value can't
    // poison cfg; default to "fraternity" (renders identically to the original
    // hardcoded copy) when absent or unrecognized.
    const ALLOWED_ORG_TYPES = new Set(["fraternity", "sorority", "professional", "other"]);
    const normalizedOrgType =
      typeof orgType === "string" && ALLOWED_ORG_TYPES.has(orgType.trim())
        ? orgType.trim()
        : "fraternity";

    // Pricing METHOD chosen in the wizard, validated against the known plan set so
    // a forged/unknown body value can't poison the registry. Persisted to the
    // central Tenant.plan column (distinct from the SiteConfig "billing.plan"
    // display key below). Defaults to "monthly" (the first-month-free Base offer)
    // — the same default the wizard ships with.
    //   monthly | semester  → Base plan, billed to Greekstack → status "trialing"
    //                         (the free-trial window the soft-gate already honors)
    //   dues_percentage     → Dues-share, $0 upfront → status "active": these
    //                         chapters pay via a % of dues, so entitlement must
    //                         treat them as a paying customer (good standing), not
    //                         a trial that can lapse into the dunning banner.
    //   custom              → Custom build (a "talk to us" path in the wizard).
    //                         Rarely lands here since the wizard's Custom card
    //                         links out to /contact#custom, but it's an allowed
    //                         value so the chosen plan always round-trips cleanly.
    //                         Treated as "active" (a negotiated, paying
    //                         arrangement — never a trial that can lapse).
    //   yearly              → Annual plan ($800/year, includes all rush fees).
    //                         A committed, paying arrangement → status "active"
    //                         (never a trial that can lapse into the dunning
    //                         banner). The first-month-free language is a monthly-
    //                         only offer, so yearly leads with the annual price.
    // ("semester"/"dues_percentage" stay in the allowlist ONLY for back-compat /
    // round-trip safety with already-provisioned tenants; the wizard no longer
    // offers either — the live model is monthly | yearly | custom.)
    const ALLOWED_PLANS = new Set(["monthly", "yearly", "semester", "dues_percentage", "custom"]);
    const normalizedPlan =
      typeof rawPlan === "string" && ALLOWED_PLANS.has(rawPlan.trim())
        ? rawPlan.trim()
        : "monthly";
    const subscriptionStatus =
      normalizedPlan === "dues_percentage" ||
      normalizedPlan === "custom" ||
      normalizedPlan === "yearly"
        ? "active"
        : "trialing";

    // 2-WEEK PAYMENT DEADLINE. The chapter goes live immediately with no card;
    // they must set up payment within 14 days of launch or the site is taken down
    // (the welcome email below states this explicitly). We STORE the deadline here
    // (and message it) — the actual auto-takedown is a separate, intentionally
    // un-built cron. Stored as an ISO string in the tenant's own config so the
    // admin/billing UI can surface an accurate countdown from day one.
    const PAYMENT_DEADLINE_DAYS = 14;
    const paymentDeadline = new Date(Date.now() + PAYMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
    const paymentDeadlineIso = paymentDeadline.toISOString();
    // Friendly human-readable deadline (e.g. "June 19, 2026") reused by both the
    // prospect welcome email and the owner notification below.
    const deadlineLabel = paymentDeadline.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const updates: Record<string, string> = {
      "chapter.orgType": normalizedOrgType,
      // Seed a default timezone so a fresh tenant has TCPA SMS quiet-hours
      // anchored from day one; the admin can change it in /admin/settings.
      "chapter.timezone": "America/New_York",
      "chapter.fraternityName": fraternityName.trim(),
      "chapter.fraternityShort": (fraternityShort || fraternityName).trim(),
      "chapter.greekLetters": greekLetters.trim(),
      "chapter.greekLettersGlyphs": (greekLettersGlyphs || "").trim(),
      "chapter.schoolName": (schoolName || "").trim(),
      "chapter.schoolShort": (schoolShort || "").trim(),
      "chapter.charterYear": (charterYear || "").trim(),
      "chapter.foundingYear": (foundingYear || "").trim(),
      // White-label: never default to a specific org's letters (the old "ΦΣΚ"
      // fallback rained Phi Sig's glyphs over the hero of any chapter that didn't
      // supply its own). Fall back to the chapter's national-org letters derived
      // from the wizard, else empty (the hero then shows the brand-tinted Crest).
      "chapter.fraternityLetters": (fraternityLetters || greekLettersGlyphs || "").trim(),
      "brand.primaryHex": (primaryColor || "#C8102E").trim(),
      "brand.primaryDarkHex": (darkColor || "#A20D26").trim(),
      "brand.primarySoftHex": (softColor || "#FCEFF1").trim(),
      // Chapter logo (optional). Seeded EMPTY so a fresh chapter gets the auto-
      // generated brand-tinted shield until they upload their own crest in
      // /admin/setup or /admin/settings → Brand. If the signup wizard captured
      // a logo URL, persist it from day one.
      "brand.logoUrl": (logoUrl || "").trim(),
      "contact.rushEmail": (rushEmail || "").trim(),
      "contact.rushPhone": (rushPhone || "").trim(),
      "contact.instagramHandle": (instagramHandle || "").trim(),
      "contact.instagramUrl": (instagramUrl || "").trim(),
      // The school's own Instagram handle (optional). Persisted into the tenant's
      // contact config so it's stored on the chapter site's records from day one
      // (mirrors the chapter handle the public site already renders).
      "contact.schoolInstagramHandle": (schoolInstagramHandle || "").trim(),
      "contact.address": (address || "").trim(),
      "contact.cityState": (cityState || "").trim(),
      // Explicitly blank the remaining chapter-specific contact/maps keys in the
      // NEW schema so they are present-and-empty from day one (clarity + the
      // /admin/settings repeaters render an empty field rather than a missing
      // row). Defaults in lib/site-config.ts are already neutral; seeding "" here
      // guarantees a fresh tenant never inherits any reference value.
      "contact.advisorEmail": "",
      "contact.mapsUrl": "",
      // White-label PII/content/photo keys — seed EMPTY so a brand-new chapter
      // NEVER publicly renders another chapter's real members, photos, address,
      // spotlight, or testimonial before the rush chair fills them in. (These
      // mirror the neutralized DEFAULTS; explicit here for present-and-blank
      // rows in the tenant schema.)
      "eboard.1.name": "",
      "eboard.2.name": "",
      "eboard.3.name": "",
      "eboard.4.name": "",
      "eboard.5.name": "",
      "spotlight.slug": "",
      "spotlight.name": "",
      "spotlight.role": "",
      "spotlight.bio": "",
      "about.slug": "",
      "hero.tile1.slug": "",
      "hero.tile2.slug": "",
      "hero.tile3.slug": "",
      "testimonial.author": "",
      "testimonial.classYear": "",
      "testimonial.attribution": "",
      // Display-side billing key in the tenant's own config. Prefer the explicit
      // pricing METHOD the founder chose; fall back to a legacy `billingPlan` body
      // field, then the historical default. (The authoritative platform-billing
      // state lives on the central Tenant row written below.)
      "billing.plan": (billingPlan || normalizedPlan || "dues_split").trim(),
      "dues.enabled": normalizedPlan === "dues_percentage" ? "true" : "false",
      // Record any successfully applied promo/discount code used at signup.
      "billing.promoCode": isPromoValid ? promoCode : "",
      // 2-week payment deadline (ISO). Set-up-payment-by date from launch; after
      // this the site is subject to takedown (messaged in the welcome email). The
      // auto-takedown cron is intentionally NOT built — this is the stored value.
      "billing.paymentDeadline": paymentDeadlineIso,
      // Recruitment-term label (e.g. "Fall '26") drives every season/year string
      // on the public site. Seeded present-and-default so a fresh tenant edits one
      // field in /admin/settings instead of hunting hardcoded literals.
      "rush.termLabel": "Fall '26",
      "chapter.onboarded": "true",
    };

    // Hero copy the founder edited live on the preview. Only seed a key when they
    // actually typed something — an empty value must NOT overwrite the polished
    // white-label defaults in lib/site-config.ts (hero.h1.lead / hero.subline).
    // The headline maps to the lead line of the hero <h1>; the tagline to the
    // supporting subline. Both are fully editable later in Admin → Settings.
    const heroHeadlineTrim = typeof heroHeadline === "string" ? heroHeadline.trim() : "";
    const heroTaglineTrim = typeof heroTagline === "string" ? heroTagline.trim() : "";
    if (heroHeadlineTrim) updates["hero.h1.lead"] = heroHeadlineTrim;
    if (heroTaglineTrim) updates["hero.subline"] = heroTaglineTrim;
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

    // 5. Stripe Customer & Subscription setup (if required by plan & Stripe is configured)
    const TRIAL_DAYS = 14;
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let finalSubscriptionStatus: string = subscriptionStatus;
    let finalTrialEndsAt: Date | null = normalizedPlan === "custom" ? null : trialEndsAt;

    const stripe = getStripe();
    const requiresPayment = stripe && (normalizedPlan === "monthly" || normalizedPlan === "yearly");

    if (requiresPayment) {
      if (!paymentMethodId) {
        return NextResponse.json(
          { ok: false, error: "Payment method registration is required to launch on this plan." },
          { status: 400 }
        );
      }
      try {
        // 1. Create a Customer
        const customer = await stripe.customers.create({
          email: adminEmail.trim().toLowerCase(),
          name: `${adminName.trim()} (${fraternityName.trim()})`,
          metadata: { subdomain },
        });
        stripeCustomerId = customer.id;

        // 2. Attach payment method
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomerId,
        });

        // 3. Set default payment method
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // 4. Resolve the Price ID
        const priceId = await getOrCreateStripePrice(stripe, normalizedPlan);

        // 5. Create Subscription
        const subParams: Stripe.SubscriptionCreateParams = {
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          metadata: { subdomain, plan: normalizedPlan },
          description: platformSubscriptionDescription(normalizedPlan, fraternityName.trim()),
          payment_settings: {
            save_default_payment_method: "on_subscription",
          },
        };

        if (normalizedPlan === "monthly") {
          subParams.trial_period_days = 30; // first month free
        }

        const subscription = await stripe.subscriptions.create(subParams);
        stripeSubscriptionId = subscription.id;
        finalSubscriptionStatus = narrowStatus(subscription.status);
        finalTrialEndsAt = trialEndDate(subscription);

        // 6. Create secondary rush subscription if monthly
        if (normalizedPlan === "monthly") {
          try {
            const rushPriceId = await getOrCreateStripePrice(stripe, "rush");
            await stripe.subscriptions.create({
              customer: stripeCustomerId,
              items: [{ price: rushPriceId }],
              metadata: { subdomain, kind: "rush_cycle" },
              description: `Greek Stack rush cycle (each semester) — ${fraternityName.trim()}`,
              trial_period_days: 30, // first month free
              payment_settings: {
                save_default_payment_method: "on_subscription",
              },
            });
          } catch (rushErr: any) {
            errorSink(rushErr, { route: ROUTE, tenant: subdomain, outcome: "rush_subscription_failed" });
          }
        }
      } catch (stripeErr: any) {
        logger.error("Stripe subscription setup failed", stripeErr);
        return NextResponse.json(
          { ok: false, error: `Stripe setup failed: ${stripeErr.message || "Please check card details and try again."}` },
          { status: 400 }
        );
      }
    }

    // Write the central registry row
    await centralDb.tenant.create({
      data: {
        subdomain,
        name: fraternityName.trim(),
        school: (schoolName || "").trim(),
        isActive: true,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus: finalSubscriptionStatus,
        trialEndsAt: finalTrialEndsAt,
        plan: normalizedPlan,
      },
    });

    // Mint the new admin's cookie bound to the NEW chapter's subdomain key (not
    // the apex key this request runs under) and, when a wildcard custom domain is
    // configured (COOKIE_DOMAIN=".yourapex.com"), set Domain so the cookie carries
    // across the post-signup redirect to <subdomain>.<apex>/admin. Without
    // COOKIE_DOMAIN the cookie is host-only and the new admin logs in once on the
    // subdomain (still correct — middleware just bounces them to /admin/login).
    setBrotherCookie(brother.id, true, {
      tenant: subdomain,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    await tenantPrisma.$disconnect();
    tenantPrisma = null;

    // Build the subdomain redirect (http on localhost, https in prod).
    const host = req.headers.get("host") || "greekstack.vercel.app";
    const isLocal = host.includes("localhost");
    const port = isLocal && host.includes("localhost:") ? `:${host.split("localhost:")[1]}` : "";
    const domain = isLocal ? "localhost" : "greekstack.vercel.app";
    const proto = isLocal ? "http" : "https";
    const redirectUrl = `${proto}://${subdomain}.${domain}${port}/admin`;

    // Provisioning succeeded — a full tenant (schema + admin + registry row)
    // now exists. Log subdomain + outcome; no password/PII/secret.
    logger.info("onboard.provisioned", {
      route: ROUTE,
      tenant: subdomain,
      orgType: normalizedOrgType,
      plan: normalizedPlan,
      outcome: "success",
    });

    // Branded WELCOME email to the new chapter admin — BEST-EFFORT. A send
    // failure must NEVER fail provisioning (the tenant already fully exists and
    // the admin is being redirected into /admin). We build the email from the
    // request body's chapter identity + brand color rather than the tenant DB
    // (already disconnected above), and let sendEmail's neutral platform From
    // apply (this is a platform-sent welcome, not a chapter-branded blast). The
    // admin URL points at the new chapter's subdomain /admin.
    try {
      const adminEmailAddr = adminEmail.trim().toLowerCase();
      const adminUrl = `https://${subdomain}.greekstack.vercel.app/admin`;
      const chapterDisplay = [
        fraternityName.trim(),
        (greekLetters || "").trim(),
      ]
        .filter(Boolean)
        .join(" ");
      const brandHex = (primaryColor || "").trim();
      const adminFirst = (adminName || "").trim().split(" ")[0] || "there";
      // Plan-aware billing copy matching the LIVE model exactly: Monthly (first
      // month free, then $50/mo + $200 per rush cycle), Annual ($800/year incl.
      // all rush fees), or Custom. Legacy semester/dues_percentage values (no
      // longer offered) fall through to the Monthly copy.
      const planLabel =
        normalizedPlan === "yearly"
          ? "Annual plan ($800/year, includes all rush fees)"
          : normalizedPlan === "custom"
          ? "Custom plan"
          : "Monthly plan ($50/mo + $200/rush cycle, first month free)";
      const billingLineHtml =
        normalizedPlan === "yearly"
          ? isPromoValid
            ? `You're on the <strong>Annual plan — $800/year</strong>. With promo code <strong>${escHtml(promoCode)}</strong> applied, you'll receive <strong>$150 off your first year</strong> ($650 total)! Full access to every feature, no card required to launch.`
            : `You're on the <strong>Annual plan — $800/year</strong>, which includes every rush-cycle fee. Full access to every feature, no card required to launch.`
          : normalizedPlan === "custom"
          ? `Your <strong>Custom plan</strong> is active — full access to every feature, no card required. We'll be in touch to finalize the details tailored to your chapter.`
          : isPromoValid
          ? `Your <strong>first month is free</strong>. With promo code <strong>${escHtml(promoCode)}</strong> applied, you get an additional 2 months free (<strong>3 months free total</strong>)! After that it's <strong>$50/mo + $200 per rush cycle</strong> (or switch to <strong>$800/year</strong>, which includes all rush fees).`
          : `Your <strong>first month is free</strong> — full access to every feature, no card required. After that it's <strong>$50/mo + $200 per rush cycle</strong> (or switch to <strong>$800/year</strong>, which includes all rush fees).`;
      const billingLineText =
        normalizedPlan === "yearly"
          ? isPromoValid
            ? `You're on the Annual plan — $800/year. Promo code ${promoCode} applied: $150 off your first year ($650 total). No card required to launch.`
            : "You're on the Annual plan — $800/year, includes all rush fees. No card required to launch."
          : normalizedPlan === "custom"
          ? "Your Custom plan is active — full access, no card required. We'll be in touch to finalize details."
          : isPromoValid
          ? `Your first month is free. Promo code ${promoCode} applied: 3 months free total! Then $50/mo + $200 per rush cycle. No card required to launch.`
          : "Your first month is free — then $50/mo + $200 per rush cycle (or $800/year, which includes all rush fees). No card required to launch.";
      const welcomeBody = `
        <p style="margin:0 0 16px;">Hi ${escHtml(adminFirst)}, your chapter is live on Greekstack. 🎉</p>
        <p style="margin:0 0 16px;">Everything — your public rush site, member roster, dues, events, and compliance trail — is ready to go. Sign in to your admin to finish setup and personalize your page.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #eeeef2;border-radius:10px;padding:6px 14px;">
          <tr><td style="padding:6px 0;color:#71717a;">Chapter</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escHtml(chapterDisplay)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">Plan</td><td style="padding:6px 0;text-align:right;">${escHtml(planLabel)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">Admin login</td><td style="padding:6px 0;text-align:right;">${escHtml(adminEmailAddr)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">Your site</td><td style="padding:6px 0;text-align:right;"><a href="${escHtml(adminUrl)}" style="color:${/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brandHex) ? brandHex : "#1F2937"};">${escHtml(subdomain)}.greekstack.vercel.app</a></td></tr>
        </table>
        <p style="margin:16px 0 0;">${billingLineHtml}</p>
        <p style="margin:16px 0 0;">Keep an eye on your inbox — <strong>Ben, the founder, will personally email you</strong> shortly to say hi and make sure you have everything you need to get going.</p>
        <p style="margin:16px 0 0;padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;color:#9a3412;"><strong>Heads up:</strong> please set up payment within <strong>2 weeks</strong> of going live (by <strong>${escHtml(deadlineLabel)}</strong>) from <strong>Admin → Billing</strong>. If payment isn't set up by then, your site will be taken down — we don't want that to happen, so just add a method before the deadline and you're all set.</p>`;
      const html = renderEmail({
        brandHex,
        chapterName: chapterDisplay || fraternityName.trim(),
        chapterSubline: (schoolName || "").trim() || undefined,
        heading: "Welcome to Greekstack",
        bodyHtml: welcomeBody,
        cta: { label: "Open your admin dashboard", url: adminUrl },
        footerNote:
          "You're receiving this because a Greekstack chapter was created with this email.",
      });
      await sendEmail({
        to: adminEmailAddr,
        subject: `Your chapter is live on Greekstack — ${chapterDisplay || fraternityName.trim()}`,
        html,
        text: renderEmailText({
          heading: "Welcome to Greekstack",
          lines: [
            `Hi ${adminFirst}, your chapter ${chapterDisplay} is live.`,
            `Plan: ${planLabel}`,
            `Admin login: ${adminEmailAddr}`,
            `Your site: ${adminUrl}`,
            billingLineText,
            "Keep an eye on your inbox — Ben, the founder, will personally email you shortly.",
            `Heads up: please set up payment within 2 weeks of going live (by ${deadlineLabel}) from Admin -> Billing, or your site will be taken down.`,
          ],
          cta: { label: "Open your admin dashboard", url: adminUrl },
          chapterName: chapterDisplay || fraternityName.trim(),
        }),
      }).catch((e) =>
        errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "welcome_email_failed" }),
      );
    } catch (e: any) {
      // Swallow — provisioning already succeeded; the welcome email is a nicety.
      errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "welcome_email_failed" });
    }

    // OWNER NOTIFICATION — let Ben know a new chapter just signed up so he can
    // send the promised personal follow-up. BEST-EFFORT (same contract as the
    // welcome email above): never fails provisioning. Routes to salesContactEmail()
    // (bensachwitz@gmail.com unless SALES_CONTACT_EMAIL is set) via the shared
    // neutral-platform sales pipeline, with replyTo set to the new admin so Ben
    // can reply straight from his inbox.
    try {
      const chapterDisplay = [fraternityName.trim(), (greekLetters || "").trim()]
        .filter(Boolean)
        .join(" ");
      const adminEmailAddr = adminEmail.trim().toLowerCase();
      const planLabelOwner =
        normalizedPlan === "yearly"
          ? "Annual ($800/year, includes all rush fees)"
          : normalizedPlan === "custom"
          ? "Custom"
          : "Monthly ($50/mo + $200/rush cycle, first month free)";
      const igHandle = (instagramHandle || "").trim();
      const schoolIg = (schoolInstagramHandle || "").trim();
      const igDisplay =
        [igHandle, schoolIg && `school: ${schoolIg}`].filter(Boolean).join("  ·  ") || "—";
      await sendSalesEmail({
        heading: "New chapter signed up",
        subject: `New Greekstack chapter — ${chapterDisplay || fraternityName.trim()}`,
        intro: `A new chapter just launched on Greekstack. They've been told to expect a personal email from you, and that payment must be set up within 2 weeks (by ${deadlineLabel}).`,
        fields: [
          { label: "Chapter", value: chapterDisplay || fraternityName.trim() },
          { label: "School", value: (schoolName || "").trim() },
          { label: "Admin name", value: (adminName || "").trim() },
          { label: "Admin email", value: adminEmailAddr },
          { label: "Plan", value: planLabelOwner },
          { label: "Promo Code", value: isPromoValid ? `${promoCode} (Applied)` : "—" },
          { label: "Instagram", value: igDisplay },
          { label: "Site", value: `${subdomain}.greekstack.vercel.app` },
          { label: "Payment deadline", value: deadlineLabel },
        ],
        replyTo: adminEmailAddr,
        cta: { label: "Open the chapter site", url: `https://${subdomain}.greekstack.vercel.app` },
        footerNote: "Sent automatically when a chapter completes signup.",
      }).catch((e) =>
        errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "owner_notify_failed" }),
      );
    } catch (e: any) {
      // Swallow — provisioning already succeeded; the owner notice is best-effort.
      errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "owner_notify_failed" });
    }

    return NextResponse.json({ ok: true, url: redirectUrl });
  } catch (err: any) {
    // Provisioning failed — record which subdomain + that we rolled back.
    errorSink(err, {
      route: ROUTE,
      tenant: subdomain,
      schemaCreated,
      outcome: "provisioning_failed",
    });
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
    // Real error already captured server-side via errorSink above; never echo
    // the internal message (DDL/SQL/schema detail) back to the client.
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

async function getOrCreateStripePrice(stripe: Stripe, plan: "monthly" | "yearly" | "rush"): Promise<string> {
  // 1. Check env vars first
  if (plan === "monthly" && process.env.STRIPE_PLATFORM_PRICE_ID) {
    return process.env.STRIPE_PLATFORM_PRICE_ID;
  }
  if (plan === "yearly" && process.env.STRIPE_PLATFORM_YEARLY_PRICE_ID) {
    return process.env.STRIPE_PLATFORM_YEARLY_PRICE_ID;
  }
  if (plan === "rush" && process.env.STRIPE_PLATFORM_RUSH_PRICE_ID) {
    return process.env.STRIPE_PLATFORM_RUSH_PRICE_ID;
  }

  // 2. Fallback: Search for an existing price in Stripe by lookup_key
  const lookupKey = `greekstack_${plan}`;
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
    });
    if (prices.data.length > 0) {
      return prices.data[0].id;
    }
  } catch (e: any) {
    logger.error("Failed to list prices in Stripe during onboard", e);
  }

  // 3. Fallback: Create Product and Price on the fly
  const name = plan === "monthly"
    ? "Greekstack Chapter — Monthly"
    : plan === "yearly"
      ? "Greekstack Chapter — Yearly"
      : "Greekstack — Rush Cycle";

  const description = plan === "monthly"
    ? "Greekstack platform subscription — monthly"
    : plan === "yearly"
      ? "Greekstack platform subscription — yearly"
      : "Greekstack rush cycle fee — semester";

  const amount = plan === "monthly"
    ? 5000 // $50/mo
    : plan === "yearly"
      ? 80000 // $800/yr
      : 20000; // $200/semester

  const interval = plan === "yearly" ? "year" : "month";
  const interval_count = plan === "rush" ? 6 : 1;

  const product = await stripe.products.create({
    name,
    description,
    metadata: { plan },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: "usd",
    recurring: {
      interval,
      interval_count,
    },
    lookup_key: lookupKey,
  });

  return price.id;
}

function narrowStatus(s: string | null | undefined): string {
  switch (s) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
      return s;
    case "unpaid":
      return "past_due";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    default:
      return "canceled";
  }
}

function trialEndDate(sub: Stripe.Subscription): Date | null {
  const t = sub.trial_end;
  if (!t || typeof t !== "number") return null;
  return new Date(t * 1000);
}
