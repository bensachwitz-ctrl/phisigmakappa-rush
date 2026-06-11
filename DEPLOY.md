# Deploy to greekstack.vercel.app

The app is fully built and ready. Deployment requires running the Vercel CLI on your machine — Cowork's sandbox can't reach your Vercel account.

## One-shot path (recommended)

Open PowerShell in this folder and run:

```powershell
# 1. Install dependencies
npm install

# 2. Install Vercel CLI globally (if you don't already have it)
npm i -g vercel

# 3. Log in (opens browser)
vercel login

# 4. Link this folder to a new Vercel project named "greekstack"
vercel link --project greekstack --yes

# 5. Provision Vercel Postgres
#    In your browser: https://vercel.com/dashboard
#    Project → Storage → Create Database → Postgres → Connect
#    This auto-injects DATABASE_URL and DIRECT_URL into the project.

# 6. Pull the env vars locally
vercel env pull .env.production.local

# 7. Set the rest of your env vars (one-time)
vercel env add ADMIN_PASSWORD             # type your chapter password
vercel env add ADMIN_SESSION_SECRET       # paste a 32+ char random string
vercel env add NEXT_PUBLIC_SITE_URL       # https://greekstack.vercel.app
# Optional — skip until you have keys:
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_PHONE_NUMBER

# 8. Push the database schema
$env:DATABASE_URL = (Get-Content .env.production.local | Select-String "^DATABASE_URL=").ToString().Split("=",2)[1].Trim('"')
npx prisma db push

# 9. Deploy to production
vercel deploy --prod
```

## What you'll see

After step 9, the CLI prints the deploy URL — typically `greekstack.vercel.app` if the project name was preserved, or `greekstack-<hash>.vercel.app` otherwise.

To force the canonical hostname, in Vercel dashboard:
**Project → Settings → Domains → Add `greekstack.vercel.app`**

## Generate a session secret

```powershell
# 32 random hex bytes
[Convert]::ToHexString((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32) -join '')
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Verify

After deploy:
- `https://greekstack.vercel.app/` — public landing should render the hero, schedule (empty until you add events), and registration wizard
- `https://greekstack.vercel.app/admin/login` — log in with your name + ADMIN_PASSWORD
- Add an event, register a test rush from the public form, see them in the roster

If a page errors, check `vercel logs` or the deployment build logs in the dashboard.
