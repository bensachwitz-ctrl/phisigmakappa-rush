# Architecture

> System overview for the Greekstack chapter management platform. Single Next.js 14 App Router app, Postgres backend, Vercel-hosted. **Today it is single-tenant: one deploy + one database per chapter, re-branded via config.** There is no tenant/`Chapter` model and no `chapterId` scoping yet — going multi-tenant is a future fork, scoped at roughly 2–4 weeks (see "Multi-tenancy path" at the bottom).

## High-level

```
                 ┌──────────────────────────────────────────────────────────┐
                 │                     PUBLIC SURFACE                       │
                 │                                                          │
   Rushee  ─────►│  /            (hero, schedule, form, FAQ, Instagram)     │
   Parent  ─────►│  /parents     (advisor card, anti-hazing, data/consent)  │
   Anyone  ─────►│  /privacy     (TCPA, CCPA, VCDPA, COPPA)                 │
   Tablet  ─────►│  /?booth=1    (form-only SSR, kiosk auto-clear)          │
                 │                                                          │
                 │  /api/events.ics       — public iCal feed (webcal://)    │
                 │  /api/photo/[slug]     — IG og:image proxy + AVIF/WebP   │
                 │  /api/health           — uptime probe                    │
                 │  /manifest.webmanifest — PWA manifest                    │
                 │  /sitemap.xml, /robots.txt                               │
                 └──────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                 ┌──────────────────────────────────────────────────────────┐
                 │                  WRITE-PATH SURFACE                      │
                 │                                                          │
   Rushee  ─────►│  POST /api/rush                                          │
                 │     ├─ rate-limit (5/hr/IP, RushSubmitLog)               │
                 │     ├─ validate (Zod)                                    │
                 │     ├─ upsert Rush row                                   │
                 │     ├─ create RushConsent (verbatim disclosure + IP+UA)  │
                 │     ├─ fire double-opt-in SMS via Twilio (background)    │
                 │     └─ fire enrichment (Tavily search, background)       │
                 │                                                          │
   Twilio  ─────►│  POST /api/sms/inbound                                   │
                 │     ├─ verify X-Twilio-Signature (HMAC-SHA1)             │
                 │     ├─ E.164 validation (400 on malformed)               │
                 │     ├─ STOP/HELP/YES/START keyword routing               │
                 │     └─ update RushConsent.smsConfirmed/optedOut          │
                 │                                                          │
   Public  ─────►│  GET  /api/consent/[id]  — verbatim receipt + truncated  │
                 │                            IP + UA snapshot              │
                 └──────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                 ┌──────────────────────────────────────────────────────────┐
                 │                     ADMIN SURFACE                        │
                 │                                                          │
   Brothers ────►│  /admin/login    (shared admin login, env-configured)    │
                 │      └─ POST /api/admin/login → 4-part HMAC token cookie │
                 │                                                          │
   Admin   ─────►│  /admin                                                  │
                 │      ├─ "Get rush ready" checklist (6 pending items)     │
                 │      └─ Rush roster (search, vote, notes, status, CSV)   │
                 │                                                          │
                 │  /admin/settings                                         │
                 │      ├─ Hero (eyebrow + subline + 3-part H1 + CTA)       │
                 │      ├─ Hero photo collage (3 tiles, slug or upload)     │
                 │      ├─ Spotlight (Brother of the Month)                 │
                 │      ├─ About photo                                      │
                 │      ├─ Stats strip (4 slots: value/label/sub)           │
                 │      ├─ Executive board (5 slots, name/role/headshot)    │
                 │      ├─ Contact & social (10 fields, with amber banner)  │
                 │      ├─ Philanthropy (5 fields)                          │
                 │      ├─ Anti-hazing & privacy (3 fields)                 │
                 │      ├─ Timeline / FAQ / Values / Highlights / Recent    │
                 │      │     (JSON-array repeaters with add/remove/reorder)│
                 │      ├─ Testimonial (4 fields)                           │
                 │      ├─ Long-form copy (history, anti-hazing body)       │
                 │      └─ 10 section visibility toggles                    │
                 │                                                          │
                 │  /admin/brothers   (directory + invite + revoke UI)      │
                 │  /admin/events     (CRUD + "Add Fall rush template")     │
                 │  /admin/announcements                                    │
                 │  /admin/help       (handbook for the rush chair)         │
                 └──────────────────────────────────────────────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
┌──────────────────┐         ┌──────────────────────┐        ┌─────────────────────┐
│   Postgres       │         │    Vercel Blob       │        │   3rd-party APIs    │
│   (Vercel/Neon)  │         │    (photos)          │        │                     │
│                  │         └──────────────────────┘        │  Resend  (email)    │
│  Rush            │                                         │  Twilio  (SMS)      │
│  RushConsent     │         ┌──────────────────────┐        │  Tavily  (enrich)   │
│  RushSubmitLog   │         │   Instagram CDN      │        │  Instagram embed    │
│  Brother         │         │   (photo proxy)      │        │   (og:image scrape) │
│  BrotherInvite   │         └──────────────────────┘        └─────────────────────┘
│  Event           │
│  Attendance      │
│  Vote            │
│  Announcement    │
│  EmailLog        │
│  SmsLog          │
│  SiteConfig (KV) │
└──────────────────┘
```

