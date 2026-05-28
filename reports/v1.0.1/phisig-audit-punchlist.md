# Phi Sigma Kappa Rush Platform — Runtime-Crash / Data-Integrity Audit

**Date:** 2026-05-28
**Scope:** ~91 API route files, ~32 pages, components/, lib/ — full read-only audit
**Build gates:** `npx tsc --noEmit` → **CLEAN (exit 0)** · `npx next lint` → **0 errors, 4 warnings** (all `react-hooks/exhaustive-deps`, none are rules-of-hooks)

---

## CRITICAL (runtime crash / data-integrity / auth bypass)

**None confirmed.** Every focus area was traced to source:

- **Prisma `include`/`select` mismatches** — All 50 `include:`/`select:` blocks (39 in `.ts`, 11 in `.tsx`) cross-checked against `prisma/schema.prisma`. Every relation referenced (`votes`, `attendances`, `impressions`, `brother`, `event`, `member`, `task`, `position`, `donations`, `alumni`, `createdBy`, `rsvps`, `uploadedBy`, `serviceEvent`, `acknowledgments`, `attendance`, `_count` selections) exists on its model. No `PrismaClientValidationError` surface found.
- **Undefined props to client components** — All page→client component handoffs verified (`AcademicClient`, `ChoresClient`, `RiskClient`, `RusheeDetail`, `DashboardClient`, `RusheesManager`). Every prop passed by the server is destructured by the client with matching types; no prop referenced in the wrong scope. (TS types these props, so `tsc` would have caught mismatches — and it's clean.)
- **Rules of hooks** — `next lint` (uses `next/core-web-vitals` → `react-hooks/rules-of-hooks` as ERROR) reports zero violations. A grep heuristic flagged ~30 "hook after return" sites; all manually confirmed as false positives (the `return` belongs to a sibling helper function — e.g. a `statusBadge` switch — not an early return inside the same component body).
- **Unguarded `.map/.filter/.find/.length` on null Prisma results** — `findUnique` results are null-checked before member access in every handler traced (`bid/[token]`, `events/[id]/rsvp`, `admin/incidents/[id]`, `admin/meetings/[id]`, alumni dashboard uses `(alumniProfile?.donations || [])`).
- **`await req.json()` without try/catch** — All 21 occurrences are inside a surrounding `try/catch`, or use zod `.safeParse()`/`.parse()` inside a try, or use `.catch(() => ({}))`. Malformed body → 400, never an unhandled 500.
- **Env-var assumptions** — Every `process.env.X` is guarded (mock-mode degrade for Resend/Stripe/Twilio/Google/Blob, or `|| fallback`). No env access crashes at runtime; missing keys downgrade the feature gracefully.
- **Auth/permission gaps** — All 49 `/api/admin/**` routes gated. Per-handler audit: every GET/POST/PATCH/DELETE has ≥1 gate call (`isAdminAuthed` / `isAdminRole` / `requireOfficerPermission` / `ensureSuperAdmin`). Only `app/api/admin/login/route.ts` is ungated (POST=login, DELETE=sign-out) — correct by design.
- **Stripe webhook** (`app/api/dues/webhook/route.ts`) — Signature verified via `constructEvent` (line 52); bad sig → 400 with NO DB writes. Idempotent: keys off `DuesPayment.stripeSessionId @unique` + `status==="PAID"` no-op (line 114) + atomic `$transaction`. **Cannot double-credit.**
- **Cron routes** — Both (`cron/cleanup`, `cron/send-scheduled-announcements`) gated by `x-vercel-cron` header OR `CRON_SECRET` bearer/query; unauthenticated callers → 403.

---

## HIGH (broken feature)

**None confirmed.** No feature path traced to a guaranteed-broken state. Public routes (`bid/[token]`, `events/[id]/rsvp`, `incident-report`, `rush`) all validate input, check existence before mutation, and handle replay/double-submit gracefully (bid token is single-use; `bidRespondedAt` guard prevents double-response).

---

## MEDIUM (hardening — non-crash, optional)

- **`app/portal/alumni/dashboard/page.tsx`** — Unlike the `/admin/*` pages (which wrap every Prisma call in `try/catch` and fall back to `[]`), the alumni dashboard runs ~8 sequential un-wrapped Prisma queries. A DB blip surfaces as the Next error boundary (`app/error.tsx`), not a raw crash, but wrapping in try/catch would match the admin pages' resilience.
- **`lib/google-calendar.ts` / `lib/portal-auth.ts`** — `ADMIN_SESSION_SECRET` / `PORTAL_SESSION_SECRET` fall back to a hardcoded `"dev-insecure-secret-change-me"` outside production. `getSecret()` correctly throws in prod, so this is dev-only; confirm both secrets are set in Vercel prod env (they gate session + OAuth-state HMAC).
- **Poll `audience` filter** — Alumni dashboard filters polls on `audience: "ALUMNI"`, but schema default is `"BROTHERS"` and `/api/polls` create path doesn't set `"ALUMNI"`. Not a crash; alumni may simply see zero polls unless one is explicitly created with that audience. Verify the poll-create UI offers the ALUMNI option.
- **4 `react-hooks/exhaustive-deps` warnings** (`command-palette.tsx:154`, `events-manager.tsx:430`, `roster.tsx:167/168/894`) — stale-closure risk only; not crashes.

---

## Integration status

| Integration | Status | Required env vars | Degrade behavior if unset |
|---|---|---|---|
| **Resend (email)** | WIRED | `RESEND_API_KEY` (req), `RESEND_FROM_EMAIL` (opt, defaults `rush@phisig-usc.com`), `RESEND_FROM` (opt, invites only) | Mock mode — logs `[Mock Email]`, returns `{ok:true, mock:true}`. No crash. |
| **Stripe (dues + donations)** | WIRED | `STRIPE_SECRET_KEY` (req), `dues.stripeWebhookSecret` via SiteConfig (req for webhook), `NEXT_PUBLIC_SITE_URL` (opt) | `getStripe()` returns null → routes 503 "not configured"; webhook 503. No crash, no double-credit. |
| **Google Calendar** | WIRED | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (both req), `ADMIN_SESSION_SECRET` (OAuth-state HMAC) | `isGoogleCalendarConfigured()` false → every fn returns "not configured" sentinel; UI shows placeholder. No crash. |
| **Twilio SMS** | WIRED | `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_PHONE_NUMBER` (all req) | Mock mode — logs to `SmsLog` with `status: MOCK_NO_CREDS`, returns `{mode:"mock"}`. No crash. Inbound STOP/HELP handling present. |

Supporting: `BLOB_READ_WRITE_TOKEN` (Vercel Blob uploads — degrades to dev mock), `TAVILY_API_KEY` (rushee auto-enrich — skipped if unset), `CRON_SECRET` (cron auth), `DATABASE_URL` + `DATABASE_URL_UNPOOLED` (Postgres — required for everything).

---

## VERDICT

**ZERO crash-class bugs — ship-clean.**

`tsc` clean, lint clean (0 errors), all 9 focus areas traced to source with no confirmed CRITICAL or HIGH runtime-crash, data-integrity, or auth-bypass defects. The codebase is uniformly defensive: try/catch around every body parse, null-checks before every Prisma member access, mock-mode degrade for every external integration, signature-verified + idempotent Stripe webhook, and gated cron + admin routes. The 3 MEDIUM items are hardening suggestions, not bugs. Confirm the 4 production secrets (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `ADMIN_SESSION_SECRET`, `PORTAL_SESSION_SECRET`) are set in Vercel before relying on those features live.
