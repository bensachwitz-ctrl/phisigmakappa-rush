# R43-A Builder Report — Dues Payment v1 (Stripe Checkout)

**Branch:** `claude/nice-neumann-9722d9`
**Date:** 2026-05-13
**Architect reference:** `reports/v43.0.0/01-architect-report.md`

## Scope delivered

Pure-additive Stripe Checkout integration on top of the existing
`Brother.duesPaid` boolean. Zero behavior change for chapters that do
not opt in. Reference deploy (Phi Sig USC) keeps rendering exactly as
today because `dues.enabled` defaults to `"false"`.

## Files added

| Path | Purpose |
|---|---|
| `lib/stripe.ts` | Stripe SDK helper — `getStripe()` returns `null` when `STRIPE_SECRET_KEY` is missing (graceful degrade). `applyPassThrough()` computes brother-facing total when chapter elects to pass the 2.9% + 30¢ fee. |
| `app/api/dues/checkout/route.ts` | POST — brother-authed. Creates Stripe Checkout session + PENDING DuesPayment row. 4-prereq gate returns 503 with treasurer fallback when missing. Rate-limited 5/min/brother. |
| `app/api/dues/webhook/route.ts` | POST — public, signature-verified. Handles `checkout.session.completed` (idempotent, flips Brother + DuesPayment), `checkout.session.expired`, `payment_intent.payment_failed`. Logs via direct AuditLog write with `actorName: "stripe-webhook"`. |
| `app/api/dues/me/route.ts` | GET — brother-authed. Returns current dues state + last 5 DuesPayments for the signed-in brother. |
| `app/admin/dues/success/page.tsx` | Stripe success redirect lands here. Shows PAID / PENDING / unknown states based on lookup by `stripeSessionId`. |

## Files modified

| Path | Change |
|---|---|
| `prisma/schema.prisma` | Brother: + 5 nullable fields (`duesAmountCents`, `duesYear`, `duesPaidAt`, `duesPaymentMethod`, `duesPaymentId`) and `duesPayments DuesPayment[]` relation. New `DuesPayment` model with `stripeSessionId @unique` for webhook idempotency. |
| `lib/site-config.ts` | + 8 dues.* DEFAULTS keys (enabled, amountCents, currency, year, stripePublishableKey, stripeWebhookSecret, passThroughFee, label). |
| `app/admin/brothers/page.tsx` | Reads dues cfg and passes `duesConfig` prop to `BrothersManager`. |
| `components/admin/brothers-manager.tsx` | New `payDues()` handler + brother-facing "Pay $X dues" button on own card when `duesConfig.enabled && !duesPaid && b.id === currentBrotherId`. |
| `components/admin/settings-manager.tsx` | New "Dues collection (Stripe)" section with all 8 fields. Webhook secret rendered as `type="password"`. Inserted after Brand colors. |
| `app/api/admin/brothers/route.ts` | When admin PATCH toggles `duesPaid: true`, ALSO writes a `DuesPayment` row with `method: "MANUAL"`, `status: "PAID"` and updates Brother dues* metadata. Emits `DUES_PAID_MANUAL` audit. Best-effort try/catch so the existing flow still works if the new table is unmigrated. |
| `app/api/admin/settings/route.ts` | If any `dues.*` key is touched, emits dedicated `DUES_SETTINGS_CHANGED` audit row (in addition to the existing `SETTINGS_UPDATED`). Key NAMES logged, values are NOT. |
| `components/admin/audit-client.tsx` | Added 6 DUES_* cases to `humanAction()` + `DUES` prefix → CreditCard/emerald icon in `ActionIcon`. |
| `components/admin/recent-activity.tsx` | Same 6 cases in `humanVerb()` + icon mapping. |
| `package.json` | + `stripe` + `@stripe/stripe-js` dependencies (via `npm install`). |

## Architecture decisions

- **DuesPayment.stripeSessionId @unique** — chosen as the webhook
  idempotency key (architect-recommended). Replay of a
  `checkout.session.completed` for an already-PAID row is a clean
  early-return.
- **Webhook signature verification mandatory in production.** Dev
  graceful-degrades when `STRIPE_SECRET_KEY` is missing (503 on the
  webhook handler) so no path mutates state without
  `stripe.webhooks.constructEvent` succeeding.
- **STRIPE_SECRET_KEY env-var only.** Architect explicitly called this
  out — keeps it out of DB dumps, audit detail fields, and the
  `/admin/help` page. The publishable key is fine in `SiteConfig`
  because it's literally public.
- **Webhook actor = "stripe-webhook"** — direct `prisma.auditLog.create`
  inside webhook handlers bypasses `audit()`'s actor resolution because
  there's no admin cookie on a Stripe POST. Chapter sees a clear
  distinction between admin actions and system-confirmed payments.
- **PaymentIntent fetch for receiptUrl.** Stripe's
  `checkout.session.completed` event doesn't include the receipt URL
  directly; we expand `latest_charge` on the PaymentIntent to get it.
  Best-effort — if Stripe's API errors during this fetch, the payment
  still settles, the brother just loses a clickable receipt link.
- **In-memory rate limiter on checkout.** 5/min/brother. Architect
  flagged this as a v1 requirement; multi-instance Vercel deploys
  would want Redis-backed eventually, but for a single-tenant chapter
  this is sufficient and avoids a new dependency.
- **`payDues` short-circuit on already-paid.** `/api/dues/checkout`
  returns 409 if the brother already has a PAID DuesPayment for the
  current `dues.year`. Prevents duplicate charges if the UI shows a
  stale state.

## Graceful degrade contract (verified)

The "show Pay button + create session" decision tree:

```
dues.enabled === "true"
  AND cfg["dues.stripePublishableKey"] != ""
  AND cfg["dues.stripeWebhookSecret"] != ""
  AND process.env.STRIPE_SECRET_KEY exists  (server-side only)
→ brother sees "Pay $150 dues" → /api/dues/checkout 200 OK → Stripe redirect
→ otherwise: button HIDDEN client-side, AND endpoint returns 503 with
  "Online dues not configured. Pay manually via your chapter treasurer."
```

Reference deploy (Phi Sig USC) defaults satisfy:
- `dues.enabled = "false"` → button never renders, all existing flows untouched.

## Type-check

```
$ npx tsc --noEmit
EXIT=0
```

Clean. No warnings.

## Not done (out of scope per task brief)

- Schema migration file — relying on `prisma db push --accept-data-loss --skip-generate` in the build script (already in package.json).
- DUES.md whitelabel doc — architect mentioned as a future companion to WHITE-LABEL.md, not in R43-A scope.
- "Test webhook" admin button + dashboard "Dues readiness" tile — architect surfaced these as "nice-to-have", not in R43-A spec.
- Brother profile receipt link UI inside BrothersManager — the success-page does show it post-Stripe redirect, but a permanent "View receipt" link on the brother's own card would benefit from a dedicated brother-profile page (likely R43-B / future).
- Email receipt via Resend — Stripe sends its own hosted receipt by default; integrating chapter-branded Resend email was architect-tagged as v44+.

## Commit

Local commit only (orchestrator will batch-push with R43-B and R43-C).
