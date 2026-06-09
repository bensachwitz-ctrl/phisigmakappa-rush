# Greek Stack — Market-Ready Product Spec (web SaaS + companion iOS app)

Authoritative product vision (Ben, 2026-06-09). Builds on `ELEVATION-PLAN-COUNCIL.md`
(council P0s: self-serve signup→schema provisioning, Stripe trial→paid billing, e-signed
bids/waivers) + `ELEVATION-SPEC-2026-06-09.md`. **Phase starts after DailyTool + BCG hit GOTY.**
White-label chapter-management SaaS. Build via agent swarm, loop until market-ready.

## 0. Immediate site fixes (user screenshots 2026-06-09)
- [ ] **Header overflow** — wordmark "Greekstack" collides with nav ("Features / How it works"). Fix nav layout (flex + gap + responsive wrap/hamburger), no overlap at any width.
- [ ] **Greek letters → BACKGROUND layer** — decorative Φ/α/ο currently render OVER the feature cards. Move them behind content: lower `z-index`, `pointer-events:none`, reduced opacity, positioned as a true ambient background (the requested "letters floating in the background" look), never overlapping text/boxes.
- [ ] **Content overflow / left-clip** — feature cards clip on the left ("reasury & budgets", "ee inside"). Fix container max-width/padding/overflow; responsive; nothing clipped.
- [ ] **Per-chapter tailoring** — generated chapter sites themed to the chapter (colors/letters/logo/photos/content), not the generic template.

## Mobile app — "Greek Stack" (App Store)
Brothers + alumni log in (same creds as web) → full chapter functionality on phone. Build after the web SaaS is built out; web + app work simultaneously off the same API/Supabase. Deploy to App Store.

## Pricing (user 2026-06-09) — landing pricing section
Display: **"Free"** as the headline price → below it **"$50/month after the first month"** → below that **"$200 each rush cycle"**. (Month 1 free → $50/mo recurring → +$200 per rush cycle.) Wire to Stripe: 30-day free trial → $50/mo subscription + a $200 rush-cycle charge/add-on. Replace the current flat "$50/month".

## Role scopes — exec vs brothers (distinct, RLS-enforced)
- **Exec / officers (admin):** roster mgmt, finances/dues, events, rush pipeline, announcements, settings, **the chapter site builder**, exports.
- **Brothers (member):** view events/announcements, pay dues, RSVP, roster, own profile.
- **Alumni:** view + events + donate.
Build via `nextjs-roleaware-portal` + `multitenant-saas-platform` (tenant-scoped, fail-closed).

## Each chapter's site = a complete, tailored management system
Every generated site is customized to that chapter (colors/letters/logo/photos/text/links via the builder) AND ships the FULL toolset working seamlessly: roster · events (+calendar/RSVP) · announcements (+notifications) · rush/recruitment pipeline · dues/finances (Stripe) · documents/e-sign · study/GPA · polls · exports. **Easy to set up** (few-clicks wizard), **easy to maintain** (admin dashboard), **easy to use** (clean member UX). Tools per `GREEK-STACK-RESOURCE-MAP.md`.

## Demo + booking + instant tailored-site generation (user 2026-06-09)
- **Interactive, on-brand demo** — the landing demo must feel like the REAL product the chapter receives: a LIVE, interactive preview of a tailored chapter site (sample org letters/colors), clickable tabs (Feed/Events/Rush/Dues/Network) with "what this does" callouts per surface. Not a static mockup — it previews exactly what they'll get.
- **Seamless booking** — landing → "Launch your chapter" → a few-clicks flow (chapter name → org/school → plan → payment) with zero friction; Back-to-website + Sign-in always available.
- **Instant tailored-site generation** — on signup/launch, **INSTANTLY** provision + theme the chapter's site (their org letters, colors, sensible defaults) so it's live and usable immediately — redirect the new admin straight into their ready, branded system (no waiting, no manual setup to start). Multitenant provision + default theming run synchronously on signup.

