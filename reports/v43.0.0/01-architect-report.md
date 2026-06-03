# V43 Architect Report — Dues Payment Acceptance

**Scope:** Add real payment acceptance to the existing "dues paid / unpaid"
toggle so a chapter can collect dues through the platform. Single-tenant per
deploy, white-label friendly, graceful degrade to manual-only when a chapter
has not configured a payment processor.

**Non-goals:** Centralized billing, refunds workflow, partial payments,
payment plans, ACH. All v44+.

---

## 1. Recommendation — Stripe Checkout (hosted)

**Choose Stripe Checkout, not Payment Links, not Square.**

| Option | Verdict | Why |
|---|---|---|
| **Stripe Checkout (hosted session)** | **PICK** | Per-session amounts (each brother owes a different total once late fees / pledge-class adjustments land in v44+), passes metadata (`brotherId`, `duesYear`), success/cancel URLs we control, full webhook coverage, PCI scope = SAQ-A (lowest possible — we never touch card data). |
| Stripe Payment Links | Reject | Static amount per link. Can't tie a payment to a specific brother without per-brother link generation, which is just Checkout sessions with extra steps. |
| Stripe Elements / custom card form | Reject | Pulls us into SAQ-D PCI scope. Hard no for a volunteer-run chapter ops platform. |
| Square / PayPal | Reject for v43 | Worse webhook story, weaker test mode, smaller dev pool. Revisit only if a chapter explicitly requests it. |

The chapter's Stripe account holds the funds. **We never touch money** — the
platform is a thin orchestrator between brother → Stripe → audit log.

**Fee handling:** default to **pass-through** (brother pays the 2.9% + 30¢ on
top). One cfg flag lets a chapter absorb it instead. Configurable, not opinionated.

---

## 2. Schema changes (`prisma/schema.prisma`)

### Brother — additive fields (no breaking changes)

```prisma
model Brother {
  // ...existing...
  duesPaid           Boolean   @default(false)     // keep — manual override + denormalized flag
  duesAmountCents    Int?                          // null = use cfg default; per-brother override
  duesYear           String?                       // "2026-FA" — academic period this row covers
  duesPaidAt         DateTime?                     // null until paid (Stripe or manual)
  duesPaymentMethod  String?                       // "STRIPE" | "MANUAL" | "CASH" | "CHECK" | "VENMO"
  duesPaymentId      String?                       // FK-ish to DuesPayment.id when STRIPE
  // ...existing...
  duesPayments       DuesPayment[]
}
```

`duesPaid` stays as the canonical boolean — every existing UI keeps working
unchanged. The new fields are metadata layered on top.

### New: `DuesPayment` table — payment history

```prisma
model DuesPayment {
  id                  String   @id @default(cuid())
  brotherId           String
  duesYear            String                       // "2026-FA"
  amountCents         Int                          // what brother was charged (incl. fee if pass-through)
  baseAmountCents     Int                          // what the chapter receives after fees
  currency            String   @default("usd")
  // Stripe linkage — null only for MANUAL/CASH/CHECK rows
  stripeSessionId     String?  @unique             // cs_live_... — idempotency key
  stripePaymentIntent String?  @unique
  stripeCustomerEmail String?
  // State machine: PENDING → PAID | FAILED | EXPIRED | REFUNDED
  status              String   @default("PENDING")
  method              String                       // "STRIPE" | "MANUAL" | "CASH" | "CHECK" | "VENMO"
  notes               String?                      // admin free-text for non-Stripe rows
  receiptUrl          String?                      // Stripe's hosted receipt
  paidAt              DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @default(now()) @updatedAt

  brother             Brother  @relation(fields: [brotherId], references: [id], onDelete: Cascade)

  @@index([brotherId, duesYear])
  @@index([status, createdAt])
}
```

**Why a separate table:** lets us record multiple historical payments per
brother (one per year), supports failed-then-retried attempts without
clobbering, gives admin a real ledger view, and survives `Brother.duesPaid`
being toggled manually.

---

## 3. Config additions — `lib/site-config.ts` DEFAULTS

```ts
// ── DUES PAYMENTS (admin-editable, optional) ────────────────────────
"dues.enabled": "false",                // master switch — false until admin configures
"dues.amountCents": "30000",            // $300 default
"dues.currency": "usd",
"dues.period": "2026-FA",               // label stamped on each new payment row
"dues.passThroughFees": "true",         // brother pays Stripe fee; if false, chapter absorbs
"dues.stripePublishableKey": "",        // pk_live_... — admin pastes in /admin/settings
"dues.stripeWebhookSecret": "",         // whsec_... — admin pastes after creating webhook
"dues.successCopy": "You're paid for {period}. A receipt is on its way.",
"dues.descriptor": "PSK Gamma Triton Dues",  // shows on credit card statement (≤22 char)
"dues.contactForQuestions": "treasurer@phisig-usc.com",
```

