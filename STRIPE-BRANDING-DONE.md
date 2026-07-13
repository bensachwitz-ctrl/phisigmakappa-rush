# Stripe branding — dashboard clicks completed

> Account: `acct_1TZv2jH4t2t3jAaO` (Greek Stack live account)  
> Date: 2026-07-12  
> Restricted API key (`rk_live_…`) intentionally lacks account KYC scopes, so these two account-level items were completed in the Stripe Dashboard.

---

## 1. Logo + brand color

**Path:** https://dashboard.stripe.com/settings/branding  
**Settings → Business → Branding**

- **Logo / Icon:** uploaded the Greek Stack mark (square PNG).
- **Brand color:** `#2563EB` (Greek Stack blue).
- **Accent color:** `#2563EB` (applied to buttons / links on hosted pages).

This logo + color now renders on:
- Hosted invoice pages
- Invoice PDFs
- Stripe Checkout header
- Emailed receipts

---

## 2. Public business identity + statement descriptor

**Path:** https://dashboard.stripe.com/settings/account  
**Settings → Business → Public details / Account details**

- **Public business name:** `Greek Stack`
- **Support email:** `workbenjaminsachwitz@gmail.com`
- **Support website / Business URL:** `https://greekstack.vercel.app`
- **Statement descriptor:** `GREEK STACK`
  - The app appends per-charge suffixes in code: `DUES`, `DONATION`, subscription descriptors, etc.

---

## What remains code-side (already implemented)

No API changes were required. The existing restricted key continues to handle:

- Platform subscription / billing (`app/api/admin/billing/*`)
- Chapter dues collection (`app/api/dues/checkout/*`)
- Alumni donations (`app/api/alumni/donate/checkout/*`)
- Webhook endpoints at:
  - `https://greekstack.vercel.app/api/dues/webhook`
  - `https://greekstack.vercel.app/api/platform/billing/webhook`

Helpers in `lib/platform-billing.ts` already stamp every invoice/receipt with Greek Stack branding, footer, and chapter context.
