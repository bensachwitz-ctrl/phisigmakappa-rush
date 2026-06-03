# WHITE-LABEL — Deploying this platform for another chapter

This document is the runbook for spinning up the chapter-management platform
for a fraternity chapter other than the reference build (Phi Sigma Kappa,
Gamma Triton, USC). Total time from clone to "ready for a real PNM to
register" is **under 30 minutes** — the bulk of it is filling out forms in
`/admin/setup`, not editing code.

---

## What gets customized — and how

| Layer            | How it changes                    | Where                                             |
|------------------|-----------------------------------|---------------------------------------------------|
| Chapter identity | `/admin/setup` wizard or fields   | `/admin/settings` → Chapter identity              |
| Brand colors     | Hex pickers                       | `/admin/setup` step 2 · `/admin/settings` → Brand |
| Logo / wordmark  | Replace 1 JPG, 1 PNG, 1 SVG       | `public/brand/` (see asset table below)           |
| Hero photos      | Paste IG slugs OR upload          | `/admin/settings` → Hero tiles                    |
| Stats + copy     | Inline edits                      | `/admin/settings` → Hero / Stats / FAQ / Timeline |
| Contact + advisor| Forms                             | `/admin/setup` step 3                             |
| Email / SMS body | Auto-templated from cfg           | nothing to edit — re-renders on chapter rename    |
| JSON-LD record   | Auto-derived                      | nothing to edit — re-renders on chapter rename    |
| Page titles      | `generateMetadata()` reads cfg    | nothing to edit                                   |
| iOS launcher     | `chapter.appShortTitle` (≤12 char)| `/admin/settings` → Chapter identity              |

**Nothing in code needs to change for a re-brand.** Every chapter-specific
string falls back to the Phi Sig USC reference if unset.

---

## 30-minute deploy for a new chapter

### 1. Spin up infra (10 min)

```bash
# Clone the repo (or fork into the chapter's GitHub org)
gh repo create $CHAPTER_HANDLE-rush --template phisigmakappa-rush --private

# Create a Vercel project pointing at it
vercel link
vercel env add DATABASE_URL              # Neon / Vercel Postgres
vercel env add DATABASE_URL_UNPOOLED     # for Prisma migrations
vercel env add ADMIN_USERNAME            # e.g. "Phisig" — chapter shared admin
vercel env add ADMIN_PASSWORD_HASH       # bcrypt hash; generate via `npx tsx scripts/hash-password.ts`
vercel env add SESSION_SECRET            # 32+ random bytes; `openssl rand -hex 32`
vercel env add NEXT_PUBLIC_SITE_URL      # https://yourchapter.vercel.app
vercel env add RESEND_API_KEY            # optional, for mass email
vercel env add TWILIO_ACCOUNT_SID        # optional, for SMS
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_PHONE_NUMBER

vercel deploy --prod
```

A fresh deploy renders with the Phi Sig USC reference values across the
board — including stock hero photos. That's intentional: the chapter
e-board can sign into `/admin/login`, see what the site looks like, then
swap pieces incrementally.

### 2. Sign in + run the setup wizard (5 min)

Navigate to `https://YOURCHAPTER.vercel.app/admin/login`. Use the
`ADMIN_USERNAME` + the password whose bcrypt hash you set above.

The dashboard renders a **"Finish chapter setup"** amber banner with a
progress bar. Click it. The 5-step wizard at `/admin/setup` covers:

1. **Chapter identity** — Fraternity name, Greek letters, school
2. **Brand colors** — Your school's primary hex (and dark / soft variants)
3. **Contact** — Rush inbox, advisor of record, chapter house address
4. **Anti-hazing** — National hotline number + URL + body paragraph
5. **Launch** — Review and go live

Save & continue between each step. Every save PATCHes
`/api/admin/settings` — same endpoint as the full settings page, so
your inputs are persistent and the wizard is idempotent (refresh and
the values you typed are still there).

When you finish step 5, the amber banner on the dashboard disappears
and the entire site has re-branded to your chapter.

### 3. Swap brand assets (5 min)

Three files in `public/brand/` are referenced from React components:

| Path                                  | Used by                            | Replace with                                    |
|---------------------------------------|------------------------------------|-------------------------------------------------|
| `public/brand/phisigmakappa-letters.jpg` | Footer national-brand strip        | Your fraternity's national wordmark (~86×32 px)|
| `public/brand/coat-of-arms-formal.jpg`   | `/parents` hero illustration       | Your fraternity's coat of arms                  |
| `public/brand/seal.svg`                  | Loading spinner + crest watermarks | Your fraternity seal (single-color SVG)         |
| `public/brand/wordmark.png`              | Wordmark component (top of site)   | Your fraternity wordmark (PNG with transparency)|

Keep the same filenames so no code edits are required. The Wordmark
component picks up the new image on the next deploy.

