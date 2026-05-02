# Phi Sigma Kappa @ USC — Rush Platform

Production-ready rush management for the Eta-Pentaton chapter at the University of South Carolina.

**Stack**: Next.js 14 (App Router) · Tailwind · Shadcn-style UI · Prisma · Postgres (Vercel Postgres / Neon) · Resend (email) · Twilio (SMS)

---

## Features

**Public (`/`)**
- Sleek red/white hero with chapter wordmark
- Multi-step onboarding intake form (name, email, phone, year, major, hometown, HS activities, background)
- Progress bar, validation, animated success state
- Live event schedule with date cards, locations, dress codes
- About section with cardinal principles

**Admin (`/admin`)** — gated behind chapter password + brother name
- Roster table with search, filter, sort, multi-select
- Pipeline statuses: Active · Dropped · Bid Extended · Accepted · Declined
- One-click status changes from row or detail panel
- **Brotherhood vote**: each brother casts strong-yes / yes / neutral / no / strong-no per rush; live vote sum and full vote breakdown
- Internal notes per rush
- **Mass email** (Resend) with templates: blank, private invite, bid extension, reminder
- **Mass text** (Twilio) with templates and 320-char counter
- **Event management**: create, list, delete public/private events
- **Attendance check-in**: per-event modal with searchable rush list, toggleable check-marks

**APIs**
- `POST /api/rush` — public registration (upserts by email)
- `GET  /api/events` — public schedule
- `POST /api/admin/login` — name + chapter password
- `GET/PATCH/DELETE /api/admin/rush` — roster CRUD
- `POST/DELETE /api/admin/events` — event CRUD
- `POST/GET/DELETE /api/admin/vote` — brother voting
- `POST/GET /api/admin/attendance` — event attendance
- `POST /api/send-email` — bulk email via Resend (mock mode if no key)
- `POST /api/send-sms` — bulk SMS via Twilio (mock mode if no creds)

---

## Local development

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
# edit .env — at minimum set ADMIN_PASSWORD and ADMIN_SESSION_SECRET

# 3. Initialize the database
npx prisma db push
npm run db:seed       # seeds 5 demo events

# 4. Run
npm run dev
# → http://localhost:3000
# → /admin/login (use ADMIN_PASSWORD from .env)
```

Mock mode: if `RESEND_API_KEY` or Twilio creds aren't set, sends are logged to the DB but no real messages are dispatched. Useful for local testing without burning credits.

---

## Deploying to Vercel (`phisigmakappa.vercel.app`)

### One-time setup

1. Push this folder to a Git repo (GitHub recommended).
2. In Vercel, **Import Project** → select the repo.
3. Add a **Vercel Postgres** database from Storage → connect to the project. This automatically injects `DATABASE_URL` and `DIRECT_URL`.
4. Add environment variables in **Project → Settings → Environment Variables**:
   - `ADMIN_PASSWORD` — chapter password
   - `ADMIN_SESSION_SECRET` — 32+ char random string
   - `RESEND_API_KEY` (optional)
   - `RESEND_FROM_EMAIL` (optional, must be verified domain)
   - `TWILIO_ACCOUNT_SID` (optional)
   - `TWILIO_AUTH_TOKEN` (optional)
   - `TWILIO_PHONE_NUMBER` (optional, E.164 format)
   - `NEXT_PUBLIC_SITE_URL=https://phisigmakappa.vercel.app`

5. Deploy.

6. Run a one-time migration against the production DB:
   ```bash
   # Locally, after `vercel env pull`
   npx prisma db push
   ```

7. Update local script to ensure first build succeeds even on a fresh DB —
   the build only runs `prisma generate` (not `db push`), so first deploy
   will succeed; the app gracefully shows empty states until the schema is
   pushed.

### Custom domain

Vercel → Project → Settings → Domains → add your domain.

---

## Tech notes

- **Auth**: HMAC-signed cookie containing `<brotherId>.<timestamp>.<sig>`. Brothers self-register at first login by entering their name plus the chapter password. Sessions expire after 12 hours.
- **Brother identity** is used to attribute votes — there's no email/password per brother by design (low friction for active members).
- **Resend** sends one personalized email per recipient (no Bcc leakage). Failures are logged in `EmailLog` with a `PARTIAL`/`FAILED` status.
- **Twilio** posts to the REST API directly (no SDK) for a smaller bundle. Numbers are normalized to E.164.
- **SQLite → Postgres** migration: change provider, run `prisma db push`. The schema is dialect-agnostic.

---

## Chapter password rotation

Set a new `ADMIN_PASSWORD` in Vercel → redeploy. All brothers will need to re-enter it on next login.

---

## Project layout

```
app/
  page.tsx                 # public PNM landing
  api/
    rush/route.ts          # public registration
    events/route.ts        # public schedule feed
    send-email/route.ts    # mass email (Resend)
    send-sms/route.ts      # mass SMS (Twilio)
    admin/
      login/route.ts
      rush/route.ts
      events/route.ts
      vote/route.ts
      attendance/route.ts
  admin/
    login/page.tsx
    page.tsx               # roster
    events/page.tsx        # event management
components/
  brand/                   # wordmark + crest
  site/                    # public nav, footer, form, schedule
  admin/                   # roster, events manager, attendance
  ui/                      # button, input, dialog, table, etc.
lib/
  prisma.ts
  auth.ts
  utils.ts
prisma/
  schema.prisma
  seed.ts
middleware.ts              # protects /admin
```
