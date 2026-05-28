# Phi Sigma Kappa — End-to-End Flow Verification (v1.0.2)

**Date:** 2026-05-28
**Tester:** @tester (CC_GodMode)
**Repo:** `phisigmakappa-rush` · **Live:** https://phisigmakappa.vercel.app (R45)
**Method:** `npx tsc --noEmit` (clean, exit 0) → code-path trace per flow (route handler + caller + Prisma reads/writes) → live curl probes of public endpoints.

---

## Flow results

| # | Flow | Status | Evidence |
|---|------|--------|----------|
| 1 | **Alumni onboarding (NEW)** | **WORKS** | Invite create `app/api/admin/alumni-invites/route.ts:93-170` (admin+role gate L94-95, 24-byte base64url token L127, 30d expiry L128, optional `alumniId` bind L114-124, Resend L37-61 / Twilio L63-81 / link, audit L158-167). Redeem GET `app/api/alumni/onboard/[token]/route.ts:72-122` (loadInvite L58-70 enforces revoked/completed/expired/not-found, auto-flips EXPIRED L64-66, prefill from bound profile). POST L124-235: consent required L137-139, pw match L140-142, **email-uniqueness 409** L156-162 (`PortalUser.email @unique` schema L942), no-dup-profile (bind→match-by-email→create) L185-198, **single-use burn** COMPLETED L211-214, **auto-login cookie** `setPortalCookie` L217. UI button `components/admin/alumni-manager.tsx:80-115,331,363+` (modal, email/sms/link). Page renders all 5 invalid states `app/alumni/onboard/[token]/page.tsx:166-194`. **Live:** GET /api/alumni/onboard/bogus→404 JSON `{"ok":false,"reason":"not-found"}`; /alumni/onboard/bogus→200; /api/admin/alumni-invites→401 `{"ok":false}`. |
| 2 | **Alumni directory + join + vouch + donate** | **WORKS** | Directory PII strip `lib/alumni.ts:55-81` `publicAlumniView` (no email/phone projected). Join `app/api/alumni/join/route.ts:45-132` (validate, soft-dedupe by email L80-93, create row). Vouch `app/api/alumni/vouch/route.ts` (portal/admin gate L13-15, upsert/delete on `rushId_alumniId`). Donate `app/api/alumni/donate/checkout/route.ts:17-103` (PENDING `AlumniDonation` L52-60, Stripe session L65-90, `stripeSessionId @unique` saved L93-96, 503 when Stripe unconfigured L40-45). Reconciled in webhook `handleDonationCompleted`. **Live:** /alumni→200, /api/alumni/vouch POST→401. |
| 3 | **Portal logins (brothers/alumni/pnm)** | **WORKS** | `lib/portal-auth.ts`: HMAC token L91-96, verify+expiry L104-123, HttpOnly+Secure cookie L154-162, role baked in, `requireRole` gate L222-231, prod secret guard L54-68. Alumni login `app/api/portal/alumni/login/route.ts` (role-scoped lookup L24-26, `verifyPassword` L28, uniform 401, lastLogin update). Register exists + scrypt hash. **Live:** /portal→200, /portal/alumni→200. |
| 4 | **Rush pipeline** | **WORKS** | `/api/rush` exists; admin `app/api/admin/rushees/[id]/route.ts` (GET/PATCH gated `isAdminAuthed`+`isAdminRole` L42,105-108), `[id]/bid` + `[id]/impressions` subroutes present. Bid response `app/api/bid/[token]/route.ts` + page `app/bid/[token]/page.tsx`. |
| 5 | **Dues (Stripe)** | **WORKS — no double-credit** | Checkout `app/api/dues/checkout/route.ts:42-184` (auth L43-46, rate-limit 5/min L49-54, **idempotent 409 if already PAID** L85-93, PENDING row L101-110, session-id saved L162-165, graceful 503 L64-73). Webhook `app/api/dues/webhook/route.ts:27-86` (**signature verify** `constructEvent` L52, 400 on bad sig L55, **idempotent** `if status==="PAID" return` L114/204/255/288, `$transaction` credit L137-157). 503 when unconfigured. **Live:** /api/dues/checkout POST→401. |
| 6 | **Events + RSVP + ICS** | **WORKS** | `app/api/events/route.ts` (public GET 200). RSVP `app/api/events/[id]/rsvp/route.ts` (auth-gated L31-34, upsert on `eventId_brotherId` composite). `app/api/events.ics/route.ts` present. **Live:** /api/events→200, /api/events.ics→200, /schedule→200. |
| 7 | **Polls** | **INCOMPLETE — alumni polls unreachable** | See finding below. Brother polls fully work (create/vote/close, anonymous, 14-day window). |
| 8 | **Admin dashboards** | **WORKS** | All `/admin/*` gated in `middleware.ts:43-53` (verifyEdgeSession → redirect /admin/login). Pages present: academic, announcements, audit, brothers, chores, dues, events, polls, risk, rushees, settings, setup, help. API routes use `isAdminAuthed`/`isAdminRole`. CSRF same-origin check on mutations. **Live:** /admin→307 redirect to login. |
| 9 | **Google Calendar** | **WORKS — graceful** | Routes connect/callback/status/disconnect `app/api/google-calendar/*` + admin sync `app/api/admin/google-calendar/sync/route.ts` (gated `getCurrentBrother`). Status `app/api/google-calendar/status/route.ts:10-28` returns `{configured, linked:false}` when no session/unconfigured — no throw. **Live:** /api/google-calendar/status→200. |
| 10 | **Cron + exports** | **WORKS** | `app/api/cron/cleanup/route.ts:35-37` + `send-scheduled-announcements/route.ts:32` both CRON_SECRET bearer/query gated, localhost fallback in dev. HQ exports under `app/api/admin/export(s)`. |

---

## CRITICAL FINDING — Flow 7 poll audience (INCOMPLETE)

The prior audit's suspicion is **confirmed**. Alumni will always see **zero polls** on their dashboard:

- **`prisma/schema.prisma:589`** — `Poll.audience String @default("BROTHERS")`. `PollVote` supports `alumniId` (L604, `@@unique([pollId, alumniId])`).
- **`app/portal/alumni/dashboard/page.tsx:112-116`** — alumni dashboard queries `prisma.poll.findMany({ where: { audience: "ALUMNI", closedAt: null } })`.
- **`app/api/polls/route.ts:160-166`** — the poll-create handler **never sets `audience`**, so every poll created falls back to the schema default `"BROTHERS"`.
- **`components/brother/polls-feed.tsx:580-583`** — the create-poll UI body is `{ question, options, closesAt }` only. **No audience selector is offered.**

**Net effect:** there is no path — UI or API — to create an `audience:"ALUMNI"` poll, so the alumni dashboard's audience filter matches nothing. Vote plumbing for alumni exists and works (`app/api/polls/[id]/vote/route.ts:35-36`), but no alumni-targeted poll can ever be created. **Not a crash — a wiring gap.** Fix = add an audience selector to the create UI + accept/persist `audience` in `CreatePollSchema` + the `prisma.poll.create`.

(Note: brother-facing polls are fully functional.)

---

## VERDICT

**9 of 10 flows WORK end-to-end. 1 flow (Polls) is INCOMPLETE: alumni-audience polls are uncreatable, so the alumni dashboard poll feed is permanently empty. No BROKEN flows; no crash-class defects; tsc clean; all live public probes returned expected codes.**
