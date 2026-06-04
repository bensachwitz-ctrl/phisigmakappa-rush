---
title: Greekstack — Plug-and-Play Greek Life Platform — folder index
updated: 2026-06-04
read_when: You're working on the white-label Greek-letter chapter platform (re-skinnable per chapter / national HQ SaaS). Open the digest (README) first, then the docs + reports below.
related: [[projects/_INDEX|projects/_INDEX]] · [[00-INDEX]] · [[_MASTER-INDEX]] · [[MAP]] · [[PhiSigmaKappa-Rush]] · [[Deployment-Playbook]]
---

# 🏛️ Greekstack — Plug-and-Play Greek Life Platform — folder index

> **Digest first:** [[projects/plug and play greek life/README|README]] — production-grade Next.js platform for Greek-letter chapter **rush, brotherhood management, and TCPA-compliant comms**. Originally built for **Phi Sigma Kappa Gamma Triton (USC)**; designed to be re-skinned per chapter or operated as a **national white-label SaaS**. MIT-licensed.

This folder is the live code + docs for the white-label productization of the chapter platform. It is the re-brandable sibling of the chapter-specific build tracked in [[PhiSigmaKappa-Rush]] (`projects/phi sig rush/`). The original Greekstack architecture notes live in memory at [[project_greekstack|Greekstack SaaS memory]].

## Status — Nationals-grade release (R43, `ea226da`)
- **Convergence floor met: 10 / 10** across accessibility, usability, and functional axes (three independent audit rounds R34→R37). See [[projects/plug and play greek life/FINAL|FINAL]] for the round-by-round log.
- **White-label foundation (R39):** any chapter re-brands in ~5 min via `/admin/setup` wizard — 14 config keys + dynamic `generateMetadata` + JSON-LD; USC reference defaults preserved end-to-end. Runbook: [[projects/plug and play greek life/WHITE-LABEL|WHITE-LABEL]].
- **Decision-quality + governance (R40–R42):** rush funnel viz, PNM compare modal, brother engagement leaderboard, `AuditLog` wired into every admin mutation, ⌘K command palette, PNM bid-response workflow.
- **Dues payment v1 (R43):** Stripe Checkout (graceful-degrade) + chapter-identity helper closing all 6 white-label HIGHs (SMS / ICS / email From / JSON-LD / metadata).
- **Live reference deploy:** <https://phisigmakappa.vercel.app> (chapter build). National model = one Vercel project per chapter, or a future multi-tenant fork.

## Stack
Next.js 14 App Router · Prisma · Postgres (Vercel/Neon) · Vercel Blob · Resend (email) · Twilio (SMS, double opt-in webhook) · Tavily (auto-enrichment) · `sharp` · Tailwind 3 · shadcn-style components.

## Hub documents (this folder root)

| File | Purpose |
|---|---|
| **[[projects/plug and play greek life/README\|README]]** | Read first — what you get out of the box, stack, white-label model, quick deploy |
| **[[projects/plug and play greek life/FINAL\|FINAL]]** | Convergence log — R34→R43 round-by-round audit + fix history, build SHAs, deploy IDs |
| **[[projects/plug and play greek life/WHITE-LABEL\|WHITE-LABEL]]** | Runbook — deploy this platform for another chapter in <30 min (no code changes) |
| **[[projects/plug and play greek life/SALES\|SALES]]** | Pitch one-pager for nationals / HQs |
| **[[projects/plug and play greek life/ARCHITECTURE\|ARCHITECTURE]]** | System diagram + architecture decisions |
| **[[projects/plug and play greek life/DEPLOY\|DEPLOY]]** | Deploy gate / Vercel flow |
| **[[projects/plug and play greek life/DEPLOYMENT\|DEPLOYMENT]]** | Deployment notes (companion to DEPLOY) |

## Reports — audit + convergence trail

| Version | Report |
|---|---|
| v1.0.1 | [[projects/plug and play greek life/reports/v1.0.1/phisig-audit-punchlist\|phisig-audit-punchlist]] |
| v1.0.2 | [[projects/plug and play greek life/reports/v1.0.2/flow-verification\|flow-verification]] |
| v1.0.3 | [[projects/plug and play greek life/reports/v1.0.3/final-audit\|final-audit]] |
| v43.0.0 | [[projects/plug and play greek life/reports/v43.0.0/01-architect-report\|01-architect-report]] · [[projects/plug and play greek life/reports/v43.0.0/02-completeness-audit\|02-completeness-audit]] · [[projects/plug and play greek life/reports/v43.0.0/03-builder-dues\|03-builder-dues]] |

## Source code in this folder
`app/` · `components/` · `lib/` · `prisma/` (schema + migrations) · `public/` · `tests/` · `middleware.ts` · `next.config.js` · `tailwind.config.ts` · `vitest.config.ts`. Run `npm install` then `npx prisma db push` + `npm run dev` (see [[projects/plug and play greek life/README|README]] quick-deploy). `node_modules` / `.next` / `.git` excluded from brain scans.

## Sister projects
- [[PhiSigmaKappa-Rush]] — the chapter-specific origin build (`projects/phi sig rush/`), live at phisigmakappa.vercel.app
- **Roadmap / multi-tenant vision:** [[plug and play greek life|Greekstack multi-tenant SaaS spec]] — forward-looking `*.greekstack.com` wildcard architecture (single-DB multi-tenancy + Stripe Connect platform-fee splits). The shipped build in this folder is **single-tenant-per-deploy** (re-skin + one Vercel project per chapter).
- Memory: [[project_greekstack|Greekstack single-tenant-per-deploy notes]] · [[multitenant-saas-platform|multi-tenant SaaS platform skill]] ([[claude/skills/multitenant-saas-platform/SKILL|SKILL]])

## Related
- Portfolio root: [[projects/_INDEX|projects/_INDEX]]
- Spine: [[00-INDEX]] · [[_MASTER-INDEX]] · [[MAP]] · [[BRAIN_INDEX]]
- Cross-project: [[Deployment-Playbook]] · [[Tech-Stack-Standards]]
- Sessions: [[claude/sessions/_INDEX|sessions/_INDEX]]

#project #greekstack #white-label #saas
