# Greekstack — Rush + Chapter Management Platform

> Production-grade Next.js platform for Greek-letter chapter rush, brotherhood management, and TCPA-compliant communications. **Originally built for Phi Sigma Kappa Gamma Triton at USC.** Designed to be re-skinned and deployed per-chapter or operated as a national white-label SaaS by an Inter/National HQ.

**Live reference deploy:** <https://greekstack.vercel.app>
**License:** MIT — chapters and HQs free to deploy, modify, and operate.

---

## What you get out of the box

| Surface | What it does |
|---|---|
| **Public rush site** | Hero with live event countdown · 3-week timeline · FAQ · e-board · stats · alumni testimonial · Instagram feed · 4-step rush form with TCPA-grade consent capture · `/parents` trust page · `/privacy` (CCPA + VCDPA + COPPA + TCPA recordkeeping) |
| **Booth mode (`?booth=1`)** | Single-purpose tablet kiosk — form-only SSR, autofocus, 60s idle auto-clear with countdown chip, 6s post-success auto-restart, "Add rushee" submit |
| **Admin (`/admin`)** | Rush pipeline (search/filter/vote/notes/bulk SMS+email) · Brothers directory · Events CRUD · Announcements · "Get rush ready" first-run checklist · CSV export with vote sums and attendance |
| **Site Settings (`/admin/settings`)** | Self-serve content control — hero copy + photos, e-board roster (5 slots with headshots), stats, philanthropy, contact + advisor, anti-hazing block, FAQ/timeline/values/highlights/recent activity (JSON repeaters), testimonial, history, 10 section visibility toggles |
| **iCal feed (`/api/events.ics`)** | One-tap calendar subscribe (`webcal://…`) for brothers and rushees |
| **Brother onboarding** | Email/SMS/copy-link invites with 30-day token; brother sets first-name + password during onboarding |
| **TCPA evidence trail** | Per-submit consent receipt at `/api/consent/[id]` with verbatim disclosure (47 CFR §64.1200(f)(9) ATDS language), versioned, IP truncated, UA snapshot, age path; double opt-in via Twilio inbound webhook with HMAC signature verification; CTIA-compliant STOP/HELP keywords |
| **Quiet hours** | SMS broadcast endpoint blocks sends outside 8am–9pm Eastern with HTTP 425 |
| **Photo proxy** | AVIF → WebP → JPEG negotiation, 30-day immutable CDN cache, automatic IG og:image scrape with anti-branding-fallback detection |
| **Security baseline** | Full CSP + HSTS preload + Permissions-Policy + Referrer-Policy + X-Frame-Options + X-Content-Type-Options |
| **A11y baseline** | Skip-to-content link, focus-visible rings, prefers-reduced-motion, ARIA radiogroup on age toggle, alt text on every image |
| **SEO + Knowledge Panel** | JSON-LD CollegeOrUniversity + WebSite schema graph with PostalAddress, sameAs, ContactPoint × 2 (rush + anti-hazing) |

## Stack

Next.js 14 App Router · Prisma · Postgres (Vercel/Neon) · Vercel Blob · Resend (email) · Twilio (SMS, double opt-in webhook) · Tavily (auto-enrichment) · `sharp` (image transcoding) · Tailwind 3 · shadcn-style components

## For nationals: white-label model

Every public-facing string, every photo, every contact field is admin-editable from the chapter's `/admin/settings` panel — **no code deploy required for content updates**. A new chapter clones the deploy, sets six environment variables (database, Resend, Twilio), and signs in as admin. The "Get rush ready" checklist on `/admin` walks them through populating advisor, e-board, and first event.

National HQ can operate this as a centralized SaaS: one deploy per chapter (Vercel project per chapter) or a future multi-tenant fork. The codebase is intentionally simple — a single Next.js app with a single Prisma schema. Chapter-specific branding (school colors, Greek-letter overrides) is driven by `lib/site-config.ts` defaults that admin can override.

See [`SALES.md`](SALES.md) for the pitch one-pager and [`ARCHITECTURE.md`](ARCHITECTURE.md) for the system diagram.

---

## Quick deploy (single chapter)

