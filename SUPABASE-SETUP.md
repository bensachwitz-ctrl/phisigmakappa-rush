# Supabase Setup & Cutover — Greek Stack

Status of this document: **readiness + owner-gated cutover runbook.** The app is
currently LIVE on **Neon** Postgres (`DATABASE_URL` in `.env.local` points at
`*.neon.tech`, pooled). Supabase project **`greek-stack`** (ref
`lxntjbivrxzdbftfqhij`) is provisioned and standing by. The Neon → Supabase switch
is a **single env change** (below) and is **owner-gated** — do NOT flip it in this
repo. The greek-stack DB password is not retrievable from here and must not be
reset (resetting it would invalidate whatever is already wired in Vercel).

Last verified: 2026-07-08 on branch `consolidate/all-2026-07-07`.

---

## 0. TL;DR — what an owner does to cut over

1. In the Supabase dashboard, click **Connect** on project `lxntjbivrxzdbftfqhij`
   and copy the two connection strings (transaction pooler `:6543` and direct/
   session `:5432`).
2. Set the three env vars (Vercel prod + local `.env.local`) — see
   **§3 The exact one-paste switch**.
3. `npx prisma generate && npx prisma db push` → materializes the 54-table schema
   in `public`.
4. Run the **owner SQL** in §5 (enable RLS on public tables + the
   `rls_auto_enable` REVOKE the advisor flagged).
5. Provision/verify a tenant and run the **§7 seed/verify checklist**.

Nothing else in the codebase changes: `provider` stays `postgresql`, all Prisma
models, `lib/schema.sql`, and every route are DB-vendor-agnostic.

---

## 1. Current state (as shipped)

| Aspect | Current value |
|---|---|
| Live DB | **Neon** Postgres (`DATABASE_URL` → `*.neon.tech`, pooled; `DATABASE_URL_UNPOOLED` → direct) |
| Target DB | Supabase project `greek-stack`, ref **`lxntjbivrxzdbftfqhij`** |
| Prisma provider | `postgresql` (unchanged for Supabase) — `datasource db { url = env("DATABASE_URL"); directUrl = env("DATABASE_URL_UNPOOLED") }` |
| Prisma models | **54** (see §2) |
| Migration model | **`prisma db push`** (schema-first). There is **no `prisma/migrations/` folder** — do NOT expect `prisma migrate deploy` to have history. Ad-hoc tenant patches live in `prisma/manual-migrations/*.sql`. |
| Auth | **Custom** HMAC-signed, per-tenant-bound cookie sessions (`lib/auth.ts`, `lib/portal-auth.ts`) + scrypt password hashing (`lib/password.ts`) + HMAC OTP reset (`lib/otp.ts`). `better-auth@^1.1.1` is an installed dependency but is **not imported anywhere in source** — see §6. |
| File storage | **Vercel Blob** (`@vercel/blob`, `BLOB_READ_WRITE_TOKEN`) — headshots, documents, e-sign, exports. See §6. |

### Supabase MCP verification note (why parity was not machine-confirmed)

The Supabase MCP is connected, but the **token attached to it has no access to
project `lxntjbivrxzdbftfqhij`**: `list_projects` returns an empty list and every
project-scoped call (`list_tables`, `list_migrations`, `get_advisors`,
`execute_sql`, `get_project`) returns **`-32600 You do not have permission to
perform this action`**. Consequently:

- **Schema parity could not be read back from Supabase directly.** The figures in
  §2 are authoritative from the codebase; an owner with dashboard/service-role
  access should confirm them against `public` after `db push` (query in §7).
- **The security REVOKE could not be executed via MCP** and is recorded as an
  owner step in §5.

To fix MCP access later: re-connect the Supabase MCP with a Personal Access Token
(or org token) whose scope includes this project/org.

---

## 2. Schema: the 54-model / 52-table split

Greek Stack is **schema-per-subdomain multi-tenant** on one Postgres database:

- **`public` (central registry)** — holds the platform-wide tables. The app
  actively reads/writes exactly three here via `centralDb`:
  `Tenant`, `OnboardAttempt`, and `RushSubmitLog` (onboard subdomain-availability
  rate limit). Because Prisma has a single schema file, `prisma db push` against
  `DATABASE_URL` physically creates **all 54 tables** in `public` — the extra ~51
  are simply unused there (the tenant data lives in per-tenant schemas).
