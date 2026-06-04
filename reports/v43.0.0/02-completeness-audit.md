> _Part of [[projects/plug and play greek life/_INDEX|Greekstack — Plug-and-Play Greek Life]] · companion: [[projects/plug and play greek life/README|README]] · [[projects/plug and play greek life/FINAL|FINAL]]._

# R43 Completeness Audit — Phi Sigma Kappa Chapter Platform

Scope: final pre-nationals scan covering TODOs, dead code, admin-route patterns,
audit coverage, white-label gaps, email/SMS templates, empty-state consistency,
schema drift, cron coverage, and doc accuracy.

---

## HIGH

### H1. SMS inbound replies still hardcode "Phi Sigma Kappa Gamma Triton (USC)"
- `app/api/sms/inbound/route.ts:141,158,175,176,180,185` — every CTIA-mandated reply (HELP, STOP, START, YES, fallback) is a string literal. A re-skinned chapter sends the wrong name back to its own pledges and breaks TCPA branding consistency.
- Fix: load `cfg` once at top of `POST`, build `appShortTitle`/`fraternityName`+`greekLetters`+`schoolShort` strings, interpolate.

### H2. Events ICS feed hardcodes calendar identity
- `app/api/events.ics/route.ts:41,43,48,61` — `X-WR-CALNAME`, description, `PRODID`, and the UID domain `phisigmakappa.vercel.app` are literal. A re-skinned deploy will publish a feed branded for Gamma Triton.
- Fix: read `cfg["chapter.fraternityName"]`, `cfg["chapter.greekLetters"]`, `cfg["chapter.schoolShort"]`; use `origin` for the UID domain (already computed on line 22).

### H3. Public manifest + OG/Twitter images hardcoded
- `app/manifest.webmanifest/route.ts:13–16` (name/short_name/description), `app/opengraph-image.tsx:4,89,92`, `app/twitter-image.tsx:4,79,82`, and `app/page.tsx:41–55` (`generateMetadata`) all use string-literal "Phi Sigma Kappa Gamma Triton — Rush at USC".
- Fix: each of those four files should pull from `getSiteConfig()` (manifest already runs at request time; OG/Twitter images and `generateMetadata` are server-rendered and can `await` cfg).

### H4. Email broadcast `from` header + default subject hardcoded
- `app/api/admin/broadcast/route.ts:122,133` — `Phi Sigma Kappa USC <…>` and `"Phi Sigma Kappa USC — Chapter Update"` are literal.
- `app/api/admin/brother-invites/route.ts:24,28,38,48` — same problem: invite email `From`, body copy ("Gamma Triton, USC"), subject ("Welcome to Phi Sigma Kappa…"), and SMS body all hardcoded.
- `app/api/send-email/route.ts:32,39,70` — email footer "Phi Sigma Kappa · University of South Carolina" + `Phi Sigma Kappa USC <…>` from-header.
- Fix: helper `chapterEmailFrom(cfg)` returning `${fraternityName} ${schoolShort} <${fromAddr}>` and use it across all three routes.

### H5. `EmptyState` component shipped but never imported (R42 regression)
- `components/admin/empty-state.tsx` is the new reusable component. Only `FINAL.md` references it; **zero** `.tsx` files import it.
- Meanwhile flat "No X yet" text still lives at `components/admin/announcements-manager.tsx:141`, `components/admin/events-manager.tsx:195,215,492`, `components/admin/rush-funnel.tsx:132`, `components/admin/roster.tsx:561`, `components/brother/polls-feed.tsx:234`, `components/admin/audit-client.tsx:77`, `components/admin/brother-leaderboard.tsx:117`.
- Fix: import `EmptyState` and replace those eight call-sites.

### H6. `Document` Prisma model is fully orphaned
- `prisma/schema.prisma:204–212` defines `Document` (name/url/category/size). Zero references anywhere in `app/`, `components/`, `lib/`.
- Fix: either build the missing `/admin/documents` UI + `/api/admin/documents` route, or drop the model in a migration. Shipping a column with no surface bloats the schema and confuses re-skinning chapters.

---

## MEDIUM

### M1. Admin mutations missing `audit()` coverage
- `app/api/admin/attendance/route.ts:34` — `prisma.attendance.upsert` writes a row with no audit entry. E-board can't answer "who marked Jane absent?".
- `app/api/admin/brother-invites/route.ts:90,122` — POST (create invite) and DELETE (revoke invite) both write but neither calls `audit()`. Invites carry brother-creation power; trail is essential.
- Fix: add `await audit({ action: "ATTENDANCE_MARKED" | "INVITE_SENT" | "INVITE_REVOKED", … })` to each.

