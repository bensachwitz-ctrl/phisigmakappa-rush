# Greek Stack — Complete Resource Map (OSS + Skills + MCPs → features)

Every collected resource mapped to a chapter-management-SaaS feature. The build phase implements ALL of these so Greek Stack ships as a fully-developed, market-ready white-label CMS + companion app. Pairs with `GREEK-STACK-PRODUCT-SPEC.md` + `ELEVATION-PLAN-COUNCIL.md` + `GREEK-STACK-INSPECTION` outputs.

## 1. Core platform / multi-tenancy
- **Skill `multitenant-saas-platform`** → THE foundation: schema-per-tenant Postgres, Host-proxy tenant routing, tenant-bound HMAC sessions, fail-closed entitlement gating. (Greek Stack is currently single-tenant-per-deploy — this makes it true multi-tenant.)
- **Supabase** (MCP + skill `supabase`/`supabase-postgres-best-practices`) → DB, RLS, realtime, storage.
- **Skill `nextjs-roleaware-portal`** → role-aware portals: admin / officer / brother / alumni scoping.

## 2. Auth (brothers + alumni, web + app)
- **Skill `better-auth`** (or Supabase Auth) → email/social/magic-link/**2FA**/orgs/passkeys; one login for web + the iOS app.
- **Skill `keycloak-email-2fa-reference`** → 2FA email flow patterns.

## 3. Self-serve signup → provisioning → billing
- Signup wizard → `POST /api/platform/tenants` provisions schema + seeds + first admin (multitenant-saas-platform DDL).
- **Stripe** (MCP + skills `stripe-best-practices`/`stripe-projects`) → trial→paid Checkout + subscription webhooks + fail-closed access gating.
- **Skill `nextjs-invoicing-module`** + OSS **invoiceninja-billing** → invoices/dues/receipts.

## 4. Site builder + per-chapter customization
- OSS **saasternity** → animated marketing site + SaaS UI scaffolding (CTAs, demo).
- **Sanity** (MCP + skills) OR a custom builder → editable chapter content (info/images/materials); per-chapter pages.
- Skills **theme-factory** + **tailwind-css-design-system** → per-chapter theming (colors/letters/logo).
- **Cloudinary** (skill `cloudinary-*`) → photo/material uploads + transforms.
- OSS **react-hook-form** + skill **formio-forms-platform-reference** → drag-drop form builder + rush/onboarding forms.

## 5. Onboarding links
- Admin-generated shareable form link → auto-creates brother/alumni account with full info (extend the Phi Sig alumni-invite pattern in memory). formio/react-hook-form render; Supabase persists.

## 6. Communications + notifications
- OSS **mautic** + **listmonk** → chapter email (announcements, onboarding, renewals, drips).
- Skill **react-email** → branded email templates.
- **Twilio** (MCP + skills) → SMS comms (TCPA-compliant per Greek Stack memory). **Novu** → in-app/push notifications (events + announcements).
- **textbee** (`working code\oss\textbee`, self-hosted SMS gateway) → **automatic SMS for rush + brothers** — recruitment texts, event/announcement reminders; the $0 self-hosted SMS path (TCPA-gated). Primary SMS for Greek Stack.
- **cal.diy** (self-hosted Cal.com) → events + booking on each chapter site: schedule rush events/meetings, send booking details, ICS add-to-calendar.

## 7. Events + calendar
- Skill **calcom-scheduling** → events/scheduling; ICS "add to calendar" on every event; reminders.

## 8. Documents + e-sign
- Skill **documenso-esignatures** → e-signed bids + liability/anti-hazing waivers (signed PDFs to storage).
- OSS **Stirling-PDF** + skill **pdfme-document-generator** → receipts, certificates, exports.

## 9. Search + AI
- Skill **meilisearch-search** → Cmd+K search across roster/events/docs.
- OSS **dify** + skill **free-llm-api** → LLM features ($0 via free providers / Ollama).

## 10. Analytics + audit + compliance
- OSS **plausible** + skill **posthog-product-analytics** → analytics.
- Skill **hashchain-audit-log** → tamper-evident audit log (officer actions, finances).

## 11. Companion "Greek Stack" iOS app
- **Capacitor** wrapping the responsive web app (fastest "same as site, on your phone") → App Store. Skills **expo-*** if a native RN client is chosen later. Push notifications (events/announcements) + add-to-calendar.

## 12. Deploy
- **Vercel** (MCP + skills) → web deploy; **Codemagic** → the iOS companion app. Skill `nextjs-azure-deploy` if Azure.

## Build order: multi-tenancy + auth → signup/provision/billing → site builder + theming + uploads → forms/onboarding links → events/calendar/comms/notifications → docs/e-sign → search/AI/analytics → companion app → QA to 99/100.