- **`schema_<subdomain>` (one per chapter)** — created on provisioning by
  `lib/provision.ts` → `applyTenantDdl()` running **`lib/schema.sql`**, which
  contains **52 `CREATE TABLE` statements**. These are the 54 Prisma models minus
  the two central-only tables **`Tenant`** and **`OnboardAttempt`**.

**Counts to reconcile against Supabase after `db push`:**

| Location | Expected tables |
|---|---|
| `prisma/schema.prisma` models | **54** |
| `public` after `prisma db push` | **54** (base tables) |
| Each `schema_<subdomain>` (via `lib/schema.sql`) | **52** |

> Drift note: the finalization brief referenced a "53-table schema." The current
> exact count is **54 Prisma models / 52 per-tenant DDL tables**. If a Supabase
> `public` schema was pushed at an earlier point and now shows 53 tables, that is
> a **1-table drift** — reconcile by re-running `npx prisma db push` (it is
> additive and idempotent). This is the single item an owner should confirm once
> MCP/dashboard access is restored.

The 54 models: Rush, RushImpression, RushSubmitLog, RushConsent, Event,
EventCheckIn, BrotherRSVP, Attendance, Brother, DuesPayment, BudgetLine, Expense,
Announcement, AnnouncementRead, BrotherInvite, AlumniInvite, Document,
OfficerPosition, OfficerAssignment, Election, ElectionSeat, ElectionCandidate,
ElectionBallot, MemberStatusChange, SiteConfig, Section, SectionContent, Vote,
EmailLog, SmsLog, Poll, PollVote, AuditLog, ChapterMeeting,
ChapterMeetingAttendance, ChoreWheelTask, ChoreWheelAssignment, IncidentReport,
IncidentAcknowledgment, ServiceEvent, ServiceHourLog, ServicePartnerOrg,
AlumniProfile, AlumniDonation, GoogleCalendarLink, HqExportRun, PortalUser,
PortalPasswordReset, PortalDuesPayment, AlumniVouch, **OnboardAttempt** (central),
**Tenant** (central), JobPosting, SoberDriverShift.

---

## 3. The exact one-paste switch

Replace the Neon values with Supabase's. **Provider stays `postgresql`.** Get the
exact strings from **Supabase → Project → Connect** (they include the real
password and AWS region; `<PASSWORD>` and `<REGION>` are placeholders below).

```dotenv
# ── Supabase: transaction pooler (PgBouncer/Supavisor), port 6543 ──────────────
# Used by centralDb (public registry) under serverless load. pgbouncer=true is
# REQUIRED for Prisma (disables prepared statements on the transaction pooler).
DATABASE_URL="postgresql://postgres.lxntjbivrxzdbftfqhij:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# ── Supabase: direct / session, port 5432 ─────────────────────────────────────
# Used by (a) `prisma db push` and (b) EVERY per-tenant runtime client + tenant
# provisioning (see §4 — this is NOT migration-only for this app). Must be a
# SESSION-capable endpoint so `?schema=` / `SET search_path` / DDL work.
DATABASE_URL_UNPOOLED="postgresql://postgres.lxntjbivrxzdbftfqhij:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.lxntjbivrxzdbftfqhij:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"
```

`DATABASE_URL_UNPOOLED` and `DIRECT_URL` are the **same value** here (Prisma's
`directUrl` reads `DATABASE_URL_UNPOOLED`; some scripts/tooling read `DIRECT_URL`
— keep them identical, matching how the Neon integration is wired today).

**Which 5432 endpoint to use for the unpooled slot (important):**

- **Session pooler** `aws-0-<REGION>.pooler.supabase.com:5432` (user
  `postgres.<ref>`) — **recommended.** Session mode gives each client its own
  backend, so `?schema=`/`options=-c search_path` and `CREATE SCHEMA` all behave,
  it is IPv4-friendly, and it survives serverless connection churn. This is the
  right fit because this app runs **live per-tenant queries** over the unpooled
  string, not just one-shot migrations.
- **Raw direct** `db.lxntjbivrxzdbftfqhij.supabase.co:5432` (user `postgres`) —
  only if you have IPv6 egress or the Supabase IPv4 add-on. Works, but less
  resilient under many short-lived serverless connections.

