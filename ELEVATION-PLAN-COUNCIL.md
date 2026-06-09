# GreekStack — Elevation Plan (Council Synthesis)

> **Vision:** Turn GreekStack from a manually-provisioned, single-template chapter app into a self-serve, multi-tenant SaaS a fraternity/sorority chapter can buy, provision, and run the same day.
> **North star:** market-ready on five axes — multi-tenancy, billing, onboarding, a real chapter-website generator, scalability, and a repeatable go-to-market motion.

_Synthesized 2026-06-09 from 3 expert lenses (23 ideas), deduped to 9 workstreams. Every file path below was verified against the repo at `C:\Users\Bensa\working code\projects\greek-stack`._

---

## Context (verified current state)

- `app/api/platform/tenants/route.ts` is **GET-only** — there is no programmatic provisioning. New chapters require Ben to hand-run `scratch/test-ddl.mjs` / `scratch/_setup_phisig.mjs`.
- The marketing landing (`app/page.tsx`, `components/site/marketing-landing.tsx`) promises *"live the same day, first month free, no credit card"* — but `app/(marketing)/get-started` **does not exist**. The promise has no front door.
- Billing primitives exist (`lib/platform-billing.ts`: `PLATFORM_TRIAL_DAYS = 30`, plans, `trial_period_days`, Stripe) and central tenant columns (`stripeSubscriptionId / subscriptionStatus / trialEndsAt / plan`) — but nothing creates a tenant row or starts the trial clock.
- `lib/prisma.ts` already exposes `getTenantClient()` (schema-per-tenant) and `forEachTenant()` — the multi-tenant plumbing is in place; provisioning is the gap.
- Bid acceptance (`app/api/bid/[token]/route.ts`) is a bare `POST {choice}` that flips `Rush.status` with one `AuditLog` row — **no signature, no consent artifact**.
- `components/site/chapter-landing.tsx` is a single **1,493-line fixed layout**; `components/site/rush-form.tsx` is a single **1,045-line hardcoded form**. Neither is configurable beyond `SiteConfig` key/values.
- `@formio/react`, `cmdk`, `meilisearch`, `pdfme` are **NOT yet dependencies**. `@vercel/blob`, `framer-motion`, `stripe` already are.

---

## P0 — Ship-blockers (no sellable SaaS without these)

### P0.1 — Self-serve signup → instant schema provisioning (the missing front door)
**What:** A public 3-step wizard that creates a paying tenant and its schema with zero human intervention. This is the single change that turns the product from "Ben runs DDL" into "a chapter buys it." Everything else is downstream of this.

**How:**
1. Build `app/(marketing)/get-started/page.tsx` as a 3-step wizard: (a) chapter name + Greek letters + school via existing `components/site/school-org-picker.tsx` + `lib/schools.ts`; (b) subdomain availability check against `lib/reserved-subdomains.ts`; (c) admin email/password.
2. Add **`POST` to `app/api/platform/tenants/route.ts`** that, in one transaction: inserts `public.Tenant` (plan `monthly`, `subscriptionStatus 'trialing'`, `trialEndsAt = now + PLATFORM_TRIAL_DAYS`); runs `CREATE SCHEMA schema_<sub>` and applies the Prisma schema to it; seeds `OfficerPosition` + `SiteConfig` defaults; creates the first `Brother(role=ADMIN)` via `lib/password.ts`.
3. **Extract the DDL out of `scratch/test-ddl.mjs` into a reusable `lib/provision.ts`** (single source of truth; scratch scripts become thin callers). Use `getTenantClient()` for seed writes.
4. Redirect to `https://<sub>.greekstack.vercel.app/admin/setup` (the setup wizard at `app/admin/setup` already exists).

**Enabler:** `saasternity` (harvest the get-started UI shell); `multitenant-saas-platform` skill (schema-per-tenant provisioning pattern). Existing local pattern: `nextjs-roleaware-portal`.

---