### M2. `BrotherInvite` rows never cron-pruned
- Schema sets `expiresAt` (30 d) but `app/api/cron/cleanup/route.ts` only sweeps `RushSubmitLog` (24 h) and `AuditLog` (365 d). Expired/used invites accumulate forever.
- Fix: add a third `deleteMany` pass for `BrotherInvite` where `expiresAt < now AND status IN ('EXPIRED','COMPLETED','REVOKED')` (or just `expiresAt < now - 30 d`).

### M3. `EmailLog` / `SmsLog` models exist but no row is ever written
- Grep for `prisma.emailLog`/`prisma.smsLog` shows zero writers in `app/api/admin/broadcast/route.ts` or `app/api/send-email/route.ts` — only the schema and a couple `Rush.emailLogs` relations.
- Fix: either log every outbound send (recommended for TCPA receipts), or drop the two models. Today they're dead weight that look like compliance plumbing.

### M4. `app/parents/page.tsx:81` — coat-of-arms `alt` text + comment hardcoded
- Line 75 + 81: comment and `alt="Phi Sigma Kappa coat of arms"` are literal even though page already loads `cfg["chapter.fraternityName"]` at line 18,57.
- Fix: interpolate `${fraternityName} coat of arms`.

### M5. SALES.md / FINAL.md / DEPLOY.md drifted vs. white-label reality
- `SALES.md:5,89` and `FINAL.md:4–10`, `DEPLOY.md:33,51–69` still describe the deploy as `phisigmakappa.vercel.app` and "the USC reference deploy." That's fine for the reference, but nationals will read these to evaluate the white-label pitch. Add a one-paragraph "for non-Gamma-Triton chapters, swap NEXT_PUBLIC_SITE_URL and the cfg keys listed below" callout to `DEPLOY.md` and `FINAL.md`.

### M6. `lib/enrich.ts:21,28,36` + `app/api/admin/enrich/route.ts:21,28,36` hardcode "University of South Carolina" / "USC directory"
- The PNM auto-research helper searches `${name} University of South Carolina`. A Texas A&M chapter using this gets irrelevant results.
- Fix: read `cfg["chapter.schoolName"]` and `cfg["chapter.schoolShort"]`; build the directory URL from `cfg["chapter.directoryUrl"]` (new key).

---

## LOW

### L1. Hardcoded national hotline tel link
- `app/parents/page.tsx:157` uses `tel:+18886684293` (HazingPrevention.Org hotline) while the **display number** comes from `cfg["antiHazing.hotline"]`. If a chapter overrides the hotline display string, the `tel:` link won't match.
- Fix: also drive `href` from cfg, with `+18886684293` as fallback.

### L2. `app/api/rush/route.ts:36` SMS confirm body hardcodes "Phi Sig USC Gamma Triton"
- This is the **first** message a PNM receives. A re-skinned chapter sends Gamma Triton branding to their own pledge.
- Fix: cfg interpolation.

### L3. CTIA reply phone-help addresses hardcoded
- `app/api/sms/inbound/route.ts:141,180` both reference `rush@phisig-usc.com` as the help address. Should pull from `cfg["contact.rushEmail"]`.

### L4. `lib/utils.ts:34` comment "The chapter is at USC" is misleading
- Code below pins TZ to `America/New_York`. White-label deploys at a Pacific or Mountain school will silently render wrong times.
- Fix: either (a) make TZ a cfg key (`chapter.timezone`), or (b) update the comment + add a TODO in the wizard. Currently a silent foot-gun.

### L5. The `Vote.value: 0` neutral row is still in the schema comment
- `prisma/schema.prisma:230` comment says `0 neutral` but `app/api/admin/vote/route.ts:14` rejects 0. Schema comment now lies.

### L6. `components/admin/setup-wizard.tsx:156` references `USC garnet #73000A` as the only color example
- One-line copy update: add 2–3 cross-school examples (already done in `DEPLOYMENT.md:126` — just port the same list).

### L7. `app/admin/help/page.tsx` (R31) — verify no stale env names
- R31.1 redacted credentials. Worth a re-check: do any "see the source" or "developer" copy strings remain that imply Ben/Gamma Triton ownership? (Out-of-scope grep; flag for batch.)

---

## Findings Summary

- **HIGH:** 6
- **MEDIUM:** 6
- **LOW:** 7

**Recommended R43-B batch (HIGH only):** H1 + H2 + H3 + H4 share a single helper extraction (`lib/chapter-identity.ts` exporting `chapterIdentity(cfg)`); landing them together avoids three near-identical patches. H5 is one mechanical sweep of eight imports. H6 is a 5-line schema migration. Estimated <2 hours of agent time for all six.

After R43-B, the white-label pitch to nationals is honest: every user-visible chapter string is cfg-driven, every admin mutation has an audit trail, and every shipped component is actually wired up.