## Build loop (design → implement → review → improve) — run until market-ready
1. **Design** — architecture/approach (resource map + council plan + a focused design pass).
2. **Implement** — SEQUENTIAL waves, ONE node agent per repo at a time (fork-bomb guard): multitenant+auth+scopes → site-builder + per-chapter theming/uploads → billing (pricing above) → integrations (events/comms/docs/search/AI) → companion iOS app.
3. **Review** — multi-perspective swarm (low-node, parallel) scores each surface + finds gaps.
4. **Improve** — fix gaps → re-review. Loop until **99/100**, every integration working, both the marketing landing AND the generated chapter sites flawless.

## Quality gate (applies to ALL apps in this program)
Loop does NOT stop until a **harsh-critique tester scores ≥ 98/100** against the GOTY bar (functionality + UI + responsiveness + no overflow/clip + every feature works). App Store screenshots generated at required device sizes + path reported to Ben.

## 1. Marketing site (drives customers)
- Robust, visually-striking, animated landing with clear **CTAs** (Start free / Book a demo / See it live).
- **Few-clicks signup** → in minutes a chapter has its own tailored, good-looking system. Easy start-to-finish.
- Interactive demo; trust/social proof; pricing.

## 2. Self-serve onboarding + site builder (easier + more customizable)
- **Easier signup form** → `POST /api/platform/tenants` provisions the chapter's schema + seeds defaults + creates the first admin in one transaction (council P0.1).
- **Per-chapter/school customization:** colors, logo, letters, mascot, content — a builder where admins **edit appearance, add photos/materials**, and assemble their site in a few clicks. More customization than today's hardcoded landing.
- Live preview; publish.

## 3. Auth — per chapter, brothers + alumni
- Each chapter's **brothers AND alumni** log in (same credentials on web + the iOS app).
- Roles: admin/officer, brother, alumni. RLS/tenant-scoped.

## 4. Admin-generated onboarding links
- Admin clicks → generates a **shareable form link**. An individual fills it (name, age, phone, email, everything) → **auto-creates their account** + profile. Seamless, no manual entry by admin. (Extend the existing Phi Sig alumni-invite pattern.)

## 5. Chapter features (web + app, same data)
- **Events** with an **"Add to calendar" button** → adds to the member's personal calendar (ICS/Google) and saves it.
- **Announcements** feed.
- **Notifications:** push when an event is upcoming (reminder) and when an announcement is posted.
- Roster, dues/payments, documents, etc. (existing modules — finish + polish).

## 6. Greek Stack iOS app (companion)
- Members/brothers/alumni **log in the same way as the site**.
- **Mobile-friendly version of the website** — all post-login functionality, optimized for phone navigation. Same information, phone-accessible.
- Push notifications (events + announcements) + add-to-calendar.
- Likely Capacitor wrapping the responsive web app (shared codebase) OR a React Native client hitting the same API. (Decide at build; Capacitor = fastest path to "same as site".)

## 7. Non-functional (market-ready bar)
Scalable (multi-tenant, indexed, paginated), visually pleasing, easy to use, **everything functioning as intended**, secure (tenant isolation, RLS), billing live (Stripe), e-sign (Documenso), search (Meilisearch/Cmd+K). Deps to add: formio, meilisearch, pdfme.

## Build order (loop, swarm)
1. Council P0s (signup→provision, billing, e-sign). 2. Site builder + per-chapter theming + photo uploads. 3. Brother/alumni auth + admin onboarding-link form. 4. Events+calendar+announcements+notifications. 5. Marketing site (animated, CTAs, demo). 6. Companion iOS app (Capacitor of the responsive site). 7. Scale/security/QA → market-ready.
Verify each in-browser; build+tests green per wave; deploy on Ben's go.

Related: [[project_greekstack]] · [[multitenant-saas-platform]] · [[ELEVATION-PLAN-COUNCIL]] · [[reference_2026-06-09_vault_reorg]] · [[GOTY-QUALITY-BAR]]