## Request lifecycle examples

### A rushee submits the form

1. Browser POSTs `/api/rush` with `{name, phone, email, ageAttestation, ...}`
2. Server reads `x-forwarded-for` for IP. Counts `RushSubmitLog` rows from this IP in the last 60 minutes.
3. If count ≥ 5, returns 429 with `Retry-After: 3600`. Logs a `RATE_LIMITED` row.
4. Otherwise runs Zod validation. On parse failure, logs `INVALID` and returns 400.
5. Logs `ACCEPTED` row, then upserts `Rush` (keyed on lowercased email).
6. Creates `RushConsent` with verbatim `SMS_DISCLOSURE_TEXT` (versioned), truncated IP, UA, age path.
7. Fires `sendDoubleOptInSms()` in the background (no await).
8. Fires `enrichRushee()` in the background — Tavily web search for the rushee's social signals.
9. Returns `{ok:true, id, consentReceipt:{id, version, createdAt}}` to the client.

### A rushee texts STOP

1. Twilio webhooks `POST /api/sms/inbound` with `From=+15555551234&Body=STOP`.
2. Server reads `x-twilio-signature` header, computes expected HMAC-SHA1 of (full URL + sorted form params), constant-time compares. If mismatch → 403.
3. Validates `From` is E.164. If malformed → 400.
4. Detects STOP keyword (also END/QUIT/CANCEL/UNSUBSCRIBE/OPTOUT).
5. Looks up `Rush` by phone-digits substring; finds latest `RushConsent`.
6. Sets `optedOut = true` and `optedOutAt = now()`. Preserves any prior `smsConfirmed` truth (evidence preservation).
7. Returns TwiML `<Response><Message>...you're opted out. Reply START to resubscribe...</Message></Response>`.

### Admin populates the homepage