> Do NOT point the unpooled/direct slot at the `:6543` transaction pooler: the
> transaction pooler multiplexes per-statement and rejects the `options=-c
> search_path=...` startup parameter that provisioning appends — tenant queries
> would silently land on the wrong schema. §4 explains why.

---

## 4. How schema-per-subdomain provisioning works against Supabase

Two code paths build tenant connection URLs off the **unpooled** base
(`DATABASE_URL_UNPOOLED || DATABASE_URL`):

1. **Provisioning** — `lib/provision.ts` (`provisionTenant`), also used by
   `app/api/onboard/route.ts`:
   - `centralDb.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "schema_<sub>"')`
   - opens a fresh `PrismaClient` on
     `…?schema=schema_<sub>&options=-c%20search_path=schema_<sub>`
   - runs `lib/schema.sql` (52 tables) via `applyTenantDdl()`, then seeds
     `SiteConfig`, the officer catalog, and the first admin `Brother`.
   - Full `DROP SCHEMA … CASCADE` + `Tenant` row delete on any failure (atomic).
2. **Runtime tenant queries** — `lib/prisma.ts` `getCachedClient()` /
   `getTenantClient()`: builds `…?schema=schema_<sub>` off the **unpooled** base
   and caches one `PrismaClient` per schema.

Implications for Supabase:

- The `:5432` (session/direct) endpoint carries **provisioning DDL *and* all live
  per-tenant reads/writes**. It must be session-capable (hence §3's recommendation
  of the Session pooler). The `:6543` transaction pooler is used only by
  `centralDb` for the `public` registry tables (no custom `search_path` needed
  there, so PgBouncer transaction mode is fine).
- Subdomain → schema name sanitization (`[^a-zA-Z0-9] → _`, prefix `schema_`) is
  identical in `provision.ts` and `prisma.ts`; nothing about it is
  vendor-specific, so it ports to Supabase unchanged.
- Per-tenant schemas are **not** in Supabase's PostgREST-exposed schema list
  (only `public` is exposed by default), so chapter data is unreachable via the
  anon/publishable API regardless of RLS. That is an additional isolation win on
  Supabase over Neon.

---

## 5. Security hardening — RLS + the `rls_auto_enable` REVOKE (owner steps)

**Posture:** Supabase exposes the `public` schema through PostgREST using the
anon/publishable key. Prisma connects as the **owner/superuser role**, which
**bypasses RLS entirely**. So the correct, low-risk posture is: **enable RLS on
every `public` table with no permissive policies** → the anon/PostgREST API is
deny-by-default ("public API locked"), while Prisma (owner) keeps full access and
the app is unaffected. The operator `Tenant.isActive` flag remains the only hard
app-level switch.

### 5a. The flagged REVOKE (could not be executed here — MCP token lacks access)

The security advisor flagged `public.rls_auto_enable()` as executable by the
`anon` / `authenticated` roles. **Run this once as the owner** (Supabase SQL
Editor or a service-role `psql`):

```sql
-- Owner step: remove anon/authenticated EXECUTE on the RLS auto-enable helper.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
```

If the function has a non-default signature, target it explicitly, e.g.:
```sql
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
```
(`rls_auto_enable` is a **database-side** object — it is not defined anywhere in
this repo — so it can only be modified in Supabase, not via app code.)

### 5b. Enable RLS on all public tables (recommended, owner step)

```sql
-- Enable RLS (deny-by-default) on every base table in public. Safe: Prisma's
-- owner role bypasses RLS, so the app keeps working; only the anon/PostgREST
-- surface is locked down.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
```

Re-run `get_advisors(type:"security")` (once MCP access is restored) after these
to confirm the findings clear.

---

## 6. Decision: KEEP better-auth-stack + Vercel Blob (do NOT adopt Supabase Auth/Storage)

**Decision: keep the current auth and storage stacks. Migrate the database only.**

### Auth — keep custom sessions (+ the installed `better-auth` dep)

What's actually in use today (verified — `better-auth` has **zero source imports**;
grep of all `*.ts/*.tsx` returns nothing):

- `lib/auth.ts` — HMAC-SHA256-signed admin cookie (`phisig_admin`), 12h TTL, with
  a **per-tenant signing key** (`HMAC(rootSecret, "gs-tenant:<sub>")`) so a cookie
  minted on chapter A is cryptographically unusable on chapter B. Refuses the dev
  fallback secret in production.
