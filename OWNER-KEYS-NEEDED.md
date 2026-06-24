# OWNER-KEYS-NEEDED — Greek Stack

What still needs **owner-only external setup** before the matching integration can
go fully LIVE. Everything here is honestly env-gated in code: until the var is
set, the feature degrades gracefully (honest fallback or a 503 "not configured"
state) and **never fakes** a send / upload / charge.

Set these in **Vercel → Settings → Environment Variables** for production (and in
the local gitignored `.env.local` for local testing). Updated 2026-06-24 during
the integration-wiring pass.

---

## ✅ Already LIVE (on-hand keys wired into `.env.local`)
These need NO owner action — verified live by a runtime trace on 2026-06-24:

| Integration | Status | Where wired |
|---|---|---|
| **Stripe** (dues + donations + platform billing) | LIVE — secret key + all 3 PRICE_IDs (`STRIPE_PLATFORM_PRICE_ID`, `_YEARLY_`, `_RUSH_`) + dues webhook + platform webhook all set | `lib/stripe.ts`, `lib/platform-billing.ts` |
| **Resend** (transactional email, OTP, invites) | LIVE — `RESEND_API_KEY` set; powers the wired OTP login + portal reset flow | `lib/email.ts`, `lib/messaging-config.ts` |
| **PostHog** (product analytics) | LIVE — `NEXT_PUBLIC_POSTHOG_KEY` + host set; lazy-loaded on mount | `lib/posthog.ts`, `components/site/telemetry-bootstrap.tsx` |
| **Neon Postgres** + **Vercel Blob** | LIVE — `DATABASE_URL*` + `BLOB_READ_WRITE_TOKEN` set | `lib/prisma.ts`, `lib/esign.ts` |
| **Auth secrets** | Generated 2026-06-24 (`ADMIN_SESSION_SECRET`, `PORTAL_SESSION_SECRET`, `SUPERADMIN_SECRET`, `ADMIN_PASSWORD`). **Rotate before production** with `openssl rand -hex 24`. |

---

## 🔑 Needs owner external setup

### 1. Twilio SMS — phone number (partially wired)
- **Vars:** `TWILIO_PHONE_NUMBER` (the only missing piece)
- **On hand & already set:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
- **What to do:** Buy/port a Twilio number (or provision a Messaging Service) and
  paste the E.164 number (e.g. `+18035551234`) into `TWILIO_PHONE_NUMBER`. SMS
  goes LIVE automatically the moment all three are present (`lib/sms.ts` requires
  the full triple; with the number blank it stays in the honest DB-logged mock
  path — no fake "sent").
- **A2P 10DLC:** US application-to-person traffic also needs a registered
  Messaging Service / brand + campaign (A2P 10DLC) in the Twilio console, or
  carrier filtering will drop messages. Trial accounts can only text verified
  numbers. Where it lives: Twilio Console → Messaging → Regulatory Compliance.
- **Get it:** <https://console.twilio.com> → Phone Numbers → Buy a Number.

### 2. Cloudinary — image CDN (optional upgrade over Vercel Blob)
- **Vars:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  (+ optional `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`)
- **No key on hand.** Until set, uploads use Vercel Blob (already live) and
  delivery is unchanged — fully additive, nothing breaks.
- **Get it:** free account at <https://cloudinary.com> → Dashboard shows all three.

### 3. Tavily — rush auto-enrichment (optional)
- **Var:** `TAVILY_API_KEY`
- **No key on hand** (the on-hand `tinyfish` key is a different provider — web
  search, not the Tavily REST API `lib/enrich.ts` calls). Until set, `/api/admin/enrich`
  returns honest "manual mode" copy + one-click research links (Google/LinkedIn/IG).
- **Get it:** free key at <https://app.tavily.com>.

### 4. Stripe — production webhook endpoints
- The dues + platform webhook **signing secrets are set** for the current
  endpoint. When you point Stripe at the production apex, create the two webhook
  endpoints and paste their `whsec_…`:
  - Dues: `https://<apex>/api/dues/webhook` → `STRIPE_WEBHOOK_SECRET`
  - Platform billing: `https://<apex>/api/platform/billing/webhook` →
    `STRIPE_PLATFORM_WEBHOOK_SECRET` (events: `customer.subscription.*`,
    `invoice.paid`, `invoice.payment_failed`, `checkout.session.completed`)
- **Get it:** <https://dashboard.stripe.com/webhooks>.

### 5. Google Calendar bridge (optional)
- **Vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- OAuth 2.0 client; authorized redirect URI must match `GOOGLE_REDIRECT_URI`.
  Until set, `/api/google-calendar/*` returns an honest 503 "Connect" prompt.
- **Get it:** Google Cloud Console → APIs & Services → Credentials → OAuth client.

### 6. Chatwoot live-chat (optional)
- **Vars:** `CHATWOOT_BASE_URL`, `CHATWOOT_WEBSITE_TOKEN`
- Fully inert until both set (no widget script emitted). Stand up a Chatwoot
  install (Docker/Coolify), create a Website inbox, copy its Website Token.

### 7. Sentry error tracking (optional)
- **Vars:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (+ optional sampling /
  source-map upload `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`)
- Fully inert with both blank. Set in Vercel only.

---

## 🐳 Local Docker services — go LIVE once Docker is up

These two are env-gated and currently DOWN (Docker not running on this machine).
Their `.env.local` lines are present but **commented out** so the app stays on
its honest non-Docker path (Resend→mock for email; in-process `fuse.js` for
search) and never fakes a "sent" / "indexed".

### listmonk — newsletter / durable subscriber lists (OSS Mailchimp alt)
- **Vars:** `LISTMONK_URL` (`http://localhost:9000`), `LISTMONK_USER`,
  `LISTMONK_PASS`, `LISTMONK_TX_TEMPLATE_ID`
- Code is fully wired (`lib/email.ts`, `lib/messaging-config.getListmonkConfig`):
  it requires all of URL + user + pass (a partial config resolves to all-null →
  Resend fallback). Add a transactional template id to enable listmonk *sends*;
  the LIST features work with just URL+user+pass.
- **Go live:** `docker compose up` listmonk → :9000, create an API user + a tx
  template, uncomment + fill the four vars in `.env.local`.

### Meilisearch — typo-tolerant search (Algolia alt)
- **Vars:** `MEILISEARCH_HOST` (`http://localhost:7700`), `MEILISEARCH_API_KEY`
- **Note:** not yet wired to a code path — Greek Stack currently searches via
  in-process `fuse.js` (no service dependency). Meilisearch is the intended
  upgrade backend once Docker is up; wiring it is a follow-up task.