**Stripe secret key** lives in `process.env.STRIPE_SECRET_KEY` (per-deploy
env var), **not** in `SiteConfig`. Rationale: it never appears in DB dumps,
admin help page exports, or `/admin/audit`. The publishable key is fine in
cfg — it's literally the public half.

---

## 4. Endpoint plan

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `POST /api/dues/checkout` | POST | Create Stripe Checkout session for the calling brother. Returns `{ url }` for client redirect. | Brother session (logged-in) |
| `POST /api/dues/webhook` | POST | Stripe webhook receiver. Signature-verified. Idempotent on `stripeSessionId`. | Stripe signature only |
| `GET /api/dues/[brotherId]` | GET | Return payment history for one brother. | Self OR admin |
| `PATCH /api/admin/brothers` | PATCH | Existing — admin marks paid manually. Now also writes a `DuesPayment` row with `method: "MANUAL"`. | Admin |

### `/api/dues/checkout` shape

1. Resolve brother from session (must match `brotherId` in body, or be admin).
2. Read cfg: amount, currency, descriptor, period, fee policy.
3. If `dues.enabled === "false"` or no `STRIPE_SECRET_KEY` → 503 with message
   "Online dues not configured — contact your treasurer."
4. Create `DuesPayment` row in `PENDING` state.
5. Call Stripe `checkout.sessions.create` with:
   - `mode: "payment"`, `payment_method_types: ["card"]`
   - `metadata: { brotherId, duesPaymentId, duesYear }`
   - `success_url: ${SITE_URL}/brother?dues=success&id={duesPaymentId}`
   - `cancel_url: ${SITE_URL}/brother?dues=cancel`
   - `customer_email: brother.email`
   - `line_items[0].price_data.unit_amount` = base + (fee if pass-through)
   - `statement_descriptor_suffix: cfg["dues.descriptor"]`
6. Persist `stripeSessionId` on the DuesPayment row.
7. Return `{ url: session.url }`.

### `/api/dues/webhook` shape

1. Verify signature with `cfg["dues.stripeWebhookSecret"]` via
   `stripe.webhooks.constructEvent(body, sig, secret)`. **Reject 400** if it
   fails — no DB writes.
2. Switch on `event.type`:
   - `checkout.session.completed` → upsert by `stripeSessionId`. Idempotent.
     Set `status: "PAID"`, `paidAt`, `receiptUrl`, `stripePaymentIntent`.
     Flip `Brother.duesPaid = true`, set `duesPaidAt`, `duesPaymentMethod = "STRIPE"`.
     Write audit row. Send receipt email via existing Resend integration.
   - `checkout.session.expired` → set `status: "EXPIRED"`.
   - `charge.refunded` → set `status: "REFUNDED"`, `Brother.duesPaid = false`.
3. Return `200` even when the event type is one we ignore — Stripe needs
   the 2xx to stop retrying.

**Idempotency:** every state mutation keys off `stripeSessionId @unique`.
Stripe will retry webhooks; the second-arrival just no-ops.

---

## 5. UI plan

### Brother-facing (`/brother` profile card)

Add a "Dues" block on the brother's own profile card. Three visual states:

- **Paid** — green chip, "Paid {date} — View receipt" link (opens `receiptUrl`).
- **Unpaid, online enabled** — "Pay $300 dues" button → POSTs `/api/dues/checkout` → redirects to Stripe.
- **Unpaid, online disabled** — neutral chip "Dues unpaid — contact treasurer at {cfg.contactForQuestions}". No payment button.

Returning from Stripe success URL shows a one-time toast: "You're paid for
{period}. A receipt is on its way." Reads from `cfg["dues.successCopy"]`.

### Admin-facing (`brothers-manager.tsx`)

- **No removals.** The existing `quickToggleDues` click-the-badge admin shortcut stays — it's the fallback channel for cash/check/Venmo payments.
- **Add:** admin clicks a paid badge → opens a small "Payment details" popover showing all `DuesPayment` rows for that brother. Each row shows method + date + amount + receipt link.
- **Add:** `/admin/settings` gets a "Dues & Payments" section with the eight cfg keys above, plus a one-time "Test webhook" button.

### Setup wizard

