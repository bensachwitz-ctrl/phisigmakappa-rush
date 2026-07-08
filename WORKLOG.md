# Greek Stack — Work Log

Branch: `consolidate/all-2026-07-07` · Local-only finalization (no push / no deploy).
Health as of 2026-07-08: `npx tsc --noEmit` **exit 0 (clean)**; smoke gate tests
**green** (see `test-greekstack.ps1`).

## Status

| Section | Status | Proof (commit + test) | Updated |
|---|---|---|---|
| Billing gate — require billing before a chapter subdomain goes live | DONE | `71ba1f9` · `tests/billing-lockout.test.ts`, `tests/billing-lockout-server-guard.test.ts`, `tests/billing-double-charge-guard.test.ts` (green) | 2026-07-07 |
| Go-live gate — shared public-route decision (`lib/chapter-live-guard.ts`) | DONE | `71ba1f9` · `tests/chapter-live-gate.test.ts`, `tests/platform-billing-publish.test.ts` (green) | 2026-07-07 |
| Remnants — event past-date guard + tenant-migration applier + Stripe test coverage | DONE | `3704b65` · `tests/event-past-date-guard.test.ts` (green), `lib/tenant-migrations.ts` | 2026-07-07 |
| Critique fixes — adversarial money + go-live gaps (P0/P1/P2/P3) | DONE | `c6ad2c7` · `tests/dues-double-charge-guard.test.ts`, `tests/donation-double-charge-guard.test.ts`, `tests/dues-refund-webhook.test.ts`, `tests/reconcile-intro-fee.test.ts` (green) | 2026-07-07 |
| Content editor — FAQ/eboard/register section editing + structured Section builder | DONE | `e4730df`, `e25773d`, `71c54ef` · `tests/section-builder.test.ts`; DDL `prisma/manual-migrations/2026-06-30_section_builder.sql` | 2026-07-07 |
| Stripe — dues + donations + platform billing (branded invoices/receipts, reconcile cron) | DONE (code) / BLOCKED (2 dashboard steps) | `0e7b055`, `5516dc5` · `tests/dues-webhook-secret-source.test.ts`, `tests/stripe-connect.test.ts`, `tests/reconcile-intro-fee.test.ts`; see `STRIPE-BRANDING-TODO.md` | 2026-07-07 |
| Supabase readiness — schema doc + cutover runbook | DONE | `SUPABASE-SETUP.md` (54-model / 52-table split, exact env switch, provisioning notes, RLS/REVOKE owner SQL) | 2026-07-08 |
| Supabase live switch (Neon → Supabase) | TODO (owner-gated) | one-paste env change in `SUPABASE-SETUP.md §3`; blocked on owner connection string — see Blockers | 2026-07-08 |
| Smoke script — local pre-handover gate | DONE | `test-greekstack.ps1` (prisma generate + tsc + next lint + billing/dues/go-live/event gates, `--maxWorkers=2`) | 2026-07-08 |
| Type-check / build health | DONE | `npx tsc --noEmit` exit 0; `prisma generate` OK (v5.22.0) | 2026-07-08 |

## Blockers

| Blocker | Owner | Why it can't be done here | Where documented |
|---|---|---|---|
| Supabase live switch = owner-gated connection string | Owner | `DATABASE_URL`/`DATABASE_URL_UNPOOLED` must point at Supabase `lxntjbivrxzdbftfqhij`; the greek-stack DB password is not retrievable here and must NOT be reset (reset invalidates Vercel wiring). Also: the connected Supabase MCP token has NO access to the project (empty `list_projects`, permission-denied on every project call), so parity could not be machine-verified. | `SUPABASE-SETUP.md §1, §3` |
| `rls_auto_enable` REVOKE + enable-RLS on public tables | Owner | Advisor flagged `EXECUTE` on `public.rls_auto_enable()` for anon/authenticated. Could NOT run via MCP (token lacks access). Exact SQL recorded for one-paste run in the Supabase SQL editor. | `SUPABASE-SETUP.md §5` |
| Stripe branding — 2 dashboard-only steps | Owner | Restricted key (`rk_live_…`) intentionally lacks `rak_accounts_kyc_basic_*`; account logo/brand color + public business name are account-level and cannot be set via API. ~3 min of clicks. | `STRIPE-BRANDING-TODO.md` |
| CI red | Owner | GitHub Actions billing limit, not a code issue; verified locally. | `README-CI-BILLING-NOTE.md` |

## RESUME

RESUME: next = owner runs `SUPABASE-SETUP.md §3` env switch + `§5` RLS/REVOKE SQL, then `npx prisma db push` to Supabase and confirms `public` = 54 tables (§7); app-side is green (tsc clean, gate tests passing) and the 2 Stripe dashboard branding clicks (`STRIPE-BRANDING-TODO.md`) are the only other owner-only items.
