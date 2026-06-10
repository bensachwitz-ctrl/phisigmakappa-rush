# Greek Stack — Elevation Spec (2026-06-09)

Goal: incorporate every relevant skill, OSS tool, and proven feature from Ben's other
projects into the white-label Greek-life SaaS so it's the most complete chapter platform.
Code: `C:\Users\Bensa\working code\projects\greek-stack` (Next14/Prisma/Neon, schema-per-tenant
multitenant — see vault [[multitenant-saas-platform]]). Live: greekstack.vercel.app.
**Local-only branch (master, ce4ef18). No deploy without approval.**

## Incorporate (skill / OSS → feature)
| Capability | Use | Source note |
|---|---|---|
| Auth (social/magic-link/2FA/orgs/passkeys) | replace/upgrade auth | [[better-auth]] |
| Forms (drag-drop + JSON-schema) | rush apps, intake, surveys | [[formio_skill\|Form.io]] |
| E-signature | bid acceptance, liability, alumni | [[documenso_skill\|Documenso]] |
| PDF generation (offline) | dues invoices, rosters, reports | [[pdfme_skill\|pdfme]] + [[Stirling-PDF]] |
| Email | transactional + campaigns | [[react-email]] (Resend) + [[mautic]]/[[listmonk]] (rush drip) |
| Analytics | engagement, funnels, replay | [[posthog_skill\|PostHog]] + [[plausible_skill\|Plausible]] |
| Search | members/events/docs Cmd+K | [[meilisearch-search]] |
| Payments | dues, subscriptions, refunds | existing Stripe Connect (248715f pattern from Phi Sig) |
| UI / motion | polish to Apple-tier | [[design-motion-principles]] + [[react-bits]] + [[GlowUI]] + [[shadcn_ui_design_system_skill\|shadcn]] |
| Role-aware portal | officer/member/alumni RBAC | [[nextjs-roleaware-portal]] + [[nextjs-cross-tab-auth]] |
| Tamper-evident audit | financial/incident logs | [[hashchain-audit-log]] |
| Invoicing | chapter billing | [[nextjs-invoicing-module]] |
| CRM | recruitment pipeline | [[pipedrive]] |
| NotebookLM | chapter knowledge Q&A | `.notebooklm/` (this repo) + [[graphify]]/[[open-notebook]] |

## Port proven features from sibling projects
- **Phi Sig** (`phisigmakappa-rush`) — alumni single-use invite onboarding ([[project_phisig_alumni_onboarding]]), 15 officer dashboards, study log, chores rotation, anonymous incident report. Greek Stack should generalize these as white-label modules.
- **Bar Crawl Golf** — tournaments + realtime + push/local notifications → chapter events/brotherhood points + live leaderboards.
- **DailyTool** — reminders-on-every-feature pattern → dues/event/study reminders.
- **Swamp Fox** — role-scoped access + audit-and-notify on every mutation + Cmd+K action catalog → chapter ops governance.

## Phased build (each: implement → tsc → vitest → `next build` → commit; NO deploy)
1. **Foundation**: confirm multitenant boundary intact ([[multitenant-saas-platform]] FAIL-OPEN entitlement + tenant-bound HMAC), build green, baseline tests.
2. **Auth + RBAC**: better-auth + role-aware portal (officer/member/alumni/national).
3. **Recruitment**: Form.io rush apps → pipeline (Pipedrive) → e-sign bids (Documenso) → drip email (Mautic/listmonk).
4. **Operations**: events+realtime+points (BCG patterns), reminders (DT pattern), incident/chores/study (Phi Sig), audit log (hashchain).
5. **Financials**: invoicing + Stripe dues/subscriptions + PDF receipts (pdfme) + refunds.
6. **Polish**: motion principles + react-bits/GlowUI, PostHog/Plausible, Meilisearch Cmd+K, NotebookLM chapter assistant.

## Verify-first caveat
Greek Stack already has substantial functionality (app/components/lib/prisma present, 55k files). Each phase must START by auditing what already exists (avoid rebuilding) — per [[feedback_do_not_break]] + verify-first.

Related: [[project_greekstack]] · [[reference_2026-06-09_vault_reorg]] · [[_OSS-CATALOG]] · [[_SELF-HOST-STACK]]