### P0.2 — Close the billing loop: trial → paid conversion + lifecycle states
**What:** P0.1 starts a 30-day trial but nothing **converts** it. A SaaS that can't take money on day 31 isn't market-ready. Add the Stripe Checkout-after-trial path and make tenant access reflect billing state. (Implied by `platform-billing.ts` having trial logic with no checkout/dunning consumer.)

**How:**
1. Add `POST /api/platform/billing/checkout` that creates a Stripe Checkout Session for the tenant (reuse `lib/platform-billing.ts` plan constants + `trial_period_days`), and a `/admin/billing` "Add payment method / Subscribe" CTA (the `app/admin/billing` page already exists — wire it to live state).
2. Handle `customer.subscription.updated/deleted` + `invoice.payment_failed` in `app/api/webhooks` (the dues webhook pattern in `app/api/dues/webhook/route.ts` is the template); write `subscriptionStatus` back to the central `Tenant` row.
3. Gate access in `middleware.ts` / `lib/entitlement.ts`: `trialing`/`active` → full; `past_due` → grace banner; `canceled`/`unpaid` → read-only lockout. **Fail-closed for billing**, fail-open is for entitlement features only.

**Enabler:** `stripe` skill (`stripe:stripe-best-practices`, `stripe:test-cards`); `saasternity` (billing shell).

---

### P0.3 — Real e-signed bid acceptance + liability / anti-hazing waivers
**What:** A bid is a binding membership offer and events serve alcohol — chapters need provable, timestamped, signed consent, not a click. This is a concrete trust/legal feature chapters will pay for, and the spec already maps Documenso to "bid acceptance, liability, alumni."

**How:**
1. Add `lib/esign.ts` wrapping a Documenso self-host (or its API) — a reusable "document to sign" module.
2. On `app/bid/[token]/page.tsx` add a typed-signature field + "I accept" affirmation. On `POST` (`app/api/bid/[token]/route.ts`), generate a signed acceptance PDF, store it in **Vercel Blob (already a dep)** with consent version, IP (already truncated to /24 in `lib/notify.ts`), and timestamp on the Rush record.
3. Reuse the module for: liability/anti-hazing waiver at onboarding (`app/onboard/onboard-wizard.tsx`, where `chapter.antiHazing` already lives) and alumni media-release (`app/alumni/onboard`). Surface signed docs in `app/admin/library` (the `Document` model already exists).

**Enabler:** `documenso_skill`; `pdfme` + the **PDF Tools MCP** (offline render/stamp/merge the signed artifact).

---

## P1 — Flagship sellable features (the demo wins; the product feels best-in-class)

### P1.1 — Chapter-website generator (turn the fixed landing into a section builder)
**What:** The ship goal says "chapter-website generator," but today it's a re-skin of one 1,493-line layout. Make "website generator" literally true: add/remove/reorder sections, extra pages, layout choices. This is the difference between "branded template" and the Wix/Squarespace replacement chapters actually want.

**How:**
1. Add a `Section` model per tenant (`type` enum `HERO|STATS|GALLERY|TIMELINE|FAQ|PHILANTHROPY|TESTIMONIAL|CTA|CUSTOM_HTML`, `order int`, `props JSON`, `published bool`). _Note: no `Section` model exists today — net-new._
2. Refactor `chapter-landing.tsx` to render an **ordered list of section components** — extract each existing in-file block into `components/site/sections/*`.
3. Build `/admin/website` as a drag-to-reorder editor (**framer-motion already a dep, used in 17 files**) with live preview + add/hide/duplicate.
4. **Seed the current ~50 `SiteConfig` keys as defaults** so existing chapters (Phi Sig) render byte-identical. Add a `generateMetadata`-backed dynamic `[page]` route for extra pages (`/philanthropy`, `/rush-week`).

**Enabler:** `react-bits` + `GlowUI` + `saasternity` (drop-in animated section blocks); `design-motion-principles` skill (reorder/reveal motion).

---

### P1.2 — Drag-and-drop rush/intake form builder
**What:** Rush is one hardcoded 1,045-line form — every chapter gets identical fields. Chapters need custom questions (legacy, GPA, referral, dietary, interview availability); nationals need standardized intake. A no-code form builder is among the most-requested SaaS features and feeds the existing recruitment pipeline (`lib/rush-pipeline.ts`).

