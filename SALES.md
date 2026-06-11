# Greekstack — Pitch for Phi Sigma Kappa National HQ

> A production-ready, TCPA-compliant rush + chapter management platform built by an active chapter. Free to license, white-label, and deploy nationwide. Works tomorrow.

**Live demo:** <https://greekstack.vercel.app>
**Repo:** <https://github.com/bensachwitz-ctrl/phisigmakappa-rush>

---

## The pitch in 30 seconds

Every Phi Sig chapter currently runs rush on a patchwork of Linktree, Google Forms, GroupMe, Squarespace, and the rush chair's iPhone Notes. National HQ has zero visibility, no consistent brand, no compliance trail, and every chapter rebuilds the same thing every year.

**Greekstack is the same chapter site, ready for every chapter, today.** Fork it, set six environment variables, and a chapter is live. The rush chair signs in and gets a six-step "get rush ready" checklist. Every public surface — FAQ, e-board, photos, stats — edits from the admin panel. The TCPA evidence trail and CTIA-compliant SMS opt-in are baked in.

National's value-add: standardize the chapter web presence, capture and own the data, and offer it as a member benefit instead of letting 200 chapters reinvent the wheel.

## Why HQ should care

| Concern | Today | With Greekstack |
|---|---|---|
| **Risk management** | Chapter advisor learns about an alcohol-laden event from a parent's Facebook post | Anti-hazing block + FIPG-compliance language enforced in default copy. Brand-compliance audit catches "Cantina"/"keg"/"rage"/"pledge class" terminology before publication. Hotline link tested in CI. |
| **TCPA exposure** | Chapters texting PNMs from personal phones with no consent record | Per-submit consent receipt at `/api/consent/[id]` with verbatim 47 CFR §64.1200(f)(9) ATDS language, IP, UA, version stamp. Double opt-in via Twilio inbound webhook with HMAC signature verification. CTIA-compliant STOP/HELP/START keyword handling. SMS quiet-hours gate (8am–9pm recipient local). 4-year recordkeeping baked in. |
| **Privacy compliance** | Chapter rush form collects phone + email with zero policy disclosure | Privacy page covers TCPA + CCPA/CPRA + VCDPA + COPPA + Cookies + retention + 4-year SMS recordkeeping. Under-13 guard. 17-with-parent path documented. Right-to-deletion flow. |
| **Brand consistency** | Each chapter's site looks like a Wix template from 2018 | Every chapter ships the same SaaS-grade hero, type system, security headers, JSON-LD Knowledge Panel schema, and PWA manifest. Chapter-specific content edits from admin without code. |
| **Visibility into chapter pipeline** | HQ has no idea how many PNMs each chapter is recruiting until pledge class numbers come in | Optional aggregation: each chapter's deploy can POST anonymized PNM counts + bid-night outcomes to a national rollup endpoint (not built — clear add-on). |
| **Onboarding cost** | Each chapter pays a developer or burns 40 hours of officer time on a one-off site | $0 fork. Two-minute Vercel deploy. Three-step admin onboarding checklist on first sign-in. |

## What the chapter rush chair gets

A non-technical sophomore can:

- Sign in (Phisig / DamnProud — case-insensitive — change in env)
- See on Day 1 a "Get rush ready" checklist with six pending items + Fix-it links
- Update the Fall '26 schedule (events CRUD with "Add Fall rush template" button that seeds 6 events)
- Edit FAQ, timeline, e-board roster, philanthropy stats, testimonial, anti-hazing block — without touching code
- Send brother onboarding invites (email, SMS, or copy-link) with 30-day token
- Run `?booth=1` on a tablet at Greene Street: form-only SSR, autofocus, 60s idle auto-clear with countdown
- Export PNMs to CSV with vote sums and attendance for bid-night meeting
- Subscribe themselves and PNMs to the rush calendar via webcal:// (`/api/events.ics`)
- Send mass email + SMS broadcasts (with quiet-hours gate so they can't accidentally page someone at 3am)

Everything else — security headers, image optimization, schema.org, accessibility — is invisible plumbing the chair never thinks about.

## The 16-round audit log

This codebase shipped via 16 documented audit-fix-deploy iterations against a live production deploy. Across rounds R1 through R15+, eight critic personas (rushee, parent, booth volunteer, HQ compliance, senior designer, performance engineer, TCPA reviewer, frat-officer maintainability) plus an end-to-end functional probe scored each round. Average lift: **5.5/10 (R1) → 9.30/10 (R11) with 12/12 categories green at R15.**

Every fix is documented in [FINAL.md](FINAL.md) at the repo root, with commit SHAs. The complete progression is reproducible.

## Path to a national rollout

**Tier 1 — proof of concept (now, $0):**
HQ forks the repo, deploys a reference instance for a pilot chapter, walks the rush chair through onboarding. 30-day pilot, evaluate against existing chapter site.

**Tier 2 — managed deploy per chapter (modest):**
HQ provisions one Vercel project + one Neon database per pilot chapter. HQ owns the Twilio brand registration (A2P 10DLC) so individual chapters aren't each filing their own. Chapter rush chair gets `chapter-name.phisig.org` subdomain and admin login. Estimated $20-30/mo per chapter (Vercel Pro tier scales across many projects).

**Tier 3 — full multi-tenant SaaS (further out):**
Single deploy, many chapters, namespaced by subdomain. Chapter admin only sees their own data. Centralized national dashboard for HQ to see pipeline health across all chapters in real time. Aggregate philanthropy totals, GPA averages, pledge-to-initiation conversion. Bigger engineering lift but the platform is structured for it (Prisma schema would gain `chapterId` columns; auth would gain chapter scoping; nothing else changes architecturally).

## What we'd want from HQ in return

- License to use "Phi Sigma Kappa" trademarks on chapter deployments
- Sign-off on the default copy (anti-hazing language, FIPG framing, dues language)
- Brand assets at usable resolution (high-res Crest, Seal, Coat of Arms)
- A2P 10DLC brand sponsorship so chapters don't each have to register with carriers individually
- Chapter directory data so we can pre-populate every Gamma Triton, Beta Eta, etc., chapter with their advisor of record

## ROI math (rough)

- ~ 100 active Phi Sigma Kappa chapters across the US
- Average chapter rush-related "site/forms/comms" toolchain cost: $400–$800/yr (Squarespace + Linktree + Twilio + Mailchimp + ad-hoc dev hours)
- If HQ rolls Greekstack as a member benefit at no charge to chapters: ~$50–80k/yr total cost (Vercel + databases + Twilio brand fees)
- vs. ~$50–100k/yr saved across all chapters
- Plus: standardized risk-management copy on every chapter site = quantifiable insurance/legal-exposure reduction
- Plus: consistent brand presence = recruitment lift

Net break-even Year 1, positive thereafter, plus the strategic value of HQ owning the platform.

## Next step

If you want to evaluate, point a pilot chapter at the live demo, then fork and provision. We can walk through the admin together. 30 minutes on a screen-share.

Contact: through the [GitHub repo](https://github.com/bensachwitz-ctrl/phisigmakappa-rush) (open an issue) or via the chapter's advisor contact.

---

*"The chapter site that runs itself."* — built by Phi Sigma Kappa Gamma Triton, free for every brother chapter that wants it.
