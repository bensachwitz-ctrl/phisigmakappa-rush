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
import { resolveTemplateId } from "@/components/site/templates/template-orders";
import { normalizeSubdomain, checkSubdomainFormat } from "@/lib/reserved-subdomains";
import { applyTenantDdl } from "@/lib/tenant-ddl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/onboard";

/**
 * A client-facing validation failure raised AFTER the tenant schema has been
 * created. Throwing (instead of an early `return`) routes through the outer
 * catch so the half-created schema + any Stripe objects are rolled back, while
 * still surfacing the intended status + message to the caller (the catch reads
 * these off the error rather than emitting a generic 500).
 */
class OnboardClientError extends Error {
  status: number;
  clientMessage: string;
  constructor(clientMessage: string, status = 400) {
    super(clientMessage);
    this.name = "OnboardClientError";
    this.status = status;
    this.clientMessage = clientMessage;
  }
}

// Per-IP rate limit on tenant creation. Each provisioning spins up a Postgres
// schema + ~42 tables, so an open/unauth endpoint is a cheap way to exhaust the
// database. DB-BACKED + CROSS-INSTANCE: the prior in-memory Map<string,number[]>
// reset per serverless process, so on a multi-instance Vercel deploy the 5/IP/hr
// ceiling never held (each instance had its own empty bucket → provisioning
// DoS). We now count this IP's recent rows in the shared central public
// "OnboardAttempt" table and record one row per attempt — the SAME DB-count
// pattern app/api/alumni/donate/checkout uses against RushSubmitLog. The window
// + ceiling are unchanged so single-instance behavior is identical; the count is
// just shared now. FAIL-OPEN on any DB error so a glitch never blocks a
// legitimate signup (the durable fail-hard schema/Stripe rollback below is
// unaffected). The OnboardAttempt table is self-healed by ensureTenantRegistry.
const ONBOARD_WINDOW_MS = 60 * 60 * 1000; // 1h
const ONBOARD_LIMIT = 5;
async function isRateLimited(ip: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - ONBOARD_WINDOW_MS);
    const recent = await centralDb.onboardAttempt.count({
      where: { ipAddress: ip, createdAt: { gte: since } },
    });
    if (recent >= ONBOARD_LIMIT) return true;
    // Record this attempt. Awaited (not fire-and-forget) so a concurrent burst
    // from one IP can't all read the same pre-insert count; a failed insert
    // still falls through to "not limited" via the catch (fail-open).
    await centralDb.onboardAttempt.create({ data: { ipAddress: ip } });
    return false;
  } catch {
    // Fail open on a DB/bootstrap error so a transient glitch can't block signup.
    return false;
  }
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
  // Ensure the central registry + OnboardAttempt rate-limit table exist BEFORE
  // the DB-backed limiter reads them (process-memoized DDL — at most one round-
  // trip per instance). A bootstrap failure must not 500 the signup here: the
  // limiter fails open on error, and the main try below calls ensureTenantRegistry
  // again (idempotent) and surfaces any real DDL failure through its own rollback.
  try {
    await ensureTenantRegistry();
  } catch {
    // Swallow — the limiter fails open below, and provisioning re-runs (and
    // re-reports) the bootstrap inside the main try/catch.
  }
  if (ip !== "unknown" && (await isRateLimited(ip))) {
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
    // Hero template the founder picked + previewed on the mockup step. Validated
    // through resolveTemplateId below so only a real TemplateId is ever persisted.
    template: rawTemplate,
    // Lifted promo/discount code from the wizard.
    promoCode: rawPromoCode,
    paymentMethodId,
  } = body;

  // SINGLE SOURCE OF TRUTH: normalize + validate via lib/reserved-subdomains so
  // the FINAL-submit guard here, the live availability check (app/api/onboard/
  // check), and the typing hint all enforce the SAME denylist + format rules —
  // no inline copy to drift. A provisioned subdomain becomes a live host
  // (sub.greekstack.vercel.app) AND a Postgres schema, so platform/route names
  // and common service hostnames ("admin", "api", "webhook", "public", a
  // punycode "xn--" homograph) must never be self-serve claimable.
  const subdomain = normalizeSubdomain(rawSubdomain);
  if (checkSubdomainFormat(subdomain) !== null) {
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
  // The session tenant TAG the onboard cookie is signed with MUST equal what every
  // verifier derives from the chapter Host at request time. Verifiers call
  // getSubdomain(host) (lib/tenant-host.ts), which collapses non-alphanumerics to
  // "_" and lowercases. normalizeSubdomain() above PRESERVES interior hyphens
  // (e.g. "sig-ep"), so signing with that hyphen form keys the HMAC on
  // "gs-tenant:sig-ep" while the chapter-host verifier keys it on
  // "gs-tenant:sig_ep" — the just-minted cookie would fail verification and a
  // hyphenated chapter's founder would be bounced to /admin/login right after
  // signup. Bind to the SAME canonical (underscore) form as getSubdomain here.
  const tenantTag = subdomain.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  let tenantPrisma: PrismaClient | null = null;
  let schemaCreated = false;
  // Rollback ownership guard: this request may DROP the schema / delete the
  // registry row ONLY if it actually reserved them. Set true immediately after
  // the atomic reservation create succeeds. A concurrent double-submit that
  // LOSES the reservation race never sets this, so it can never drop the
  // winner's live schema (the P0 #2 cross-tenant data-loss vector).
  let iOwnRegistryRow = false;
  // Whether we hold the per-subdomain advisory lock (released in `finally`).
  let advisoryLocked = false;
  // Hoisted so the outer catch can roll back any LIVE Stripe objects created
  // BEFORE the central registry row write — otherwise a failure between the
  // subscription create and the tenant.create leaves an orphaned, billing
  // customer + subscription with no tenant behind it.
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;
  let stripeRushSubscriptionId: string | null = null;

  try {
    // 0. Ensure the central registry table exists so a fresh deploy never 500s
    //    on the first signup (the public schema may lack public."Tenant" if
    //    `prisma db push` was never run against it). The DDL is hoisted into
    //    lib/tenant-bootstrap.ts and PROCESS-MEMOIZED there — it runs at most
    //    once per server instance, NOT on every signup as the inline version
    //    did. Still idempotent, so a cold instance self-heals on first signup.
    await ensureTenantRegistry();

    // Serialize concurrent provisioning of the SAME subdomain with a Postgres
    // advisory lock keyed on the normalized subdomain. A double-submit otherwise
    // interleaves two CREATE SCHEMA + seed passes into one schema. Best-effort:
    // on a pooled connection the session lock may not pin across statements, so
    // the ATOMIC reservation create below (unique constraint) is the hard
    // guarantee; the lock just narrows the interleave window. Never fatal —
    // released in the outer `finally`.
    try {
      await centralDb.$executeRawUnsafe(
        `SELECT pg_advisory_lock(hashtext($1))`,
        `onboard:${subdomain}`,
      );
      advisoryLocked = true;
    } catch {
      // Proceed unlocked — the unique reservation still prevents a double-provision.
    }

    // 1a. Fast-fail on an already-provisioned subdomain (friendly error before
    //     doing any work). NOT the security boundary — the reservation create
    //     below is, because it closes the findUnique→create race atomically.
    const existingTenant = await centralDb.tenant.findUnique({ where: { subdomain } });
    if (existingTenant) {
      return NextResponse.json({ ok: false, error: "Subdomain is already taken" }, { status: 400 });
    }

    // Pricing method + resulting subscription status — computed HERE (moved up
    // from the seed step below) because the atomic reservation row needs them.
    // See the fuller rationale on the seed-side `updates` block.
    //   monthly/semester → Base, trialing;  dues_percentage/custom/yearly → active.
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
    // Reservation trial end mirrors the final rule (custom has no trial). The
    // final, Stripe-refined value is written by the tenant.update at the end.
    const reservationTrialEndsAt =
      normalizedPlan === "custom"
        ? null
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // CARD-REQUIRED-TO-PUBLISH gate. A chapter is "billing-ready" at onboarding
    // when a REAL billing arrangement already exists, and only then does its
    // PUBLIC subdomain go live immediately:
    //   • a card is attached now (paymentMethodId present), OR
    //   • the plan is inherently billed/arranged — yearly (always charges a card
    //     today), custom (operator-negotiated), or dues_percentage ($0-upfront by
    //     design; Greekstack earns from the dues Connect fee, no card to collect).
    // A card-free MONTHLY signup is the ONE not-ready case: it is fully provisioned
    // (schema, admin, config — the founder CAN log into /admin) but its PUBLIC
    // subdomain stays dark until a card/subscription lands via the platform-billing
    // path (see app/api/platform/billing/webhook). We gate the central
    // Tenant.isActive on this below (reservation create AND final update).
    const cardProvided = Boolean(paymentMethodId);
    const billingReady =
      cardProvided ||
      normalizedPlan === "yearly" ||
      normalizedPlan === "custom" ||
      normalizedPlan === "dues_percentage";

    // 1b. RESERVE the subdomain ATOMICALLY, BEFORE any DDL or seed. The unique
    //     constraint on public."Tenant".subdomain is the race arbiter: of two
    //     concurrent double-submits, exactly one create succeeds; the other
    //     throws P2002 and returns "taken" WITHOUT ever creating a schema — so it
    //     can never DROP the winner's schema. Only after this succeeds do we own
    //     the registry row (and, next, the schema), gating the rollback below.
    //     Stripe ids + the final status/trial are filled in via tenant.update
    //     once provisioning + billing complete.
    try {
      await centralDb.tenant.create({
        data: {
          subdomain,
          name: fraternityName.trim(),
          school: (schoolName || "").trim(),
          // CARD-REQUIRED-TO-PUBLISH: live immediately only when billing-ready; a
          // card-free monthly chapter is reserved isActive=false (provisioned but
          // its PUBLIC subdomain not yet live) and published later when billing is
          // added (platform-billing webhook flips it true).
          isActive: billingReady,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionStatus,
          trialEndsAt: reservationTrialEndsAt,
          plan: normalizedPlan,
        },
      });
      iOwnRegistryRow = true;
    } catch (reserveErr: any) {
      // Lost the reservation race (or a duplicate submit) — the subdomain is
      // taken. We created NO schema, so there is nothing to roll back and, by
      // design, we never touch the winner's schema/row.
      if (reserveErr?.code === "P2002") {
        return NextResponse.json({ ok: false, error: "Subdomain is already taken" }, { status: 400 });
      }
      throw reserveErr;
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
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");
    // Parse + apply via the SHARED helper (lib/tenant-ddl). It strips full-line
    // `--` comments BEFORE splitting on `;` — load-bearing, because a comment
    // line may itself contain a semicolon (e.g. schema.sql "-- ...when rows
    // exist; with zero rows it falls back..."). Splitting first would prepend
    // the post-`;` fragment to the next CREATE TABLE as raw SQL and break EVERY
    // signup. Sharing one parser with lib/provision.ts stops the two paths from
    // drifting apart again.
    const baseUri = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
    const separator = baseUri.includes("?") ? "&" : "?";
    const tenantDbUrl = `${baseUri}${separator}schema=${schemaName}&options=-c%20search_path=${schemaName}`;
    tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } });

    try {
      await applyTenantDdl(tenantPrisma, sqlContent);
    } catch (err: any) {
      throw new Error(`Tenant DDL failed: ${err?.message || "unknown error"}`);
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

    // NOTE: `normalizedPlan` + `subscriptionStatus` are computed EARLIER now
    // (right after the subdomain reservation) because the atomic reservation row
    // needs them. The plan allowlist rationale:
    //   monthly | semester  → Base plan, billed to Greekstack → "trialing".
    //   dues_percentage     → Dues-share, $0 upfront → "active" (paying customer).
    //   custom              → Custom build (talk-to-sales) → "active", no trial.
    //   yearly              → Annual ($800/yr, incl. rush) → "active", no trial.
    // ("semester"/"dues_percentage" stay in the allowlist only for back-compat
    // round-trip safety; the live wizard offers monthly | yearly | custom.)

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
      // WHITE-LABEL DEFAULT: a brand-new chapter that doesn't pick a color in the
      // wizard starts on the GS royal-blue + gold PLATFORM identity — the SAME
      // runtime fallback app/layout.tsx uses (#2563eb / #1e40af / #eff6ff) — not
      // Phi Sig's cardinal red, which clashed with the blue marketing site and
      // rained one chapter's brand over every fresh tenant. Phi Sig keeps its red
      // via its OWN saved SiteConfig; this only changes the unconfigured default.
      "brand.primaryHex": (primaryColor || "#2563eb").trim(),
      "brand.primaryDarkHex": (darkColor || "#1e40af").trim(),
      "brand.primarySoftHex": (softColor || "#eff6ff").trim(),
      // Hero template chosen + previewed in the wizard. resolveTemplateId coerces
      // any unknown/forged value to "classic" (the renderer's own default), so the
      // launched site always renders a REAL template that matches the preview —
      // never a dropped choice that silently defaults. (Stored even for "classic"
      // so the key is present-and-explicit from day one.)
      "website.template": resolveTemplateId(
        typeof rawTemplate === "string" ? rawTemplate.trim() : undefined,
      ),
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
      // PENDING-PUBLICATION SIGNAL. "true" only for a NOT-billing-ready chapter
      // (card-free monthly), whose central Tenant.isActive is false. app/page.tsx
      // reads this to tell a pending-billing chapter (show a neutral "launching
      // soon — billing setup in progress" page) apart from an operator HARD-suspend
      // (which never carries this flag), and the platform-billing webhook clears it
      // to "false" the moment it publishes the chapter. Present-and-explicit for a
      // billing-ready chapter too so the key exists from day one.
      "billing.pendingActivation": billingReady ? "false" : "true",
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
    let finalSubscriptionStatus: string = subscriptionStatus;
    let finalTrialEndsAt: Date | null = normalizedPlan === "custom" ? null : trialEndsAt;

    const stripe = getStripe();
    // Whether this signup attaches a card right now. MONTHLY can launch WITHOUT
    // one (true free trial — the marketing's "no card required to launch"); when
    // a card IS provided we attach it so billing starts seamlessly after the
    // trial. YEARLY is an immediate $800/yr charge with no trial, so it genuinely
    // requires a card up front. `cardProvided` is also threaded into the welcome
    // email so the copy never claims "no card required" when one was charged.
    const isSubscriptionPlan = normalizedPlan === "monthly" || normalizedPlan === "yearly";
    // `cardProvided` is computed up top (it also drives the billing-ready gate).
    const requiresPayment = Boolean(stripe) && isSubscriptionPlan;

    if (requiresPayment && stripe) {
      // YEARLY requires a card (it bills $800 immediately — no trial). MONTHLY
      // does NOT: it can launch card-free on a 30-day trial, matching the
      // "no card required to launch" promise. Only YEARLY without a card is a
      // hard stop. Throwing (not a bare return) routes through the outer catch so
      // the freshly-created schema is dropped and the subdomain frees up cleanly.
      if (normalizedPlan === "yearly" && !cardProvided) {
        throw new OnboardClientError(
          `A payment method is required to launch on the Annual plan (billed immediately, no trial). Choose the Monthly plan to start your first month free with no card required.`,
          400,
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

        // 2. Attach payment method (only when the founder supplied one — a
        //    card-free MONTHLY launch skips attach/default-PM entirely).
        if (cardProvided) {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: stripeCustomerId,
          });
        }

        // 3. Set default payment method (only when a card was supplied — a
        //    card-free MONTHLY trial has no PM to set as default yet).
        if (cardProvided) {
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });
        }

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
          if (!cardProvided) {
            // CARD-FREE MONTHLY LAUNCH. The chapter goes live on a 30-day trial
            // with NO payment method. trial_settings tells Stripe what to do if
            // the trial ends and no card was ever added: CANCEL the subscription
            // (never silently attempt a charge / leave it past_due). This makes
            // the "no card required to launch" promise literally true and SAFE —
            // a chapter that never adds a card simply has its platform sub
            // cancelled at trial end (the 14-day payment-deadline messaging +
            // Admin → Billing prompt them to add one well before then).
            subParams.trial_settings = {
              end_behavior: { missing_payment_method: "cancel" },
            };
          }
        }

        const subscription = await stripe.subscriptions.create(subParams);
        stripeSubscriptionId = subscription.id;
        finalSubscriptionStatus = narrowStatus(subscription.status);
        finalTrialEndsAt = trialEndDate(subscription);

        // 6. Create secondary rush subscription if monthly — ONLY when a card was
        //    supplied. Without a default PM the rush sub couldn't bill after its
        //    trial anyway; for card-free launches the rush cycle is set up later
        //    when the chapter adds payment in Admin → Billing (mirrors the
        //    platform-billing rush add-on flow). This keeps a card-free launch to
        //    exactly ONE trialing subscription with safe end-behavior.
        if (normalizedPlan === "monthly" && cardProvided) {
          try {
            const rushPriceId = await getOrCreateStripePrice(stripe, "rush");
            const rushSub = await stripe.subscriptions.create({
              customer: stripeCustomerId,
              items: [{ price: rushPriceId }],
              metadata: { subdomain, kind: "rush_cycle" },
              description: `Greek Stack rush cycle (each semester) — ${fraternityName.trim()}`,
              trial_period_days: 30, // first month free
              payment_settings: {
                save_default_payment_method: "on_subscription",
              },
            });
            stripeRushSubscriptionId = rushSub.id;
          } catch (rushErr: any) {
            errorSink(rushErr, { route: ROUTE, tenant: subdomain, outcome: "rush_subscription_failed" });
          }
        }
      } catch (stripeErr: any) {
        logger.error("Stripe subscription setup failed", stripeErr);
        // Throw (not bare return) so the outer catch DROPs the freshly-created
        // tenant schema AND rolls back any Stripe customer/subscription already
        // created in this block before the failure. A bare return would orphan
        // the schema (CREATE SCHEMA IF NOT EXISTS would later collide on retry)
        // and leave a live Stripe customer/subscription billing the founder's
        // card with no chapter behind it. The catch surfaces this 400 + message.
        if (stripeErr instanceof OnboardClientError) {
          throw stripeErr;
        }
        throw new OnboardClientError(
          `Stripe setup failed: ${stripeErr.message || "Please check card details and try again."}`,
          400,
        );
      }
    }

    // Finalize the reserved central registry row with the Stripe results + the
    // Stripe-refined status/trial. The row already exists (atomic reservation
    // above), so this is an UPDATE — the reservation create was the race arbiter
    // and must stay first, before any DDL/seed.
    await centralDb.tenant.update({
      where: { subdomain },
      data: {
        name: fraternityName.trim(),
        school: (schoolName || "").trim(),
        // CARD-REQUIRED-TO-PUBLISH: keep the reservation's gate. A card-free
        // monthly chapter stays isActive=false (public subdomain dark) even though
        // its trialing subscription now exists; it publishes once billing is added.
        isActive: billingReady,
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
      tenant: tenantTag,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    await tenantPrisma.$disconnect();
    tenantPrisma = null;

    // Build the subdomain redirect (http on localhost, https in prod).
    const host = req.headers.get("host") || "greekstack.vercel.app";
    const isLocal = host.includes("localhost");
    const port = isLocal && host.includes("localhost:") ? `:${host.split("localhost:")[1]}` : "";
    // Canonical base domain for the redirect AND every email link below. A
    // custom-domain deploy sets APP_BASE_DOMAIN (or NEXT_PUBLIC_APP_DOMAIN);
    // otherwise derive from the ACTUAL request host so the welcome/owner emails
    // link to the real deployment instead of a hardcoded greekstack.vercel.app
    // that 404s on a custom domain. Localhost keeps the bare "localhost" base.
    const domain = isLocal
      ? "localhost"
      : (process.env.APP_BASE_DOMAIN || process.env.NEXT_PUBLIC_APP_DOMAIN || host).trim();
    const proto = isLocal ? "http" : "https";
    // A NOT-live (card-free monthly) chapter lands on /admin/billing — the "add
    // billing to publish" step — so the founder immediately sees how to take the
    // public site live. A billing-ready chapter goes straight to the dashboard.
    const redirectUrl = `${proto}://${subdomain}.${domain}${port}${
      billingReady ? "/admin" : "/admin/billing"
    }`;

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
      // A NOT-live (card-free monthly) chapter's CTA lands on the add-billing step
      // so the founder can publish; a live chapter's CTA opens the dashboard.
      const adminUrl = `https://${subdomain}.${domain}${billingReady ? "/admin" : "/admin/billing"}`;
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
      // Card-state aware so the copy NEVER claims "no card required" when one was
      // charged. Monthly: "no card required" only when the founder skipped the
      // card (true free trial); when they DID add a card we say it's saved and
      // billing starts after the free month. Yearly: a card is always required
      // (it bills $800 today, no trial), so the copy reflects an immediate charge.
      const monthlyCardClauseHtml = cardProvided
        ? `Your card is saved — you won't be charged until your <strong>first month free</strong> ends.`
        : `<strong>Your public site publishes as soon as you add a card.</strong> Add one in <strong>Admin → Billing</strong> to take your chapter live — you still won't be charged during your first free month.`;
      const billingLineHtml =
        normalizedPlan === "yearly"
          ? isPromoValid
            ? `You're on the <strong>Annual plan — $800/year</strong>. With promo code <strong>${escHtml(promoCode)}</strong> applied, you'll receive <strong>$150 off your first year</strong> ($650 total)! Your card was charged today and includes every rush-cycle fee for the year.`
            : `You're on the <strong>Annual plan — $800/year</strong>, charged today, which includes every rush-cycle fee. Full access to every feature.`
          : normalizedPlan === "custom"
          ? `Your <strong>Custom plan</strong> is active — full access to every feature, no card required. We'll be in touch to finalize the details tailored to your chapter.`
          : isPromoValid
          ? `Your <strong>first month is free</strong>. With promo code <strong>${escHtml(promoCode)}</strong> applied, you get an additional 2 months free (<strong>3 months free total</strong>)! After that it's <strong>$50/mo + $200 per rush cycle</strong> (or switch to <strong>$800/year</strong>, which includes all rush fees). ${monthlyCardClauseHtml}`
          : `Your <strong>first month is free</strong> — full access to every feature. After that it's <strong>$50/mo + $200 per rush cycle</strong> (or switch to <strong>$800/year</strong>, which includes all rush fees). ${monthlyCardClauseHtml}`;
      const monthlyCardClauseText = cardProvided
        ? "Your card is saved — you won't be charged until your first free month ends."
        : "Your public site publishes as soon as you add a card. Add one in Admin -> Billing to take your chapter live - you still won't be charged during your first free month.";
      const billingLineText =
        normalizedPlan === "yearly"
          ? isPromoValid
            ? `You're on the Annual plan — $800/year. Promo code ${promoCode} applied: $150 off your first year ($650 total). Charged today, includes all rush fees.`
            : "You're on the Annual plan — $800/year, charged today, includes all rush fees."
          : normalizedPlan === "custom"
          ? "Your Custom plan is active — full access, no card required. We'll be in touch to finalize details."
          : isPromoValid
          ? `Your first month is free. Promo code ${promoCode} applied: 3 months free total! Then $50/mo + $200 per rush cycle. ${monthlyCardClauseText}`
          : `Your first month is free — then $50/mo + $200 per rush cycle (or $800/year, which includes all rush fees). ${monthlyCardClauseText}`;
      // Live vs NOT-live (card-free monthly) copy. A not-live chapter must NEVER be
      // told "your chapter is live" / "no card required to launch"; instead the copy
      // says the PUBLIC site publishes once a payment method is added.
      const introLine1Html = billingReady
        ? `Hi ${escHtml(adminFirst)}, your chapter is live on Greekstack. 🎉`
        : `Hi ${escHtml(adminFirst)}, your Greekstack chapter is set up and ready to launch. 🎉`;
      const introLine2Html = billingReady
        ? `Everything — your public rush site, member roster, dues, events, and compliance trail — is ready to go. Sign in to your admin to finish setup and personalize your page.`
        : `Your admin, roster, dues, events, and compliance tools are all set up — sign in any time. Your <strong>public rush site</strong> goes live the moment you add a payment method, so head to <strong>Admin → Billing</strong> to publish it.`;
      const headsUpHtml = billingReady
        ? `<p style="margin:16px 0 0;padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;color:#9a3412;"><strong>Heads up:</strong> please set up payment within <strong>2 weeks</strong> of going live (by <strong>${escHtml(deadlineLabel)}</strong>) from <strong>Admin → Billing</strong>. If payment isn't set up by then, your site will be taken down — we don't want that to happen, so just add a method before the deadline and you're all set.</p>`
        : `<p style="margin:16px 0 0;padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;color:#1e40af;"><strong>One step left to go live:</strong> your public site stays private until you add a payment method in <strong>Admin → Billing</strong>. It's free for your <strong>first month</strong>, so add a card now to publish your chapter — you won't be charged today.</p>`;
      const welcomeBody = `
        <p style="margin:0 0 16px;">${introLine1Html}</p>
        <p style="margin:0 0 16px;">${introLine2Html}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #eeeef2;border-radius:10px;padding:6px 14px;">
          <tr><td style="padding:6px 0;color:#71717a;">Chapter</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escHtml(chapterDisplay)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">Plan</td><td style="padding:6px 0;text-align:right;">${escHtml(planLabel)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">Admin login</td><td style="padding:6px 0;text-align:right;">${escHtml(adminEmailAddr)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;">${billingReady ? "Your site" : "Publish at"}</td><td style="padding:6px 0;text-align:right;"><a href="${escHtml(adminUrl)}" style="color:${/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brandHex) ? brandHex : "#1F2937"};">${escHtml(subdomain)}.${escHtml(domain)}</a></td></tr>
        </table>
        <p style="margin:16px 0 0;">${billingLineHtml}</p>
        <p style="margin:16px 0 0;">Keep an eye on your inbox — <strong>Ben, the founder, will personally email you</strong> shortly to say hi and make sure you have everything you need to get going.</p>
        ${headsUpHtml}`;
      const html = renderEmail({
        brandHex,
        chapterName: chapterDisplay || fraternityName.trim(),
        chapterSubline: (schoolName || "").trim() || undefined,
        heading: "Welcome to Greekstack",
        bodyHtml: welcomeBody,
        cta: {
          label: billingReady ? "Open your admin dashboard" : "Add billing to publish your site",
          url: adminUrl,
        },
        footerNote:
          "You're receiving this because a Greekstack chapter was created with this email.",
      });
      await sendEmail({
        to: adminEmailAddr,
        subject: billingReady
          ? `Your chapter is live on Greekstack — ${chapterDisplay || fraternityName.trim()}`
          : `Add billing to publish your Greekstack chapter — ${chapterDisplay || fraternityName.trim()}`,
        html,
        text: renderEmailText({
          heading: "Welcome to Greekstack",
          lines: [
            billingReady
              ? `Hi ${adminFirst}, your chapter ${chapterDisplay} is live.`
              : `Hi ${adminFirst}, your chapter ${chapterDisplay} is set up. Add a payment method in Admin -> Billing to publish your public site.`,
            `Plan: ${planLabel}`,
            `Admin login: ${adminEmailAddr}`,
            billingReady ? `Your site: ${adminUrl}` : `Publish your site: ${adminUrl}`,
            billingLineText,
            "Keep an eye on your inbox — Ben, the founder, will personally email you shortly.",
            billingReady
              ? `Heads up: please set up payment within 2 weeks of going live (by ${deadlineLabel}) from Admin -> Billing, or your site will be taken down.`
              : `One step left to go live: your public site stays private until you add a payment method in Admin -> Billing. Your first month is free, so add a card to publish - you won't be charged today.`,
          ],
          cta: {
            label: billingReady ? "Open your admin dashboard" : "Add billing to publish your site",
            url: adminUrl,
          },
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
    // (workbenjaminsachwitz@gmail.com unless SALES_CONTACT_EMAIL is set) via the
    // shared neutral-platform sales pipeline, with replyTo set to the new admin so Ben
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
        intro: billingReady
          ? `A new chapter just launched on Greekstack. They've been told to expect a personal email from you, and that payment must be set up within 2 weeks (by ${deadlineLabel}).`
          : `A new chapter just signed up on Greekstack (card-free monthly). Their PUBLIC site is NOT live yet — it publishes automatically once they add a payment method in Admin -> Billing. They've been told to expect a personal email from you.`,
        fields: [
          { label: "Chapter", value: chapterDisplay || fraternityName.trim() },
          { label: "School", value: (schoolName || "").trim() },
          { label: "Admin name", value: (adminName || "").trim() },
          { label: "Admin email", value: adminEmailAddr },
          { label: "Plan", value: planLabelOwner },
          {
            label: "Status",
            value: billingReady
              ? "Live"
              : "Pending billing (public site not yet published)",
          },
          { label: "Promo Code", value: isPromoValid ? `${promoCode} (Applied)` : "—" },
          { label: "Instagram", value: igDisplay },
          { label: "Site", value: `${subdomain}.${domain}` },
          { label: "Payment deadline", value: deadlineLabel },
        ],
        replyTo: adminEmailAddr,
        cta: { label: "Open the chapter site", url: `https://${subdomain}.${domain}` },
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
    try {
      if (tenantPrisma) await tenantPrisma.$disconnect();
    } catch {}
    // ONLY drop the schema if THIS request created it — which is true exactly
    // when it reserved the registry row (iOwnRegistryRow). A concurrent double-
    // submit that LOST the reservation race never set iOwnRegistryRow, so it can
    // never DROP the winner's live schema (the P0 #2 cross-tenant data-loss
    // vector). Then delete the reservation row we own so the subdomain frees up.
    if (schemaCreated && iOwnRegistryRow) {
      await centralDb
        .$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`)
        .catch(() => {});
    }
    if (iOwnRegistryRow) {
      try {
        await centralDb.tenant.delete({ where: { subdomain } });
      } catch {
        // Best-effort — never mask the original provisioning error below.
      }
    }
    // Roll back any LIVE Stripe objects created before the failure. The central
    // tenant.create is the LAST write, so if we land here with a subscription or
    // customer already created, there is no tenant row referencing them — they
    // would otherwise keep billing the founder's card with no chapter behind
    // them. Cancel subscriptions first, then delete the customer (deleting a
    // customer also detaches the payment method). Each call is best-effort and
    // independently guarded so one failure doesn't skip the rest.
    try {
      const stripe = getStripe();
      if (stripe) {
        if (stripeSubscriptionId) {
          await stripe.subscriptions
            .cancel(stripeSubscriptionId)
            .catch((e: any) =>
              errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "rollback_cancel_subscription_failed" }),
            );
        }
        if (stripeRushSubscriptionId) {
          await stripe.subscriptions
            .cancel(stripeRushSubscriptionId)
            .catch((e: any) =>
              errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "rollback_cancel_rush_subscription_failed" }),
            );
        }
        if (stripeCustomerId) {
          await stripe.customers
            .del(stripeCustomerId)
            .catch((e: any) =>
              errorSink(e, { route: ROUTE, tenant: subdomain, outcome: "rollback_delete_customer_failed" }),
            );
        }
      }
    } catch (rollbackErr: any) {
      errorSink(rollbackErr, { route: ROUTE, tenant: subdomain, outcome: "stripe_rollback_failed" });
    }
    // A deliberate client-facing validation error (e.g. missing payment method
    // discovered after schema creation) surfaces its own status + message — the
    // rollback above already cleaned up the schema/Stripe objects.
    if (err instanceof OnboardClientError) {
      return NextResponse.json(
        { ok: false, error: err.clientMessage },
        { status: err.status },
      );
    }
    // Real error already captured server-side via errorSink above; never echo
    // the internal message (DDL/SQL/schema detail) back to the client.
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  } finally {
    // Release the per-subdomain advisory lock. Best-effort (a pooled session may
    // no-op); never throws so it can't mask the response above.
    if (advisoryLocked) {
      await centralDb
        .$executeRawUnsafe(`SELECT pg_advisory_unlock(hashtext($1))`, `onboard:${subdomain}`)
        .catch(() => {});
    }
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