**How:**
1. Add `FormDef` + `FormSubmission` models per tenant (`schema JSON`).
2. Use the **MIT `@formio/react` renderer client-side** (new dep), POSTing to a generic `/api/forms/[slug]/submit` that writes `FormSubmission` and — for the rush form type — **still creates the `Rush` row and fires the existing TCPA consent path** (`lib/tcpa.ts`, `RushConsent` model). Preserve the legal/consent flow exactly.
3. Build `/admin/forms` as the drag-drop builder. **Keep `rush-form.tsx` as the default seeded form** so nothing breaks. Wire submissions into the rush funnel viz + Pipedrive pipeline.

**Enabler:** `formio-forms-platform-reference` skill (builder + JSON-schema renderer, render client-side + POST to own route).

---

### P1.3 — Global Cmd+K command palette + Meilisearch (members/events/dues/docs)
**What:** Officers juggle ~20 admin areas (`app/admin/*`); there is zero search today. Fast, typo-tolerant Cmd+K is the single biggest "this feels best-in-class" moment for power users and a strong sales demo.

**How:**
1. Stand up a **tenant-scoped Meilisearch index** (members/events/dues/documents/announcements), populated on mutation via the existing **`lib/notify.ts` `auditAndNotify` chokepoint** (every write funnels there) and backfilled by a `forEachTenant` cron (`lib/prisma.ts` + `app/api/cron`).
2. Build a **`cmdk`-based palette** (new dep) in `components/ui` merging (a) search results and (b) an action catalog from the existing `lib/actionMap.ts` + `lib/officer-nav.ts`, role-gated via `lib/officer-permissions.ts`. Mount in the admin shell.
3. **Server-side master key; search-only key to the client.**

**Enabler:** `meilisearch-search` skill.

---

### P1.4 — Rush drip campaigns + branded PDF receipts/statements (close comms + finance)
**What:** Two gaps a paying chapter notices fast. (1) No rush **drip nurture** — recruitment conversion lives on follow-up. (2) Dues "receipts" are just the Stripe `receipt_url` — no branded PDF for the chapter's books or for parents. Both are specced (Mautic/listmonk; pdfme).

**How:**
- **Comms:** Add `Campaign` + `CampaignStep` models + a scheduled sender on the existing `app/api/cron` + `lib/scheduled-announcements.ts` infra; segment off `Rush.status` funnel stages. Keep Resend (`lib/email.ts`, `EmailLog`) + template steps with `react-email`, or self-host listmonk for blasts.
- **Finance:** Add `lib/dues-receipt.ts` using **pdfme** (new dep) to render a branded PDF (identity from `lib/chapter-identity.ts`), attach to the best-effort receipt email in `app/api/dues/webhook/route.ts`, and add a "Download receipt/statement" action in `app/portal` (`PortalDuesPayment`).

**Enabler:** `react-email` skill (templated steps); `pdfme-document-generator` skill + PDF Tools MCP.

---

## P2 — Scale & go-to-market hardening

### P2.1 — Multi-tenant scalability & operability
**What:** Schema-per-tenant works, but selling means N tenants — provisioning, migrations, and crons must scale and be observable.
**How:** Make `lib/provision.ts` idempotent + transactional (rollback partial schema on failure). Add a **tenant-migration runner** (apply Prisma schema deltas across all schemas via `forEachTenant`) so feature ships don't require manual DDL. Add a platform-ops view in `app/platform` (tenant list, plan, status, last-active, MRR). Confirm every cron uses `forEachTenant` (no-Host job context — see `getTenantClient`). Add structured logging (`lib/logger.ts`) + error tracking (Sentry skill) per tenant.
**Enabler:** `multitenant-saas-platform` skill; `sentry` skill.