1. Admin POSTs `/api/admin/login` with `{username, password}`. Server compares case-insensitive against `process.env.ADMIN_USERNAME` and `ADMIN_PASSWORD`.
2. Server creates / updates `Brother{role: "ADMIN"}` row, mints 4-part HMAC token (`brotherId.adminFlag.timestamp.signature`), sets `phisig_admin` cookie (HttpOnly + Secure + SameSite=lax + 12h).
3. Browser navigates to `/admin/settings`. Middleware verifies cookie via `verifyEdgeSession()` (Edge runtime) which handles both 4-part modern and 3-part legacy tokens.
4. Admin edits a setting (e.g. `hero.subline` or `faq.json`). Browser PATCHes `/api/admin/settings` with `{updates: {hero.subline: "..."}}`.
5. Server scrubs each value (strips trailing `\`, ellipsis, smart quotes, etc. for url/email/handle keys), then upserts into `SiteConfig`.
6. Public homepage is `dynamic = "force-dynamic"`, so the next page load reads the fresh config via `getSiteConfig()`.

## Auth model

| Surface | Gate |
|---|---|
| Public pages (`/`, `/parents`, `/privacy`, `/?booth=1`) | None |
| `/admin/*` (except `/admin/login`) | Middleware checks `phisig_admin` cookie via Edge HMAC |
| `/api/admin/*` | Server-side `isAdminAuthed()` check + role check for write operations |
| `/api/rush` | Rate-limited but otherwise public (rushees POST without auth) |
| `/api/consent/[id]` | Public read of self-issued consent receipt; truncates IP for privacy |
| `/api/sms/inbound` | Twilio HMAC signature verification (no app-level cookie) |
| `/api/photo/[slug]` | Public read |

The single shared admin credential (set via `ADMIN_USERNAME` + `ADMIN_PASSWORD`, compared case-insensitively; the cookie HMAC is signed with `ADMIN_SESSION_SECRET`) is the simplest model that works for an officer e-board. Individual brother accounts (with per-brother passwords) flow through the BrotherInvite onboarding link → `Brother.passwordHash`. Both auth paths land in the same cookie format.

## Compliance posture

**TCPA (47 CFR §64.1200(f)(9))** — express written consent requires disclosure of:
- Sender identity ✓ ("Phi Sigma Kappa Gamma Triton (USC)")
- Frequency ("Up to 8 messages per rush cycle") ✓
- Auto-dial / automated technology ✓
- Carrier-rate disclosure ("Msg & data rates may apply") ✓
- HELP and STOP keywords ✓
- Consent not a condition of membership consideration ✓
- Documented + recorded with timestamp + IP ✓ (RushConsent model, 4-year retention)

**CTIA SMS** — opt-out keywords always honored regardless of whether phone is on file (the webhook returns the canonical reply for STOP/HELP for any From, not just known numbers).

**CCPA / CPRA / VCDPA** — privacy page explicitly addresses California and Virginia rights. No sale or sharing for cross-context behavioral advertising.

**COPPA** — under-13 collection prohibited and disclosed.

**FIPG / Phi Sigma Kappa risk management** — anti-hazing block on home + parents + privacy. National hotline link tested clean (no broken URL). All "tailgate" mentions qualified with "dry"; all formal mentions FIPG-qualified.

## Multi-tenancy path (for nationals) — not built, future roadmap

Today: one deploy per chapter, one database per chapter, no tenant model. Multi-tenancy is **not implemented** — the steps below are the roadmap for it. To go multi-tenant in a single deploy:

1. Add `chapterId` (or `chapterSlug`) FK to every model (Rush, RushConsent, Brother, Event, etc.).
2. Add a `Chapter` model: `{id, slug, name, schoolName, primaryColor, …}`.
3. Subdomain routing: `gamma-triton.greekstack.app` → `chapterSlug = "gamma-triton"` resolved in middleware.
4. Scope every `prisma.x.findMany()` by `where: { chapterId }`.
5. `getSiteConfig()` becomes `getSiteConfig(chapterId)` — keys namespaced as `{chapterId}:{key}` in `SiteConfig` table.
6. Admin auth: instead of the single global `ADMIN_USERNAME` / `ADMIN_PASSWORD` shared login, each `Chapter` would carry its own `adminUsername` + `adminPasswordHash`.
7. National dashboard route: `app/national/page.tsx` — gated by national-tier admin role, aggregates pipeline counts across all chapters.

This is roughly 2–4 weeks of focused work with minimal architectural disruption — every model, every route, every component is already structured around clean cfg-driven content.

## Hosting + cost (single chapter)

| Component | Provider | Plan | Approx monthly cost |
|---|---|---|---|
| Compute + edge | Vercel | Hobby (or Pro for >100GB-hr) | $0–$20 |
| Database | Vercel Postgres / Neon | Free tier (500MB) | $0 |
| Object storage | Vercel Blob | Pay-as-you-go | $1–5 |
| Email | Resend | Free 100/day, Pro $20/mo for 50k/mo | $0–$20 |
| SMS | Twilio | A2P 10DLC ~$1.5/mo + $0.0079/msg | $5–$30 (depends on volume) |
| **Total per chapter** | | | **~$10–$75/mo** |

National-scale deployment with one Vercel project per chapter is well within Vercel Pro's project allowance, and the Twilio brand registration is one-time per legal entity (sponsoring chapter or HQ).

## Operational surface

- `GET /api/health` — uptime probe (returns `{ok, db, deployedAt, region, timestamp}`)
- Vercel Analytics (built-in)
- All write operations log to corresponding tables (`RushSubmitLog`, `EmailLog`, `SmsLog`)
- No telemetry, no analytics scripts beyond what Vercel provides — privacy-first by default
