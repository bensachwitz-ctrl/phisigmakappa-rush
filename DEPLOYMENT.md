# Deployment Runbook — New Chapter Spin-up

> Step-by-step for a chapter rush chair (or HQ ops engineer) standing up a fresh Greekstack instance for a new chapter. Estimated time: **~20 minutes** the first time, **~5 minutes** for subsequent chapters once you have Resend + Twilio keys.

## Prerequisites

- A computer with `git` and `node 20+`
- A free Vercel account ([vercel.com](https://vercel.com))
- A free Neon Postgres account ([neon.tech](https://neon.tech)) OR Vercel Postgres add-on
- *(Optional, recommended)* Resend account for email broadcasts ([resend.com](https://resend.com))
- *(Optional, recommended)* Twilio account for SMS broadcasts + double opt-in webhook ([twilio.com](https://twilio.com))

## 1. Fork the repo

```bash
# Recommended: fork on GitHub UI to your own org/personal account.
# Then clone:
git clone https://github.com/YOUR-ORG/phisigmakappa-rush.git my-chapter
cd my-chapter
```

(Or for a chapter-specific name: `git clone … phisig-tx-am`, etc.)

## 2. Install dependencies

```bash
npm install
```

## 3. Provision Postgres

**Option A — Vercel Postgres (recommended):**
1. Push your fork to GitHub.
2. Import the repo into Vercel.
3. Project → Storage → Create Database → Postgres → Connect.
4. Vercel auto-injects `DATABASE_URL` and `DIRECT_URL` into your project's env vars.

**Option B — Neon (free tier):**
1. Sign up at neon.tech, create a project.
2. Copy the connection string → set as `DATABASE_URL`.
3. Add `?pgbouncer=true&connection_limit=1` for serverless safety.
4. `DIRECT_URL` = same connection string without pgbouncer flags.

## 4. Configure environment

In Vercel dashboard → Project → Settings → Environment Variables, add:

**Required:**
```
DATABASE_URL              <postgres connection string>
DIRECT_URL                <same, without pgbouncer for prisma migrations>
ADMIN_USERNAME            <your chapter's admin handle, e.g. "PhisigTAM">
ADMIN_PASSWORD            <strong shared password>
ADMIN_SESSION_SECRET      <32+ random chars; generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_SITE_URL      https://your-chapter.vercel.app
```

**Optional but strongly recommended:**
```
RESEND_API_KEY            re_...
RESEND_FROM_EMAIL         rush@yourchapter.com  (must be a verified Resend domain)
TWILIO_ACCOUNT_SID        AC...
TWILIO_AUTH_TOKEN         <your token>
TWILIO_PHONE_NUMBER       +1...  (your A2P 10DLC-registered number)
TAVILY_API_KEY            tvly-...  (free 1k searches/mo at app.tavily.com)
```

> Without Resend/Twilio keys, the app runs in **mock mode** for sending — the form still captures rushees, the consent receipt still works, but email/SMS sends are no-ops with log lines instead. Useful for staging.

## 5. Initial schema push

Locally:

```bash
cp .env.example .env.local
# fill in the same values you set on Vercel
npx prisma db push
```

This creates all tables (Rush, RushConsent, RushSubmitLog, Brother, Event, etc.).

## 6. First deploy

```bash
git add -A
git commit -m "Initial chapter deploy"
git push origin main
```

Vercel auto-deploys. First build takes ~90 seconds.

## 7. Configure Twilio inbound webhook (for double opt-in + STOP/HELP)

In Twilio Console → Phone Numbers → Active Numbers → click your number:
- **A MESSAGE COMES IN** → set to `POST https://your-chapter.vercel.app/api/sms/inbound`

The webhook verifies `X-Twilio-Signature` HMAC, so an invalid TWILIO_AUTH_TOKEN will reject all inbound messages. Make sure the value is set correctly in your Vercel env.

## 8. (Recommended) A2P 10DLC brand registration

For SMS to actually deliver in the US to T-Mobile/AT&T/Verizon subscribers, you need brand + campaign registration with The Campaign Registry. This costs ~$4 one-time + ~$1.50/mo. Twilio has a guided flow at:

Twilio Console → Messaging → Regulatory Compliance → A2P 10DLC

Use the chapter's legal entity (or HQ's, if HQ is sponsoring multiple chapters under one brand). The included copy on the rush form (`automatic telephone dialing system`, `Up to 8 msgs per rush cycle`, etc.) is written to pass A2P review on the first try.

## 9. Sign in and walk the checklist

Visit `https://your-chapter.vercel.app/admin/login`:
1. Sign in with `ADMIN_USERNAME` + `ADMIN_PASSWORD`.
2. The dashboard shows a **"Get rush ready"** card with 6 items:
   - Real chapter advisor name
   - Rush phone number
   - E-board roster (5 slots)
   - Hero photos uploaded
   - First public rush event
   - Brothers directory populated (≥5)
3. Click each "Fix" link to jump to the right `/admin/settings` panel.
4. When the card disappears, the public site reads as a finished product.

## 10. Configure brand colors (white-label chapters only)

If your chapter isn't using the default Phi Sig cardinal red:

`/admin/settings → Brand colors`:
- **Primary:** your school's main color (e.g. USC garnet `#73000A`, Texas A&M maroon `#500000`, Penn State blue `#001E44`)
- **Primary dark:** ~10-15% darker for gradient stops
- **Primary soft:** very light tint of the same hue for backgrounds (e.g. cardinal `#FCEFF1`)

Save → next page load reflects the new theme. No rebuild needed.

## 11. Domain

In Vercel → Project → Settings → Domains, add a custom domain like `rush.phisig-yourchapter.com` or just use the free `your-chapter.vercel.app` subdomain. Update `NEXT_PUBLIC_SITE_URL` to match.

## Operational checks after deploy

```bash
SITE=https://your-chapter.vercel.app

# Health probe
curl $SITE/api/health
# → {ok:true, db:up, deployedAt, region, timestamp}

# iCal feed (will be empty until you add events)
curl $SITE/api/events.ics

# Check security headers
curl -s -I $SITE/ | grep -iE 'content-security|hsts|x-frame|nosniff|referrer-policy|permissions-policy'

# Sitemap
curl $SITE/sitemap.xml
```

## Common issues

**Login fails with cookie set but `/admin` redirects back to `/admin/login`** — `ADMIN_SESSION_SECRET` differs between the auth route and the middleware. They both read from the same env var, so this means the env var changed between requests (e.g. you redeployed in the middle). Sign out and sign back in.

**Photo proxy returns transparent pixel for known-good IG slugs** — the source IG post is private, deleted, or age-gated. The proxy intentionally rejects fallback IG branding images. Use a different slug or upload a photo directly via the admin's hero photo collage.

**Form submit returns 429 immediately** — this is rate-limiting. Real rushees see this only after 5+ rapid submits from the same IP. During testing on a single network, the limit can fire fast — wait 60 minutes or query `RushSubmitLog` and prune.

**Admin Settings save returns 500** — check `prisma db push` was run after schema changes. Run `npx prisma db push` against your production DATABASE_URL.

## Updating a deployed chapter to a new release

```bash
# Pull upstream changes from the canonical Greekstack repo
git remote add upstream https://github.com/bensachwitz-ctrl/phisigmakappa-rush.git
git fetch upstream
git merge upstream/main
git push origin main
```

Vercel auto-redeploys. Schema changes auto-apply via `prisma db push` in the build script.

## Tearing down

In Vercel: Project → Settings → Delete Project. Then in Neon (or wherever the DB lives): delete the database. The chapter's data is gone irrecoverably. Export PNMs to CSV first via `/admin → Export` if you want a record.

## Support

Open an issue on the canonical repo: <https://github.com/bensachwitz-ctrl/phisigmakappa-rush/issues>
