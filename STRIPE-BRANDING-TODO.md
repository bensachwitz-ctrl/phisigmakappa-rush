# Stripe branding — the one dashboard-only step

Everything the Stripe **API** can brand is already wired into the code (see
"What the code already does" below). Two things, however, can **only** be set in
the Stripe Dashboard because they live at the **account** level, and the API key
this app uses is a **restricted key** (`rk_live_…`) that intentionally lacks the
`rak_accounts_kyc_basic_read` / write scopes. That is by design — a restricted
key can take payments and issue invoices but cannot rewrite your business
identity. So the owner must do these two clicks once.

**Stripe account:** `acct_1TZv2jH4t2t3jAaO` (the live Greek Stack account)

---

## ✅ Do these 2 things in the Stripe Dashboard (one-time, ~3 minutes)

1. **Upload the Greek Stack logo + set the brand color**
   - Go to **Settings → Business → Branding**
     (direct: https://dashboard.stripe.com/settings/branding)
   - **Logo / Icon:** upload the Greek Stack mark (square PNG works best). This
     image is what shows on every hosted invoice page, the invoice PDF, the
     Checkout header, and emailed receipts.
   - **Brand color:** set the accent (e.g. the Greek Stack blue `#2563EB`).
   - **Accent color** for buttons if prompted.

2. **Set the public business name to "Greek Stack"**
   - Go to **Settings → Business → Public details / Account details**
     (direct: https://dashboard.stripe.com/settings/account)
   - **Public business name:** `Greek Stack`
   - **Support email:** `workbenjaminsachwitz@gmail.com` (or a support@ address
     once you have one) — shows on receipts/invoices as the "questions?" contact.
   - **Support website / Business URL:** `https://greekstack.vercel.app`
   - **Statement descriptor:** set to `GREEK STACK` (or `GREEKSTACK`) — this is
     the prefix that appears on customers' card statements. The code already
     appends short, per-charge suffixes (`DUES`, `DONATION`) to it.

That's it. Once those are set, every invoice, receipt, hosted invoice page, and
card statement reads professionally as **Greek Stack** — with the chapter as the
named customer.

---

## ✅ What the code already does (no action needed)

Verified live against `acct_1TZv2jH4t2t3jAaO` with the restricted key (each test
session was created and immediately **expired** — never charged):

### Platform billing — the chapter paying Greek Stack
`app/api/admin/billing/checkout/route.ts` + `app/api/admin/billing/rush-charge/route.ts`
- **Customer = the chapter** (`tenant.name`), created/reused via
  `getOrCreatePlatformCustomer`.
- **`subscription_data.description`** — every invoice reads
  `Greek Stack platform subscription (monthly|annual|semester) — <Chapter>`.
- **`subscription_data.invoice_settings.issuer = { type: "self" }`** — invoices
  issue from the Greek Stack account, so the Dashboard logo + business name (the
  step above) are applied automatically.
- **`custom_fields`** — a pre-filled "Chapter" field on the Checkout page so a
  treasurer sees exactly which chapter they're paying for; it lands on the
  payment record.
- **`customer_update: { name, address }`** + `billing_address_collection` — keeps
  the chapter's billing details clean on the invoice.
- Line-item product names already read `Greekstack Chapter …`
  (`lib/platform-billing.ts → planDisplayName`).

### Dues — the chapter collecting from its own members
`app/api/dues/checkout/route.ts`
- **Platform-collect mode (default):** a real Stripe **invoice** is issued
  (`invoice_creation.enabled`) with a chapter-named description
  (`<dues label> — <Chapter> (<year>)`) and the footer
  **"Powered by Greek Stack · greekstack.vercel.app"**, plus a card-statement
  suffix of `DUES`.
- **Stripe Connect mode** (chapter connected its own account): no platform
  invoice is issued (the chapter's own Stripe owns the receipt), but the
  PaymentIntent still carries the branded description.

### Alumni donations
`app/api/alumni/donate/checkout/route.ts`
- Same pattern as dues: platform-collect issues a branded invoice + `DONATION`
  statement suffix; Connect mode stamps the description only.

### Shared helpers
`lib/platform-billing.ts`
- `GREEKSTACK_BRAND_NAME` / `GREEKSTACK_SITE_URL` / `GREEKSTACK_SUPPORT_EMAIL`
- `platformInvoiceFooter()` · `platformSubscriptionInvoiceSettings()`
- `platformInvoiceCreation()` · `platformSubscriptionDescription()`
- `platformCheckoutCustomFields()`

---

## Why the API can't do the 2 dashboard steps

A quick `stripe.accounts.retrieve()` with the app's key returns:

```
The provided key 'rk_live_…' does not have the required permissions for this
endpoint on account 'acct_1TZv2jH4t2t3jAaO'. Having the
'rak_accounts_kyc_basic_read' permission would allow this request to continue.
```

Account branding (logo + business name) is gated behind that scope. Rather than
broaden the restricted key (more blast radius if it ever leaks), the cleaner,
safer path is the 2 Dashboard clicks above. Done once, they persist forever.