```bash
# 1. Clone
git clone https://github.com/bensachwitz-ctrl/phisigmakappa-rush.git my-chapter
cd my-chapter

# 2. Install
npm install

# 3. Provision Postgres (Vercel/Neon recommended) — see .env.example for env vars

# 4. Run locally
cp .env.example .env.local
# fill in DATABASE_URL, DIRECT_URL, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
npx prisma db push
npm run dev

# 5. Deploy to Vercel
vercel
# add env vars in Vercel Project → Settings → Environment Variables
```

[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/bensachwitz-ctrl/phisigmakappa-rush) — clone + provision in 2 minutes.

## Admin onboarding (chapter rush chair, 3 steps)

1. Go to `https://your-deploy.vercel.app/admin/login`. Form opens on the **Admin** tab. Sign in with the username + password you set in env vars.
2. The dashboard shows a **"Get rush ready"** checklist with status pills. Work through each amber item: real advisor name, rush phone, e-board roster (5 slots), hero photos, first public event, brothers directory.
3. Click **Site** in the sidebar — every other public-facing piece of content (FAQ, timeline, testimonial, anti-hazing copy, philanthropy stats) edits from there with a sticky Save bar. Changes go live in seconds, no code deploy.

That's it. Send the brother-invite link from `/admin/brothers` to your e-board and the platform runs rush.

## Repo structure

```
app/                  Next.js App Router routes
  page.tsx            Public homepage (hero, schedule, FAQ, etc.)
  parents/            Parent-facing trust page
  privacy/            TCPA + CCPA + VCDPA privacy policy
  admin/              Admin dashboard, settings, events, brothers, announcements
  api/                Server routes (rush, consent, sms/inbound, photo, events.ics, health, ...)
  layout.tsx          Root layout, JSON-LD, manifest hookup
  globals.css         Tailwind base + section-y utilities + a11y rules

components/
  site/               Public components (rush-form, schedule-list, instagram-feed, rush-countdown, sticky-cta, ...)
  admin/              Admin components (settings-manager, brothers-manager, events-manager, ...)
  brand/              Wordmark, Crest, Seal SVGs
  ui/                 shadcn-style primitives

lib/
  site-config.ts      Default cfg values + DB merge (single source of truth for editable content)
  auth.ts             Session token + cookie + role check (Node)
  auth-edge.ts        HMAC verification used in middleware (Edge runtime)
  enrich.ts           Auto-enrichment via Tavily web search
  utils.ts            cleanUrl / cleanMailto / cleanTel sanitizers + rush status helpers

prisma/schema.prisma  Database models (Rush, RushConsent, RushSubmitLog, Brother, Event, Vote, ...)
```

## Environment variables

See [`.env.example`](.env.example) for the full annotated list. Required:

- `DATABASE_URL`, `DIRECT_URL` — Postgres
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — chapter admin login (case-insensitive)
- `ADMIN_SESSION_SECRET` — HMAC signing key (32+ chars random)

Optional (mock mode if missing):

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — email broadcasts
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — SMS broadcasts + double opt-in
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob for photo uploads (auto-set by Vercel when you create a Blob store)
- `TAVILY_API_KEY` — auto-enrichment of submitted PNMs

## Build / develop

```bash
npm run dev           # local dev server
npm run build         # production build (runs prisma generate + db push)
npm run lint          # next lint
npx tsc --noEmit      # typecheck
```

## Verifying a deploy

```bash
# Health check
curl https://your-deploy.vercel.app/api/health
# → {ok:true, db:up, deployedAt, region, timestamp}

# iCal feed
curl https://your-deploy.vercel.app/api/events.ics
# → BEGIN:VCALENDAR...

# JSON-LD
curl -s https://your-deploy.vercel.app | grep 'application/ld+json'
```

## Version history

This codebase shipped via 16 audit-fix-deploy iterations. See [`FINAL.md`](FINAL.md) for the full progression, scorecard, and follow-up backlog.

## Contributing

PRs welcome from chapters customizing for their own deploy. Fork-and-modify works for white-label deployments — the codebase is intentionally hackable. For substantive contributions back, open an issue first describing your chapter's requirement so we can discuss whether it lands as a config knob or upstream code.

## License

MIT — see [`LICENSE`](LICENSE).