### 4. Add at least one rush event + invite the e-board (5 min)

- `/admin/events` → **Add event** for the first rush night. The
  homepage countdown ticks off the soonest event.
- `/admin/brothers` → **Invite brother** to send a one-time
  onboarding link to each e-board member. They click → set a password
  → they show up in the directory.

### 5. Hand over the URL

Send the public URL to your first PNM. The site is white-labeled,
TCPA-compliant, SEO-tagged for your chapter, and ready to take rush
registrations.

---

## What's still hardcoded (intentional)

These are NOT chapter-specific — they don't get rebranded:

- **Three Cardinal Principles wording** — Phi Sigma Kappa's specific
  principles are Brotherhood, Scholarship, Character. Other
  fraternities have their own principles list. Edit
  `chapter.cardinalPrinciples` in `/admin/settings` to override.
- **TCPA / CCPA / VCDPA disclosure language** — these are federal /
  state law text and shouldn't be edited per-chapter. The chapter
  attribution within them is templated.
- **Disclosure version date** (`DISCLOSURE_VERSION` in
  `app/api/rush/route.ts`) — bumped only when the legal copy itself
  changes. Consent receipts stamp this for TCPA proof.

---

## Architecture: where the cfg lives

```
SiteConfig (Prisma model: { key: string PRIMARY KEY, value: string })
   │
   ▼
lib/site-config.ts → getSiteConfig() → Record<string, string>
   │
   ├── DEFAULTS (lines 8–230)  ← reference Phi Sig USC values
   │
   └── DB overrides            ← /admin/settings + /admin/setup writes
```

Reading a key: `cfg["chapter.fraternityName"] || "Phi Sigma Kappa"`.
Always fall back to the default — never assume the DB row exists. The
wizard is **additive only**; it doesn't delete unset keys.

---

## What nationals can layer on top

For a nationals deployment (managed roll-out across N chapters), the
likely additions on top of this platform:

1. **Multi-tenant routing** — one Vercel project, `?chapter=GammaTriton`
   query selector. Today the DB is single-tenant per deploy; a tiny
   middleware change can route by subdomain to per-chapter cfg rows.
2. **Nationals admin** — a `/national` super-user view that aggregates
   the per-chapter dashboards (rush funnel, vote participation, dues
   collection) into one cross-chapter leaderboard. Reuses the existing
   `/api/admin/digest` endpoint per chapter.
3. **Branded onboarding** — a `/national/new-chapter` form that
   provisions a fresh deploy + seeds the SiteConfig with the
   chapter-identity bundle nationals already has on file.
4. **Pooled Twilio + Resend** — centralized API keys, per-chapter
   sending domains. Keeps cost predictable as chapters scale.

None of these are required for a chapter to use the platform today —
they're the path to enterprise once 5+ chapters are live.

---

## Live verification checklist for a re-brand

After running `/admin/setup`, confirm these have re-branded:

- [ ] Browser tab title (`<title>`) reads the new chapter
- [ ] `/privacy` opening paragraph names the new chapter + school
- [ ] `/parents` hero subhead names the new chapter
- [ ] Footer attribution shows new chapter + new school short
- [ ] Footer national HQ link points at the new national URL
- [ ] iOS home-screen launcher caption (`chapter.appShortTitle`) ≤12 chars
- [ ] JSON-LD `name`, `parentOrganization.name`, `memberOf.name`,
      `address.streetAddress` all match (view-source on `/`)
- [ ] Email template signatures use the new chapter name (compose a
      test broadcast from `/admin` → multi-select → Email)
- [ ] SMS template references the new chapter house address
- [ ] Brand color CSS variable (`--brand-primary`) matches the chapter
      primary hex (inspect any `bg-phisig-red` element)
- [ ] Dashboard "Brand readiness" banner has disappeared (≥80% of
      tracked identity fields customized)

---

## Cost to run (per chapter, single-tenant deploy)

| Service            | Free tier covers...                                    | Paid above              |
|--------------------|--------------------------------------------------------|-------------------------|
| Vercel (Hobby)     | Single chapter, <100GB bandwidth/mo                    | $20/mo Pro at >100GB    |
| Neon Postgres free | ≤500MB storage (covers ~5,000 PNMs comfortably)        | $19/mo above            |
| Resend free        | 100 emails/day, 3,000/mo                               | $20/mo above 10k        |
| Twilio             | Pay-as-you-go SMS (~$0.0079/msg US)                    | n/a                     |
| Vercel Blob        | 1 GB storage free                                      | $0.15/GB above          |

A typical chapter running this for one rush cycle (~50 PNMs, 8 messages
each, headshots): **$0–5/cycle** on free tiers, or **~$25/mo** on Pro
tiers. Cheaper than the chapter's printing budget.

— end of WHITE-LABEL.md —