Add a new optional step (skippable) — "Accept dues online?" — between
"Contact" and "Anti-hazing". Three fields: amount, currency, Stripe
publishable key. If left blank → `dues.enabled` stays `"false"` and the
platform behaves exactly as it does today.

---

## 6. Audit hooks

Reuse `lib/audit.ts`. Six new actions:

| Action | When | Details field example |
|---|---|---|
| `DUES_CHECKOUT_STARTED` | `/api/dues/checkout` returns a session | `"Started Stripe checkout for $300 (2026-FA)"` |
| `DUES_PAID` | webhook `checkout.session.completed` | `"$300 via Stripe (cs_live_xxx)"` |
| `DUES_PAID_MANUAL` | admin toggles badge → paid | `"Marked paid manually by admin (shared)"` |
| `DUES_REFUNDED` | webhook `charge.refunded` | `"Refunded $300 — Stripe pi_xxx"` |
| `DUES_FAILED` | webhook `checkout.session.expired` or `payment_failed` | `"Session expired before payment"` |
| `DUES_SETTINGS_CHANGED` | admin saves dues.* cfg keys | `"amountCents: 25000 → 30000"` |

`subjectType: "Brother"`, `subjectId: brotherId`, `subjectName: brother.name`.
Webhook-triggered rows write `actorName: "stripe-webhook"`.

---

## 7. White-label posture

**Graceful degrade is the design.** A chapter that has NOT configured Stripe
sees the platform behave exactly as today: admin manually marks brothers
paid. No broken buttons, no nags.

The decision tree any "show payment UI?" check runs:

```
dues.enabled === "true"
  AND cfg["dues.stripePublishableKey"] != ""
  AND process.env.STRIPE_SECRET_KEY exists
  AND cfg["dues.stripeWebhookSecret"] != ""
→ show "Pay dues" button to brothers
→ otherwise: manual-only mode
```

For a new chapter to enable payments:

1. Create their own Stripe account (free — 10 minutes).
2. Get publishable key → paste into `/admin/settings`.
3. Add `STRIPE_SECRET_KEY` env var in Vercel.
4. Create webhook in Stripe pointing at `https://chapter.example.com/api/dues/webhook` listening to `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`.
5. Paste webhook signing secret into `/admin/settings`.

Document this as `DUES.md` alongside `WHITE-LABEL.md` (separate doc — not
required reading for chapters skipping online dues).

Add a "Dues readiness" tile to the existing dashboard brand-readiness banner
so the e-board sees at a glance whether all four bits are configured.

---

## 8. Security posture

- **Webhook signature verification is mandatory.** No code path mutates a
  `DuesPayment` from a webhook without `stripe.webhooks.constructEvent`
  succeeding first. Drop bad signatures with 400 and an audit row.
- **Idempotency** via `stripeSessionId @unique` — Stripe retries are safe.
  Re-processing a `checkout.session.completed` for an already-`PAID` row is
  a no-op (early-return after upsert detection).
- **Authorization on `/api/dues/checkout`:** the calling brother's session
  ID must match the `brotherId` they're paying for. Admin can pay for
  another brother (rare, but legit — collecting at chapter meeting on
  someone's behalf).
- **Authorization on `GET /api/dues/[brotherId]`:** self OR admin. Brothers
  cannot snoop on each other's payment history (privacy + audit principle).
- **Secret hygiene:** `STRIPE_SECRET_KEY` is env-var only — never in DB,
  never logged. The existing `/admin/help` page redaction (commit 65d68a4)
  must be extended to redact `STRIPE_SECRET_KEY` and `dues.stripeWebhookSecret`.
- **PCI scope:** Stripe Checkout is SAQ-A. We never see PAN, CVC, or
  expiry. Card data goes directly browser → Stripe.
- **Brother-facing receipt** is Stripe's own hosted `receiptUrl` — no
  custom PDF generation, no liability exposure.
- **Rate-limit `/api/dues/checkout`** per brother (5/min) to stop session
  spam.

---

## Migration & rollout

Single Prisma migration: add the new Brother columns + `DuesPayment` table.
All new columns nullable / defaulted, so the migration is non-breaking on
the existing roster. Existing rows where `duesPaid = true` stay true; their
`duesPaymentMethod` backfills to `"MANUAL"` and `duesPaidAt` backfills to
`updatedAt`. One-shot SQL backfill in the migration file.

**Cost to a chapter that ignores this feature:** zero. Default cfg keeps
`dues.enabled = "false"` and the brother-facing UI shows the same neutral
"Dues unpaid" chip it always has.

— end of report —