### P2.2 — Go-to-market: marketing site, pricing, SEO, sales collateral
**What:** A buy button needs traffic and a story. `SALES.md` / `WHITE-LABEL.md` exist — operationalize them.
**How:** Add a public pricing page wired to `PLATFORM_PLANS`; per-section marketing blocks (P1.1 library doubles here); `generateMetadata` SEO + JSON-LD on marketing routes (`searchfit-seo` / `openalternative` patterns). Build a "request a demo" form (Form.io) → Pipedrive (`lib/rush-pipeline.ts` pattern) / Apollo sequence. Cookieless analytics (Plausible skill — no cookie banner). Seed-data demo tenant for live sales walkthroughs (`lib/sample-data.ts`).
**Enabler:** `plausible-analytics`, `searchfit-seo`, `apollo`/`sales` skills.

### P2.3 — Trust, compliance & polish pass
**What:** The "finished consumer app" bar + the legal posture chapters/nationals expect.
**How:** Run `nextjs-polish-sweep` + `design-motion-principles` audit across admin + chapter site (4-state, reduced-motion, breakpoints, touch). Centralize signed docs (P0.3) into an audit-ready library. Verify TCPA (`lib/tcpa.ts`) + consent versioning on every public form. Per-tenant data-export (GDPR/offboarding) via existing `lib/hq-exports.ts`. Run `security-review` on the new provisioning + billing + form-submit routes (untrusted public input + tenant-scope leakage are the risk surfaces).
**Enabler:** `nextjs-polish-sweep`, `design-motion-principles`, `security-review`, `code-review` skills.

---

## Definition of Done — MARKET-READY SaaS

**Multi-tenancy**
- [ ] `POST /api/platform/tenants` provisions schema + seeds + first admin in one transaction (P0.1)
- [ ] DDL lives in reusable `lib/provision.ts`, not `scratch/*` (P0.1)
- [ ] Tenant-migration runner applies schema deltas across all schemas with no manual DDL (P2.1)
- [ ] Every cron + job runs through `forEachTenant` / `getTenantClient` (no Host-dependent context) (P2.1)
- [ ] Tenant-scope leakage check passes on all new public routes (P2.3)

**Billing**
- [ ] Trial clock starts on signup (`trialEndsAt = now + 30d`) (P0.1)
- [ ] Stripe Checkout converts trial → paid; payment method capturable in `/admin/billing` (P0.2)
- [ ] `subscriptionStatus` lifecycle (trialing/active/past_due/canceled) drives access in middleware, fail-closed (P0.2)
- [ ] `subscription.*` + `invoice.payment_failed` webhooks write back to the Tenant row (P0.2)

**Onboarding**
- [ ] Public `app/(marketing)/get-started` 3-step wizard exists and ends in a working chapter (P0.1)
- [ ] Subdomain availability checked against `reserved-subdomains.ts` (P0.1)
- [ ] First admin lands in `/admin/setup` with seeded defaults; "live the same day" is literally true (P0.1)
- [ ] E-signed waiver collected at member onboarding (P0.3)

**Chapter-site generator**
- [ ] Sections are add/remove/reorderable via `/admin/website`; extra pages supported (P1.1)
- [ ] Existing chapters render byte-identical from seeded `SiteConfig` defaults (P1.1)
- [ ] Chapters can build custom rush/intake forms without code; TCPA path preserved (P1.2)

**Scalability**
- [ ] Provisioning is idempotent + rolls back partial failures (P2.1)
- [ ] Platform-ops dashboard shows tenant list, plan, status, MRR (P2.1)
- [ ] Per-tenant structured logging + error tracking (P2.1)
- [ ] Cmd+K + Meilisearch indexes scale per-tenant (master key server-only) (P1.3)

**Sales / go-to-market**
- [ ] Public pricing page wired to `PLATFORM_PLANS` (P2.2)
- [ ] "Request a demo" form → CRM/sequence; seed-data demo tenant for walkthroughs (P2.2)
- [ ] SEO metadata + JSON-LD + cookieless analytics live on marketing routes (P2.2)
- [ ] Signed bid acceptance + branded PDF receipts demoable as trust features (P0.3, P1.4)

**Quality gate (every workstream)**
- [ ] `tsc` clean · vitest green · `next build` passes before any deploy
- [ ] Polish + motion audit + security-review on new surfaces (P2.3)
- [ ] No deploy without approval (per standing directive)