- `lib/portal-auth.ts` — brother/alumni/PNM portal sessions (`PortalUser`).
- `lib/password.ts` — scrypt hashing; `lib/otp.ts` — HMAC one-time-code reset.

Why not Supabase Auth:
- The custom scheme is **tenant-bound at the crypto layer** — a property Supabase
  Auth (single GoTrue instance, one JWT audience per project) does not give for
  free; we'd have to re-encode tenant scoping on top of it anyway.
- Sessions integrate directly with the schema-per-tenant Prisma clients and the
  officer-permission RBAC (`lib/permissions.ts`, `guardOfficerOrAdmin`). Swapping
  the identity layer would touch every admin/portal route for no functional gain.
- It is already hardened (P0 cross-tenant session-takeover fix, prod-secret
  enforcement, scrypt, single-use tokens) and covered by tests
  (`tests/auth-session-token.test.ts`, `tests/portal-otp-reset*.test.ts`).
- `better-auth` stays as a dependency (no harm, potential future use) but is not
  on the live path — nothing to migrate.

### Storage — keep Vercel Blob

- `@vercel/blob` (`BLOB_READ_WRITE_TOKEN`) backs headshots, the document library,
  e-sign PDFs, and HQ exports (`lib/esign.ts`, `app/api/upload-*`,
  `app/api/admin/library/upload`, `app/api/admin/exports/run`). Cloudinary is
  wired as an optional upgrade (`OWNER-KEYS-NEEDED.md §2`).
- Why not Supabase Storage: Blob is already live, CDN-backed, and the app deploys
  to Vercel — Blob is first-party there with no egress/config friction. Supabase
  Storage would add a second bucket/RLS surface and a client migration for the
  upload routes, with no capability the product needs today.

**Net:** Supabase is adopted as **Postgres only**. Auth and Storage are
deliberately unchanged — smallest blast radius, all existing hardening/tests stay
valid.

---

## 7. Seed / verify checklist

Run after setting the §3 env vars (local first, then prod):

- [ ] `npx prisma generate` — regenerate client (no schema change needed).
- [ ] `npx prisma db push` — create the 54-table schema in `public`
      (additive + idempotent; safe to re-run to clear the 53↔54 drift in §2).
- [ ] **Owner SQL** (§5): run the `rls_auto_enable` REVOKE + enable RLS on all
      public tables.
- [ ] Verify `public` table count:
      ```sql
      select count(*) from information_schema.tables
      where table_schema='public' and table_type='BASE TABLE';   -- expect 54
      ```
- [ ] Provision a test tenant (self-serve `POST /api/onboard`, or
      `provisionTenant()` from a script) and confirm the schema materialized:
      ```sql
      select nspname from pg_namespace where nspname like 'schema_%';         -- new schema present
      select count(*) from information_schema.tables
      where table_schema='schema_<sub>' and table_type='BASE TABLE';          -- expect 52
      ```
- [ ] If upgrading an **existing** Supabase that already has tenant schemas, apply
      `prisma/manual-migrations/*.sql` (auditlog hashchain, section builder,
      portal password reset) to each `schema_<sub>` — these are additive patches
      not covered by `db push`.
- [ ] Optional demo data: `npm run db:seed` (`prisma/seed.mjs`).
- [ ] App smoke: `pwsh ./test-greekstack.ps1` (prisma generate + tsc + lint +
      gate tests). Then `npm run dev` and log in on a tenant subdomain.
- [ ] Re-run Supabase `get_advisors(type:"security")` once MCP access is restored;
      confirm the `rls_auto_enable` and RLS findings are cleared.

---

## 8. Guardrails (do NOT do these)

- **Do NOT flip `DATABASE_URL` to Supabase in this repo.** The live cutover is
  owner-gated; changing the connection string here would repoint local/dev at a
  DB that may not yet be seeded.
- **Do NOT reset the greek-stack DB password.** It is not retrievable from here
  and a reset invalidates whatever is already wired in Vercel.
- **Do NOT `git push` / deploy** from this branch (local-only finalization).
- `provider` in `schema.prisma` stays `postgresql` — no code edit is part of the
  switch.
