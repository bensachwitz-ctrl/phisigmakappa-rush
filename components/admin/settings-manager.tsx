"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { imageSrc } from "@/lib/image-url";
import { cleanUrl } from "@/lib/utils";
import { IconSave as Save, IconSpinner as Loader2, IconImage as ImageIcon, IconStar as Star, IconCrown as Crown, IconRefresh as RotateCcw, IconExternal as ExternalLink, IconUpload as Upload, IconMembers as Users, IconMail as Mail, IconService as HandHeart, IconShieldCheck as ShieldCheck, IconFileText as FileText, IconPlus as Plus, IconTrash as Trash2, IconArrowUp as ArrowUp, IconArrowDown as ArrowDown, IconMessage as MessageSquareQuote, IconCalendar as CalendarDays, IconChores as ListChecks, IconActivity as Activity, IconBilling as CreditCard, IconMessage as MessageSquare } from "@/components/brand/icons";
import Link from "next/link";

import { IconSpark } from "@/components/brand/icons";
const ICONS = ["Crown", "Trophy", "HandHeart", "Users", "Award", "Star", "Heart", "GraduationCap", "BookOpen", "Music", "Building2", "Flame", "ShieldCheck"];

/** Public, BRANDED support address shown in admin dues-setup copy. Env-configurable
 *  via NEXT_PUBLIC_SUPPORT_EMAIL (inlined by Next at build); defaults to the brand
 *  inbox — NOT the founder's personal email.
 *  OWNER-KEYS: the owner must stand up + monitor the real support@ inbox (or set
 *  NEXT_PUBLIC_SUPPORT_EMAIL to the production address) before launch. */
const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "workbenjaminsachwitz@gmail.com").trim();

// The GET payload masks write-only secrets (Resend API key, Twilio auth token)
// as this exact bullet string. We must NEVER let it be saved back — editing a
// secret has to start from an empty input so an admin can't accidentally store
// "••••••••newkey", and a field left blank must keep the existing secret.
const SECRET_MASK = "••••••••";
const SECRET_KEYS = new Set(["resend.apiKey", "twilio.authToken"]);
/** A secret-field value that must NOT be PATCHed (the mask, or a blank). */
function isUnsavableSecret(key: string, value: string): boolean {
  if (!SECRET_KEYS.has(key)) return false;
  const v = (value ?? "").trim();
  return v === "" || v === SECRET_MASK;
}

/** Platform-level credential presence (booleans only) so each integration shows
 *  an honest "Connected via platform default" when the chapter leaves its own
 *  fields blank. Defaults to all-false so the component is safe without it. */
export type EnvIntegrations = {
  resend?: boolean;
  twilio?: boolean;
  stripe?: boolean;
  googleCal?: boolean;
};

export function SettingsManager({
  initial,
  envIntegrations = {},
}: {
  initial: Record<string, string>;
  envIntegrations?: EnvIntegrations;
}) {
  const { push } = useToast();
  const [values, setValues] = React.useState(initial);
  const [dirty, setDirty] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  // Guard against accidental tab-close / refresh / back-nav while the rush
  // chair has unsaved edits. Modern browsers ignore the returnValue string
  // and show a generic "leave site?" prompt, but the prompt itself is the
  // safety net — they can't lose 20 minutes of copy edits to a stray Cmd-W.
  React.useEffect(() => {
    if (dirty.size === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty.size]);

  function set(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
    setDirty((d) => new Set(d).add(key));
  }

  async function save() {
    if (dirty.size === 0) return;
    // Build the PATCH from dirty fields, but DROP any secret field still holding
    // the mask or left blank — only a real, newly-typed secret value is saved,
    // so a blank input keeps the existing secret instead of wiping it.
    const updates: Record<string, string> = {};
    for (const k of dirty) {
      if (isUnsavableSecret(k, values[k])) continue;
      updates[k] = values[k];
    }
    const count = Object.keys(updates).length;
    if (count === 0) {
      // Nothing real to persist (e.g. the admin focused a secret field then
      // left it blank). Clear the dirty state quietly — no empty PATCH.
      setDirty(new Set());
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error();
      push({ title: `Saved ${count} change${count === 1 ? "" : "s"}`, variant: "success" });
      setDirty(new Set());
    } catch {
      push({ title: "Save failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  // ── Live integration connection status ────────────────────────────────────
  // A field counts as "set" when it holds a real value OR the secret mask (a
  // configured secret the admin hasn't re-typed). We compute one of three honest
  // states per integration so the section header shows the admin exactly where
  // each one stands — the "connect this" UX the platform needs.
  const has = (k: string) => {
    const v = (values[k] ?? "").trim();
    return v !== "" && v !== SECRET_MASK;
  };
  // Email: chapter creds = its own Resend key (+ optional from). Platform = env.
  const resendState: "connected" | "platform" | "off" = has("resend.apiKey")
    ? "connected"
    : envIntegrations.resend
      ? "platform"
      : "off";
  // SMS: chapter creds = the full Twilio triple. Platform = env triple.
  const twilioOwn = has("twilio.accountSid") && has("twilio.authToken") && has("twilio.phoneNumber");
  const twilioState: "connected" | "platform" | "off" = twilioOwn
    ? "connected"
    : envIntegrations.twilio
      ? "platform"
      : "off";
  // Calendar: the built-in scheduler ALWAYS works, so this is never "off" — it's
  // "connected" when a Cal.diy URL is set, else "platform" (built-in default).
  const calState: "connected" | "platform" | "off" = has("calendar.calDiyUrl")
    ? "connected"
    : "platform";
  // Dues (online card payments): live when enabled + a publishable key is set AND
  // the platform Stripe secret exists; otherwise not connected (manual-only).
  const duesState: "connected" | "platform" | "off" =
    values["dues.enabled"] === "true" && has("dues.stripePublishableKey") && !!envIntegrations.stripe
      ? "connected"
      : "off";

  return (
    <div className="space-y-6">
      {dirty.size > 0 && (
        <div
          role="region"
          aria-label={`${dirty.size} unsaved change${dirty.size === 1 ? "" : "s"}`}
          className="sticky top-16 z-30 -mx-4 sm:mx-0 px-4 sm:px-0"
        >
          <div className="rounded-xl border border-phisig-red/30 bg-white shadow-lg p-3 flex items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-semibold">{dirty.size}</span> unsaved change{dirty.size === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setValues(initial); setDirty(new Set()); }}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Discard
              </Button>
              <Button size="sm" onClick={save} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER IDENTITY — the white-label foundation. Every page title,
          social-share card, JSON-LD knowledge-panel record, PWA launcher,
          email signature, and footer attribution reads from these fields.
          Fill these out once and the site re-brands end-to-end. */}
      <Section id="chapter" title="Chapter identity" eyebrow="Who and where - drives page titles, social shares, JSON-LD, footer" icon={ShieldCheck}>
        <p className="text-xs text-muted-foreground mb-4">
          These fields white-label the entire site. A net-new chapter spinning up the platform fills these
          in once on the <Link href="/admin/setup" className="text-phisig-red hover:underline font-medium">setup wizard</Link>.
          Existing deployments can tweak any line below - changes apply on next page load.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Fraternity name (full)">
            <Input value={values["chapter.fraternityName"] || ""} onChange={(e) => set("chapter.fraternityName", e.target.value)} placeholder="Phi Sigma Kappa" />
          </Field>
          <Field label="Fraternity short name">
            <Input value={values["chapter.fraternityShort"] || ""} onChange={(e) => set("chapter.fraternityShort", e.target.value)} placeholder="Phi Sig" />
          </Field>
          <Field label="Greek letters (chapter designation)">
            <Input value={values["chapter.greekLetters"] || ""} onChange={(e) => set("chapter.greekLetters", e.target.value)} placeholder="Gamma Triton" />
          </Field>
          <Field label="Greek-letter glyphs (optional)">
            <Input value={values["chapter.greekLettersGlyphs"] || ""} onChange={(e) => set("chapter.greekLettersGlyphs", e.target.value)} placeholder="ΓΤ" />
          </Field>
          <Field label="School / university name (full)">
            <Input value={values["chapter.schoolName"] || ""} onChange={(e) => set("chapter.schoolName", e.target.value)} placeholder="University of South Carolina" />
          </Field>
          <Field label="School short / acronym">
            <Input value={values["chapter.schoolShort"] || ""} onChange={(e) => set("chapter.schoolShort", e.target.value)} placeholder="USC" />
          </Field>
          <Field label="School URL">
            <Input value={values["chapter.schoolUrl"] || ""} onChange={(e) => set("chapter.schoolUrl", e.target.value)} placeholder="https://sc.edu" />
          </Field>
          <Field label="National fraternity HQ URL">
            <Input value={values["chapter.nationalHqUrl"] || ""} onChange={(e) => set("chapter.nationalHqUrl", e.target.value)} placeholder="https://phisigmakappa.org" />
          </Field>
          <Field label="Chapter charter year">
            <Input value={values["chapter.charterYear"] || ""} onChange={(e) => set("chapter.charterYear", e.target.value)} placeholder="1975" />
          </Field>
          <Field label="National founding year">
            <Input value={values["chapter.foundingYear"] || ""} onChange={(e) => set("chapter.foundingYear", e.target.value)} placeholder="1873" />
          </Field>
          <Field label="National founding location">
            <Input value={values["chapter.foundingLocation"] || ""} onChange={(e) => set("chapter.foundingLocation", e.target.value)} placeholder="Massachusetts Agricultural College" />
          </Field>
          <Field label="Cardinal principles / motto line">
            <Input value={values["chapter.cardinalPrinciples"] || ""} onChange={(e) => set("chapter.cardinalPrinciples", e.target.value)} placeholder="Brotherhood, Scholarship, Character" />
          </Field>
          <Field label="Chapter tagline / hashtag">
            <Input value={values["chapter.tagline"] || ""} onChange={(e) => set("chapter.tagline", e.target.value)} placeholder="#DamnProud" />
          </Field>
          <Field label="iOS home-screen launcher title (≤12 chars)">
            <Input value={values["chapter.appShortTitle"] || ""} onChange={(e) => set("chapter.appShortTitle", e.target.value)} placeholder="Phi Sig USC" maxLength={12} />
          </Field>
          <Field label="Organization type">
            <Select value={values["chapter.orgType"] || "fraternity"} onValueChange={(v) => set("chapter.orgType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fraternity">Fraternity</SelectItem>
                <SelectItem value="sorority">Sorority</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="other">Co-ed / Other</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sets terminology: Brother / Sister / Member.
            </p>
          </Field>
          <Field label="Chapter timezone">
            <Select value={values["chapter.timezone"] || "America/New_York"} onValueChange={(v) => set("chapter.timezone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern (America/New_York)</SelectItem>
                <SelectItem value="America/Chicago">Central (America/Chicago)</SelectItem>
                <SelectItem value="America/Denver">Mountain (America/Denver)</SelectItem>
                <SelectItem value="America/Phoenix">Arizona (America/Phoenix)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific (America/Los_Angeles)</SelectItem>
                <SelectItem value="America/Anchorage">Alaska (America/Anchorage)</SelectItem>
                <SelectItem value="Pacific/Honolulu">Hawaii (Pacific/Honolulu)</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Used for SMS quiet-hours (TCPA).
            </p>
          </Field>
        </div>
      </Section>

      {/* BRAND LOGO — chapter crest/logo upload (white-label) */}
      <Section id="logo" title="Chapter logo" eyebrow="Upload your crest - replaces the auto-generated shield" icon={ImageIcon}>
        <p className="text-xs text-muted-foreground mb-4">
          Upload your chapter&apos;s logo or crest (square or transparent PNG works best). It appears in
          the site header, footer, and login screens - replacing the auto-generated shield. Leave blank
          to keep the generated mark in your brand colors. Click <strong>Save</strong> to apply.
        </p>
        <BrandLogoInput
          value={values["brand.logoUrl"] || ""}
          onChange={(v) => set("brand.logoUrl", v)}
        />
      </Section>

      {/* BRAND COLORS — chapter-level theme override (white-label) */}
      <Section title="Brand colors" eyebrow="Set your chapter's primary color" icon={IconSpark}>
        <p className="text-xs text-muted-foreground mb-4">
          {/* WHITE-LABEL: name the PLATFORM default (royal blue), never a specific
              chapter's color. Mirrors DEFAULTS["brand.primaryHex"] in
              lib/site-config.ts (#2563eb) so the help text can't drift from the
              real default. */}
          The platform default is Greek Stack royal blue{" "}
          <code className="font-mono text-foreground">#2563EB</code>. Paste your
          school&apos;s hex code to theme the whole site. Format:{" "}
          <code className="font-mono text-foreground">#RRGGBB</code>. Changes apply on next page load - no
          code rebuild needed.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Primary (default #C8102E)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={values["brand.primaryHex"] || "#C8102E"}
                onChange={(e) => set("brand.primaryHex", e.target.value)}
                className="h-9 w-12 rounded-md border border-border cursor-pointer"
                aria-label="Primary brand color picker"
              />
              <Input
                value={values["brand.primaryHex"] || ""}
                onChange={(e) => set("brand.primaryHex", e.target.value)}
                placeholder="#C8102E"
                className="font-mono"
              />
            </div>
          </Field>
          <Field label="Primary dark (default #A20D26)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={values["brand.primaryDarkHex"] || "#A20D26"}
                onChange={(e) => set("brand.primaryDarkHex", e.target.value)}
                className="h-9 w-12 rounded-md border border-border cursor-pointer"
                aria-label="Primary dark brand color picker"
              />
              <Input
                value={values["brand.primaryDarkHex"] || ""}
                onChange={(e) => set("brand.primaryDarkHex", e.target.value)}
                placeholder="#A20D26"
                className="font-mono"
              />
            </div>
          </Field>
          <Field label="Primary soft / tint (default #FCEFF1)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={values["brand.primarySoftHex"] || "#FCEFF1"}
                onChange={(e) => set("brand.primarySoftHex", e.target.value)}
                className="h-9 w-12 rounded-md border border-border cursor-pointer"
                aria-label="Primary soft brand color picker"
              />
              <Input
                value={values["brand.primarySoftHex"] || ""}
                onChange={(e) => set("brand.primarySoftHex", e.target.value)}
                placeholder="#FCEFF1"
                className="font-mono"
              />
            </div>
          </Field>
        </div>
      </Section>

      {/* DUES COLLECTION — Stripe Checkout (R43-A).
          Optional white-label payment acceptance. Off by default; flip
          dues.enabled to "true" once all four prereqs are filled and a
          brother-facing "Pay $X dues" button appears on their own
          profile card. Graceful degrade if any prereq missing — the
          existing manual badge-toggle is the chapter's universal
          fallback for cash/Venmo/check. */}
      <Section
        id="dues"
        title="Dues collection (Stripe)"
        eyebrow="Optional - accept dues online via Stripe Checkout"
        icon={CreditCard}
        status={
          <IntegrationStatus
            state={duesState}
            label={duesState === "connected" ? "Online dues live" : "Manual dues only"}
          />
        }
      >
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3.5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-bold text-foreground mb-1">💡 Save on Your Platform Fee!</p>
          <span>
            If you collect dues online via Greek Stack, you can waive your monthly $50/mo platform subscription fee! Under this plan, we just take a percentage of dues collected. 
            To activate this, please <a href={`mailto:${SUPPORT_EMAIL}?subject=Greek%20Stack%20Dues%20Setup`} className="underline font-semibold text-foreground hover:text-emerald-500 transition-colors">reach out to our team</a> to configure your specific dues payments and amount.
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Leave <span className="font-mono">dues.enabled</span> as <span className="font-mono">false</span> to
          keep manual-only mode (admin toggles a brother&apos;s dues badge - same as today). To enable
          online payment, every chapter must (1) create a Stripe account, (2) paste the publishable
          key here, (3) set <span className="font-mono">STRIPE_SECRET_KEY</span> as a server env var
          (Vercel dashboard - never lives in this DB), and (4) create a webhook in Stripe pointing
          at <span className="font-mono">/api/dues/webhook</span> and paste the signing secret here.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Enable online dues (true / false)">
            <Input
              value={values["dues.enabled"] || "false"}
              onChange={(e) => set("dues.enabled", e.target.value)}
              placeholder="false"
              className="font-mono"
            />
          </Field>
          <Field label="Display label (shown on Stripe Checkout)">
            <Input
              value={values["dues.label"] || ""}
              onChange={(e) => set("dues.label", e.target.value)}
              placeholder="Chapter dues - Fall 2026"
            />
          </Field>
          <Field label="Amount (cents - e.g. 15000 = $150.00)">
            <Input
              type="number"
              min={100}
              value={values["dues.amountCents"] || "15000"}
              onChange={(e) => set("dues.amountCents", e.target.value)}
              placeholder="15000"
              className="font-mono"
            />
          </Field>
          <Field label="Currency (3-letter ISO)">
            <Input
              value={values["dues.currency"] || "usd"}
              onChange={(e) => set("dues.currency", e.target.value)}
              placeholder="usd"
              className="font-mono"
            />
          </Field>
          <Field label="Academic period (stamped on payment row)">
            <Input
              value={values["dues.year"] || ""}
              onChange={(e) => set("dues.year", e.target.value)}
              placeholder="2026-fall"
              className="font-mono"
            />
          </Field>
          <Field label="Pass Stripe fee to brother (true / false)">
            <Input
              value={values["dues.passThroughFee"] || "false"}
              onChange={(e) => set("dues.passThroughFee", e.target.value)}
              placeholder="false"
              className="font-mono"
            />
          </Field>
          <Field label="Platform application fee %">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={values["dues.platformFeePct"] || ""}
              onChange={(e) => set("dues.platformFeePct", e.target.value)}
              placeholder="0"
              className="font-mono"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Platform application fee % on dues/donations when payouts are connected. Default 0.
            </p>
          </Field>
          <Field label="Stripe publishable key (pk_live_… or pk_test_…)" className="sm:col-span-2">
            <Input
              value={values["dues.stripePublishableKey"] || ""}
              onChange={(e) => set("dues.stripePublishableKey", e.target.value)}
              placeholder="pk_live_…"
              className="font-mono"
            />
          </Field>
          <Field label="Stripe webhook signing secret (whsec_…)" className="sm:col-span-2">
            <Input
              type="password"
              value={values["dues.stripeWebhookSecret"] || ""}
              onChange={(e) => set("dues.stripeWebhookSecret", e.target.value)}
              placeholder="whsec_…"
              className="font-mono"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Different from <span className="font-mono">STRIPE_SECRET_KEY</span> (the
              server env var - never paste a secret key here). Get this from the Stripe
              dashboard after creating a webhook pointing at <span className="font-mono">/api/dues/webhook</span>.
            </p>
          </Field>
        </div>
        <Link
          href="/admin/dues/connect"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-phisig-red hover:underline"
        >
          Connect payout account <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Section>

      {/* EMAIL SENDER (Resend) — optional per-chapter override.
          lib/messaging-config.ts reads resend.apiKey / resend.fromEmail and
          prefers them over the platform RESEND_API_KEY env var when present.
          The apiKey is masked write-only in the GET payload (SECRET_KEY_RE). */}
      <Section
        id="resend"
        title="Email sender (Resend)"
        eyebrow="Optional - send transactional email from your own Resend account"
        icon={Mail}
        status={
          <IntegrationStatus
            state={resendState}
            label={
              resendState === "connected"
                ? "Connected · your Resend"
                : resendState === "platform"
                  ? "Live · platform email"
                  : "Email not connected"
            }
          />
        }
      >
        {resendState === "off" && (
          <div className="mb-4 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <strong>Email isn&apos;t connected yet.</strong> Add your chapter&apos;s Resend API key
            below (free at <span className="font-mono">resend.com</span>) to send rush replies,
            invites, and confirmations. Until then, those emails are queued but not delivered.
          </div>
        )}
        <p className="text-xs text-muted-foreground mb-4">
          Optional - use your chapter&apos;s own Resend account + verified domain. Leave blank to use
          the platform default.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Resend API key">
            <SecretInput
              value={values["resend.apiKey"] || ""}
              onChange={(v) => set("resend.apiKey", v)}
              placeholder="re_…"
            />
          </Field>
          <Field label="From email (verified domain)">
            <Input
              value={values["resend.fromEmail"] || ""}
              onChange={(e) => set("resend.fromEmail", e.target.value)}
              placeholder="rush@yourchapter.com"
            />
          </Field>
        </div>
      </Section>

      {/* SMS (Twilio) — optional per-chapter override.
          lib/messaging-config.ts reads twilio.accountSid / twilio.authToken /
          twilio.phoneNumber and prefers them over the platform env vars when
          present. authToken is masked write-only in the GET payload. Quiet-hours
          enforcement (TCPA) keys off chapter.timezone above. */}
      <Section
        id="twilio"
        title="SMS (Twilio)"
        eyebrow="Optional - text from your own Twilio number"
        icon={MessageSquare}
        status={
          <IntegrationStatus
            state={twilioState}
            label={
              twilioState === "connected"
                ? "Connected · your number"
                : twilioState === "platform"
                  ? "Live · platform number"
                  : "SMS not connected"
            }
          />
        }
      >
        {twilioState === "off" && (
          <div className="mb-4 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <strong>Texting isn&apos;t connected yet.</strong> Recruits expect a text the moment an
            event is set. Add your chapter&apos;s Twilio Account SID, Auth Token, and phone number
            below to turn on rush SMS + the double-opt-in flow. Sign up at{" "}
            <span className="font-mono">twilio.com</span>. Until connected, the &ldquo;text&rdquo;
            actions are disabled and you can still reach recruits by email.
          </div>
        )}
        <p className="text-xs text-muted-foreground mb-4">
          Optional - your chapter&apos;s own Twilio number. Blank = platform default. Texting outside
          8am - 9pm recipient-local is blocked (TCPA).
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Account SID">
            <Input
              value={values["twilio.accountSid"] || ""}
              onChange={(e) => set("twilio.accountSid", e.target.value)}
              placeholder="AC…"
              className="font-mono"
            />
          </Field>
          <Field label="Auth token">
            <SecretInput
              value={values["twilio.authToken"] || ""}
              onChange={(v) => set("twilio.authToken", v)}
              placeholder="AC… auth token"
            />
          </Field>
          <Field label="Phone number (E.164)">
            <Input
              value={values["twilio.phoneNumber"] || ""}
              onChange={(e) => set("twilio.phoneNumber", e.target.value)}
              placeholder="+1…"
              className="font-mono"
            />
          </Field>
        </div>
      </Section>

      {/* CALENDAR & SCHEDULING (Cal.diy) */}
      <Section
        id="calendar"
        title="Calendar &amp; Scheduling (Cal.diy)"
        eyebrow="Connect Cal.diy / Cal.com for scheduling events"
        icon={CalendarDays}
        status={
          <IntegrationStatus
            state={calState}
            label={calState === "connected" ? "Connected · Cal.diy" : "Live · built-in scheduler"}
          />
        }
      >
        <p className="text-xs text-muted-foreground mb-4">
          Enable self-serve event scheduling for brothers and visitors. Clone and host <code className="font-mono text-foreground">https://github.com/calcom/cal.diy.git</code> and paste your instance booking URL or Cal.com username below (e.g. <code className="font-mono">phisigusc</code> or <code className="font-mono">https://cal.phisigusc.com/rush-coffee</code>). If left blank, the site will use a gorgeous, fully-functional built-in scheduler that records events directly to the database and sends confirmations via Resend.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Cal.diy / Cal.com Username or Booking URL">
            <Input
              value={values["calendar.calDiyUrl"] || ""}
              onChange={(e) => set("calendar.calDiyUrl", e.target.value)}
              placeholder="e.g. phisigusc or https://cal.phisigusc.com/meeting"
            />
          </Field>
        </div>
      </Section>

      {/* HERO */}
      <Section title="Hero" eyebrow="Top of homepage" icon={IconSpark}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Eyebrow badge text">
            <Input value={values["hero.eyebrow"] || ""} onChange={(e) => set("hero.eyebrow", e.target.value)} placeholder="Fall Rush 2026 - Interest list now open" />
          </Field>
          <Field label="Subline / hero copy">
            <Textarea
              value={values["hero.subline"] || ""}
              onChange={(e) => set("hero.subline", e.target.value)}
              placeholder="Phi Sigma Kappa, Gamma Triton at the University of South Carolina…"
              rows={3}
            />
          </Field>
          <Field label="Headline part 1">
            <Input value={values["hero.h1.lead"] || ""} onChange={(e) => set("hero.h1.lead", e.target.value)} placeholder="The chapter that built" />
          </Field>
          <Field label="Headline part 2">
            <Input value={values["hero.h1.tail"] || ""} onChange={(e) => set("hero.h1.tail", e.target.value)} placeholder="the men of" />
          </Field>
          <Field label="Headline highlight (red word)">
            <Input value={values["hero.h1.highlight"] || ""} onChange={(e) => set("hero.h1.highlight", e.target.value)} placeholder="Carolina" />
          </Field>
          <Field label="Primary CTA label">
            <Input value={values["hero.cta.label"] || ""} onChange={(e) => set("hero.cta.label", e.target.value)} placeholder="Get on the interest list" />
          </Field>
          <Field label="Primary CTA link" className="sm:col-span-2">
            <Input value={values["hero.cta.href"] || ""} onChange={(e) => set("hero.cta.href", e.target.value)} placeholder="#register or https://…" />
          </Field>
        </div>
      </Section>

      {/* E-BOARD */}
      <Section id="eboard" title="Executive board" eyebrow="5 leadership cards on homepage" icon={Crown}>
        <p className="text-xs text-muted-foreground mb-4">
          Fill in the brothers' names and roles. Leave a row blank to hide that slot. Headshot optional - paste an Instagram slug or upload a photo.
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Slot {n}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Name">
                  <Input value={values[`eboard.${n}.name`] || ""} onChange={(e) => set(`eboard.${n}.name`, e.target.value)} placeholder="Mark Laughery" />
                </Field>
                <Field label="Role">
                  <Input value={values[`eboard.${n}.role`] || ""} onChange={(e) => set(`eboard.${n}.role`, e.target.value)} placeholder="President" />
                </Field>
              </div>
              <Field label="Headshot (optional)">
                <EboardHeadshotInput
                  value={values[`eboard.${n}.headshotUrl`] || ""}
                  onChange={(v) => set(`eboard.${n}.headshotUrl`, v)}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      {/* CONTACT */}
      <Section id="contact" title="Contact &amp; social" eyebrow="Email, address, Instagram, advisor" icon={Mail}>
        {(values["contact.advisorName"] === "Chapter Advisor" || !values["contact.advisorName"] || !values["contact.rushPhone"]) && (
          <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900">
            <strong className="font-semibold">Heads up - visible on the public site:</strong>{" "}
            {values["contact.advisorName"] === "Chapter Advisor" || !values["contact.advisorName"]
              ? "Replace “Chapter Advisor” with the real advisor's full name. "
              : ""}
            {!values["contact.rushPhone"]
              ? "Add a chapter or rush-chair phone number - parents reviewing the site expect a callable contact, not just an email."
              : ""}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Rush email">
            <Input value={values["contact.rushEmail"] || ""} onChange={(e) => set("contact.rushEmail", e.target.value)} placeholder="rush@phisig-usc.com" />
          </Field>
          <Field label="Rush phone (optional)">
            <Input value={values["contact.rushPhone"] || ""} onChange={(e) => set("contact.rushPhone", e.target.value)} placeholder="(803) 555-0142" />
          </Field>
          <Field label="Chapter advisor - name">
            <Input value={values["contact.advisorName"] || ""} onChange={(e) => set("contact.advisorName", e.target.value)} placeholder="Dr. Jane Doe" />
          </Field>
          <Field label="Chapter advisor - title">
            <Input value={values["contact.advisorTitle"] || ""} onChange={(e) => set("contact.advisorTitle", e.target.value)} placeholder="Alumni Chapter Advisor, Gamma Triton" />
          </Field>
          <Field label="Chapter advisor - email">
            <Input value={values["contact.advisorEmail"] || ""} onChange={(e) => set("contact.advisorEmail", e.target.value)} placeholder="advisor@phisig-usc.com" />
          </Field>
          <Field label="Address">
            <Input value={values["contact.address"] || ""} onChange={(e) => set("contact.address", e.target.value)} placeholder="1525 College St" />
          </Field>
          <Field label="City / state / zip">
            <Input value={values["contact.cityState"] || ""} onChange={(e) => set("contact.cityState", e.target.value)} placeholder="Columbia, SC 29208" />
          </Field>
          <Field label="Google Maps URL">
            <Input value={values["contact.mapsUrl"] || ""} onChange={(e) => set("contact.mapsUrl", e.target.value)} placeholder="https://maps.google.com/?q=…" />
          </Field>
          <Field label="Instagram handle">
            <Input value={values["contact.instagramHandle"] || ""} onChange={(e) => set("contact.instagramHandle", e.target.value)} placeholder="@yourchapter" />
          </Field>
          <Field label="Instagram URL">
            <Input value={values["contact.instagramUrl"] || ""} onChange={(e) => set("contact.instagramUrl", e.target.value)} placeholder="https://www.instagram.com/yourchapter/" />
          </Field>
        </div>
      </Section>

      {/* PHILANTHROPY */}
      <Section title="Philanthropy" eyebrow="Beneficiary, dollars raised" icon={HandHeart}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Beneficiary (full name)">
            <Input value={values["philanthropy.beneficiary"] || ""} onChange={(e) => set("philanthropy.beneficiary", e.target.value)} placeholder="Special Olympics South Carolina" />
          </Field>
          <Field label="Beneficiary (short label)">
            <Input value={values["philanthropy.beneficiaryShort"] || ""} onChange={(e) => set("philanthropy.beneficiaryShort", e.target.value)} placeholder="Special Olympics SC" />
          </Field>
          <Field label="Most recent year">
            <Input value={values["philanthropy.raisedYear"] || ""} onChange={(e) => set("philanthropy.raisedYear", e.target.value)} placeholder="2025" />
          </Field>
          <Field label="Most recent event total">
            <Input value={values["philanthropy.raisedAmount"] || ""} onChange={(e) => set("philanthropy.raisedAmount", e.target.value)} placeholder="$700" />
          </Field>
          <Field label="All-time total" className="sm:col-span-2">
            <Input value={values["philanthropy.raisedTotal"] || ""} onChange={(e) => set("philanthropy.raisedTotal", e.target.value)} placeholder="$25k+" />
          </Field>
        </div>
      </Section>

      {/* TIMELINE — admin repeater */}
      <Section title="How rush works (timeline)" eyebrow="Week-by-week schedule cards" icon={CalendarDays}>
        <p className="text-xs text-muted-foreground mb-4">
          Three weeks by default. Add or remove rows as your chapter&apos;s schedule changes.
        </p>
        <JsonArrayEditor
          value={values["timeline.json"]}
          onChange={(v) => set("timeline.json", v)}
          fields={[
            { key: "week", label: "Week label", placeholder: "Week 1" },
            { key: "title", label: "Title", placeholder: "Open events" },
            { key: "body", label: "Body", placeholder: "What happens this week", textarea: true },
          ]}
          newRow={{ week: "", title: "", body: "" }}
          rowLabel={(r) => `${r.week || "(unnamed)"} - ${r.title || "untitled"}`}
        />
      </Section>

      {/* FAQ — admin repeater */}
      <Section title="FAQ" eyebrow="Common questions accordion" icon={IconSpark}>
        <p className="text-xs text-muted-foreground mb-4">
          Add as many Q&amp;A pairs as you want. They render in the order shown here.
        </p>
        <JsonArrayEditor
          value={values["faq.json"]}
          onChange={(v) => set("faq.json", v)}
          fields={[
            { key: "q", label: "Question", placeholder: "Is there a GPA requirement?" },
            { key: "a", label: "Answer", placeholder: "Our chapter average is…", textarea: true },
          ]}
          newRow={{ q: "", a: "" }}
          rowLabel={(r) => r.q || "(empty question)"}
        />
      </Section>

      {/* VALUES cards */}
      <Section title="Three Cardinal Principles" eyebrow="Brotherhood / Scholarship / Character cards" icon={ShieldCheck}>
        <JsonArrayEditor
          value={values["values.json"]}
          onChange={(v) => set("values.json", v)}
          fields={[
            { key: "title", label: "Title", placeholder: "Brotherhood" },
            { key: "body", label: "Body", placeholder: "Lifelong friendships…", textarea: true },
            { key: "icon", label: "Icon", placeholder: "Users", iconPicker: true },
          ]}
          newRow={{ title: "", body: "", icon: "Users" }}
          rowLabel={(r) => r.title || "(unnamed)"}
        />
      </Section>

      {/* HIGHLIGHTS ribbon */}
      <Section title="Highlights ribbon" eyebrow="Compact icon + label row under stats" icon={ListChecks}>
        <JsonArrayEditor
          value={values["highlights.json"]}
          onChange={(v) => set("highlights.json", v)}
          fields={[
            { key: "label", label: "Label", placeholder: "Special Olympics SC partners" },
            { key: "icon", label: "Icon", placeholder: "HandHeart", iconPicker: true },
          ]}
          newRow={{ label: "", icon: "HandHeart" }}
          rowLabel={(r) => r.label || "(empty)"}
        />
      </Section>

      {/* INSTAGRAM FEED grid */}
      <Section
        title="Instagram feed"
        eyebrow="Photo grid in the “A year in the life” section"
        icon={Activity}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Add your chapter&apos;s own posts here - each row is one tile. Paste an
          Instagram post code (the part after <code>/p/</code> in the post URL)
          or a full image URL. Leave this empty and the section shows a branded
          crest placeholder instead. Turn the section on under{" "}
          <strong>Section visibility → Instagram feed</strong> once you&apos;ve
          added posts.
        </p>
        <JsonArrayEditor
          value={values["feed.json"]}
          onChange={(v) => set("feed.json", v)}
          fields={[
            { key: "slug", label: "Post code or image URL", placeholder: "DUyvfpokpy6 or https://…" },
            { key: "caption", label: "Caption", placeholder: "Polar Plunge raised $700…" },
            { key: "tag", label: "Tag", placeholder: "Philanthropy" },
            { key: "objectPosition", label: "Crop (optional)", placeholder: "center 60%" },
          ]}
          newRow={{ slug: "", caption: "", tag: "", objectPosition: "" }}
          rowLabel={(r) => `${r.tag || "(no tag)"} - ${r.caption || "no caption"}`}
        />
      </Section>

      {/* RECENT activity strip */}
      <Section title="Recent activity strip" eyebrow="4 cards under the Instagram feed" icon={Activity}>
        <JsonArrayEditor
          value={values["recent.json"]}
          onChange={(v) => set("recent.json", v)}
          fields={[
            { key: "tag", label: "Tag", placeholder: "Philanthropy" },
            { key: "title", label: "Title", placeholder: "Polar Plunge raised $700…" },
            { key: "icon", label: "Icon", placeholder: "HandHeart", iconPicker: true },
          ]}
          newRow={{ tag: "", title: "", icon: "Trophy" }}
          rowLabel={(r) => `${r.tag || "(no tag)"} - ${r.title || "no title"}`}
        />
      </Section>

      {/* TESTIMONIAL */}
      <Section title="Alumni testimonial" eyebrow="Quote in the testimonial section" icon={MessageSquareQuote}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Quote" className="sm:col-span-2">
            <Textarea
              value={values["testimonial.quote"] || ""}
              onChange={(e) => set("testimonial.quote", e.target.value)}
              rows={4}
              placeholder="Phi Sig isn't a four-year decision…"
            />
          </Field>
          <Field label="Author">
            <Input
              value={values["testimonial.author"] || ""}
              onChange={(e) => set("testimonial.author", e.target.value)}
              placeholder="A. Mitchell"
            />
          </Field>
          <Field label="Class year">
            <Input
              value={values["testimonial.classYear"] || ""}
              onChange={(e) => set("testimonial.classYear", e.target.value)}
              placeholder="'22"
            />
          </Field>
          <Field label="Attribution / role" className="sm:col-span-2">
            <Input
              value={values["testimonial.attribution"] || ""}
              onChange={(e) => set("testimonial.attribution", e.target.value)}
              placeholder="Gamma Triton alumnus, finance"
            />
          </Field>
        </div>
      </Section>

      {/* ABOUT history paragraph + anti-hazing body */}
      <Section title="Long-form copy" eyebrow="History paragraph + anti-hazing block body" icon={FileText}>
        <div className="space-y-4">
          <Field label="About-section history paragraph (your founding year, chapter charter, etc.)">
            <Textarea
              value={values["about.history"] || ""}
              onChange={(e) => set("about.history", e.target.value)}
              rows={5}
              placeholder="Phi Sigma Kappa was founded at Massachusetts Agricultural College in 1873…"
            />
          </Field>
          <Field label="Anti-hazing block body (the paragraph above the hotline)">
            <Textarea
              value={values["antiHazing.body"] || ""}
              onChange={(e) => set("antiHazing.body", e.target.value)}
              rows={4}
              placeholder="Phi Sigma Kappa national and the Gamma Triton chapter strictly prohibit hazing in any form…"
            />
          </Field>
        </div>
      </Section>

      {/* ANTI-HAZING + PRIVACY */}
      <Section title="Anti-hazing &amp; privacy" eyebrow="Compliance copy" icon={ShieldCheck}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="National anti-hazing hotline (display)">
            <Input value={values["antiHazing.hotline"] || ""} onChange={(e) => set("antiHazing.hotline", e.target.value)} placeholder="1-888-NOT-HAZE" />
          </Field>
          <Field label="Anti-hazing resource URL">
            <Input value={values["antiHazing.hotlineUrl"] || ""} onChange={(e) => set("antiHazing.hotlineUrl", e.target.value)} placeholder="https://hazingprevention.org/help/" />
          </Field>
          <Field label="Privacy policy &lsquo;Last updated&rsquo;" className="sm:col-span-2">
            <Input value={values["privacy.lastUpdated"] || ""} onChange={(e) => set("privacy.lastUpdated", e.target.value)} placeholder="May 2026" />
          </Field>
        </div>
      </Section>

      {/* HERO PHOTOS */}
      <Section title="Hero photo collage" eyebrow="3 tiles in the hero (right side)" icon={ImageIcon}>
        <p className="text-xs text-muted-foreground mb-4">
          {/* WHITE-LABEL: link to THIS chapter's own Instagram (set in the Contact
              section above), never a hardcoded reference account. Falls back to
              generic guidance when the chapter hasn't set its handle yet, so a
              fresh tenant never sees another chapter's @handle. */}
          {values["contact.instagramUrl"] || values["contact.instagramHandle"] ? (
            <>
              Each tile shows a real Instagram post from{" "}
              <Link
                href={cleanUrl(values["contact.instagramUrl"]) || `https://www.instagram.com/${(values["contact.instagramHandle"] || "").replace(/^@/, "")}/`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-phisig-red hover:underline inline-flex items-center gap-1"
              >
                {values["contact.instagramHandle"] || "your chapter Instagram"} <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
              . Find a post on Instagram, copy the slug from the URL (the part after <code className="text-foreground">/p/</code>), and paste it below.
            </>
          ) : (
            <>
              Each tile shows a real Instagram post from your chapter&apos;s account.
              Set your Instagram handle in the Contact section above, then find a
              post, copy the slug from its URL (the part after{" "}
              <code className="text-foreground">/p/</code>), and paste it below.
            </>
          )}
        </p>
        <div className="grid lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <PhotoCard
              key={n}
              title={n === 1 ? "Tile 1 (large)" : `Tile ${n}`}
              slug={values[`hero.tile${n}.slug`] || ""}
              caption={values[`hero.tile${n}.caption`] || ""}
              icon={values[`hero.tile${n}.icon`] || ""}
              onChangeSlug={(v) => set(`hero.tile${n}.slug`, v)}
              onChangeCaption={(v) => set(`hero.tile${n}.caption`, v)}
              onChangeIcon={(v) => set(`hero.tile${n}.icon`, v)}
              handle={values["contact.instagramHandle"]}
            />
          ))}
        </div>
      </Section>

      {/* SPOTLIGHT */}
      <Section title="Brother of the Month" eyebrow="Spotlight section" icon={Star}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram post slug">
            <Input value={values["spotlight.slug"] || ""} onChange={(e) => set("spotlight.slug", e.target.value)} placeholder="DXzzTaFjSyj" />
          </Field>
          <Field label="Month">
            <Input value={values["spotlight.month"] || ""} onChange={(e) => set("spotlight.month", e.target.value)} placeholder="April" />
          </Field>
          <Field label="Brother's name">
            <Input value={values["spotlight.name"] || ""} onChange={(e) => set("spotlight.name", e.target.value)} placeholder="Michael McCarthy" />
          </Field>
          <Field label="Role / class">
            <Input value={values["spotlight.role"] || ""} onChange={(e) => set("spotlight.role", e.target.value)} placeholder="Freshman · Philanthropy Chair" />
          </Field>
          <Field label="Bio (1-2 sentences)" className="sm:col-span-2">
            <Textarea
              value={values["spotlight.bio"] || ""}
              onChange={(e) => set("spotlight.bio", e.target.value)}
              rows={3}
              placeholder="What this brother did to earn the recognition."
            />
          </Field>
          <Field label="Achievements / bullets" className="sm:col-span-2">
            <Textarea
              value={values["spotlight.bullets"] || ""}
              onChange={(e) => set("spotlight.bullets", e.target.value)}
              rows={4}
              placeholder={"Dean's List, Spring 2026\nLed the Polar Plunge fundraiser\nIntramural soccer captain"}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              One achievement per line - shown as the spotlight bullet list.
            </p>
          </Field>
        </div>
        <PhotoPreview slug={values["spotlight.slug"]} handle={values["contact.instagramHandle"]} className="mt-4" />
      </Section>

      {/* ABOUT */}
      <Section title="About section photo" eyebrow="Right column of the About section" icon={ImageIcon}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram post slug">
            <Input value={values["about.slug"] || ""} onChange={(e) => set("about.slug", e.target.value)} placeholder="DWmioxGCaBG" />
          </Field>
          <Field label="Caption">
            <Input value={values["about.caption"] || ""} onChange={(e) => set("about.caption", e.target.value)} placeholder="Chapter formal - FIPG-compliant" />
          </Field>
          <Field label="Image crop position (CSS object-position)">
            <Select value={values["about.objectPosition"] || "50% 50%"} onValueChange={(v) => set("about.objectPosition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50% 0%">Top</SelectItem>
                <SelectItem value="50% 25%">Upper</SelectItem>
                <SelectItem value="50% 50%">Center</SelectItem>
                <SelectItem value="50% 75%">Lower</SelectItem>
                <SelectItem value="50% 80%">Lower-bottom</SelectItem>
                <SelectItem value="50% 100%">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <PhotoPreview slug={values["about.slug"]} objectPosition={values["about.objectPosition"]} handle={values["contact.instagramHandle"]} className="mt-4" />
      </Section>

      {/* STATS — value + label + subtitle, all admin-editable */}
      <Section title="Stats strip" eyebrow="4 stat tiles under the hero" icon={Crown}>
        <p className="text-xs text-muted-foreground mb-4">
          Each tile has a number, a label, and an optional small subtitle. Re-purpose any
          slot (e.g. swap &ldquo;150+ years strong&rdquo; for &ldquo;12 events / yr&rdquo;) without a code change.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {([
            { val: "stats.brothers", lab: "stats.brothers.label", sub: "stats.brothers.sub", title: "Slot 1" },
            { val: "stats.gpa", lab: "stats.gpa.label", sub: "stats.gpa.sub", title: "Slot 2" },
            { val: "stats.years", lab: "stats.years.label", sub: "stats.years.sub", title: "Slot 3" },
            { val: "stats.charity", lab: "stats.charity.label", sub: "stats.charity.sub", title: "Slot 4" },
          ]).map((s) => (
            <div key={s.val} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{s.title}</p>
              <Field label="Number / value">
                <Input value={values[s.val] || ""} onChange={(e) => set(s.val, e.target.value)} placeholder="60+" />
              </Field>
              <Field label="Label">
                <Input value={values[s.lab] || ""} onChange={(e) => set(s.lab, e.target.value)} placeholder="Active brothers" />
              </Field>
              <Field label="Subtitle (optional)">
                <Input value={values[s.sub] || ""} onChange={(e) => set(s.sub, e.target.value)} placeholder="Above the all-fraternity average" />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      {/* Section visibility */}
      <Section title="What shows on the homepage" eyebrow="Toggle any section on/off" icon={IconSpark}>
        <p className="text-xs text-muted-foreground mb-4">
          Hide any section if it's not ready or not relevant. Toggle off, click Save, and that section disappears from the homepage. Toggle back on whenever.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { key: "show.statsStrip", label: "Stats strip (60+ brothers / 3.45 GPA / etc.)" },
            { key: "show.highlightsBanner", label: "Highlights banner (icon row under stats)" },
            { key: "show.values", label: "Brotherhood / Scholarship / Character cards" },
            { key: "show.instagramFeed", label: "Instagram feed grid" },
            { key: "show.timeline", label: "How rush works (3-week timeline: Open → Closed → Interviews & Bid Day)" },
            { key: "show.testimonial", label: "Alumni testimonial quote" },
            { key: "show.spotlight", label: "Brother of the Month spotlight" },
            { key: "show.eboard", label: "2026 Executive Board card grid" },
            { key: "show.faq", label: "FAQ accordion" },
            { key: "show.whereWeLive", label: "Where We Live (chapter house section)" },
          ].map((s) => {
            const on = (values[s.key] ?? "true") !== "false";
            return (
              <label
                key={s.key}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-phisig-red/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => set(s.key, e.target.checked ? "true" : "false")}
                  className="mt-0.5 h-4 w-4 rounded border-border text-phisig-red focus:ring-phisig-red shrink-0 cursor-pointer"
                />
                <span className="text-sm">{s.label}</span>
              </label>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/**
 * Settings panel section. Renders a card with eyebrow + title + content, and
 * exposes an HTML id so the admin "Get rush ready" checklist deep-links
 * (/admin/settings#contact, /admin/settings#eboard, etc.) actually scroll
 * the admin to the right panel. If `id` is omitted, a slug is derived from
 * the title (lower, alphanumeric only) so every section is anchorable.
 *
 * `scroll-mt-24` keeps the section heading from sitting flush under the
 * sticky admin nav on jump-to-anchor.
 */
function Section({
  title, eyebrow, icon: Icon, children, id, status,
}: {
  title: string;
  eyebrow: string;
  icon: React.ElementType;
  children: React.ReactNode;
  id?: string;
  /** Optional live connection badge rendered to the right of the title — used by
   *  the integration sections (email/SMS/calendar/dues) so the admin sees at a
   *  glance whether each is live or needs setup. */
  status?: React.ReactNode;
}) {
  const anchorId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (
    <Card id={anchorId} className="scroll-mt-24">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
            <Icon className="h-3 w-3" /> {eyebrow}
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {status}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Live connection-status badge for an integration section. Three honest states:
 *   • "connected"   (emerald)  — live now, via the chapter's own creds
 *   • "platform"    (sky)      — live now, via the platform default credential
 *   • "off"         (amber)    — not connected; shows a "Connect this" nudge
 * Pure presentation; the caller computes which state applies from the config
 * values it already holds (no secret ever leaves the server).
 */
function IntegrationStatus({
  state,
  label,
}: {
  state: "connected" | "platform" | "off";
  label?: string;
}) {
  const map = {
    connected: {
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      dot: "bg-emerald-500",
      text: label || "Connected",
    },
    platform: {
      cls: "bg-sky-50 text-sky-700 ring-sky-600/20",
      dot: "bg-sky-500",
      text: label || "Live · platform default",
    },
    off: {
      cls: "bg-amber-50 text-amber-700 ring-amber-600/20",
      dot: "bg-amber-500",
      text: label || "Not connected",
    },
  }[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${map.cls}`}
      role="status"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${map.dot}`} aria-hidden="true" />
      {map.text}
    </span>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 inline-block text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

/**
 * Write-only secret input (Resend API key, Twilio auth token). The GET payload
 * returns these masked as SECRET_MASK ("••••••••"). We render the input EMPTY
 * whenever the stored value is the mask (i.e. a secret is configured but the
 * admin hasn't started editing), so editing always begins from blank — an admin
 * can never accidentally save "••••••••newkey". A "configured — leave blank to
 * keep" badge tells them the existing secret is intact. Only a real, non-empty
 * value the admin types becomes dirty + saved (see save()/isUnsavableSecret).
 */
function SecretInput({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isConfigured = value === SECRET_MASK;
  return (
    <>
      <Input
        type="password"
        // Render empty while the masked secret is untouched so typing starts
        // from a clean field (never appends to the bullets).
        value={isConfigured ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isConfigured ? "configured - leave blank to keep" : placeholder}
        className="font-mono"
        autoComplete="off"
        spellCheck={false}
      />
      {isConfigured && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          A key is saved. Leave blank to keep it, or type a new key to replace it.
        </p>
      )}
    </>
  );
}

function PhotoCard({
  title, slug, caption, icon, onChangeSlug, onChangeCaption, onChangeIcon, handle,
}: {
  title: string; slug: string; caption: string; icon: string;
  onChangeSlug: (v: string) => void; onChangeCaption: (v: string) => void; onChangeIcon: (v: string) => void;
  handle?: string;
}) {
  const { push } = useToast();
  const [uploading, setUploading] = React.useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      onChangeSlug(json.url); // store the full Vercel Blob URL as the "slug"
      push({ title: "Photo uploaded - click Save to apply", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <PhotoPreview slug={slug} handle={handle} />
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-phisig-red text-white px-3 py-2 text-sm font-medium hover:bg-phisig-red-dark transition-colors">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload photo"}
        </span>
      </label>
      <p className="text-[10px] text-muted-foreground">
        Or paste an Instagram post slug below (the part after <code className="text-foreground">/p/</code>):
      </p>
      <Field label="Image source">
        <Input value={slug} onChange={(e) => onChangeSlug(e.target.value)} placeholder="DXzzTaFjSyj or full URL" />
      </Field>
      <Field label="Caption">
        <Input value={caption} onChange={(e) => onChangeCaption(e.target.value)} placeholder="Game Day" />
      </Field>
      <Field label="Icon">
        <Select value={icon} onValueChange={onChangeIcon}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/**
 * Generic admin repeater for JSON arrays stored as cfg strings.
 * Renders an expandable list with add/remove/reorder + inline field editing.
 * On any change it re-serializes the array as JSON and bubbles up.
 *
 * `value` is the raw JSON string from cfg. If empty/invalid, starts with [].
 */
type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  textarea?: boolean;
  iconPicker?: boolean;
};

function JsonArrayEditor({
  value,
  onChange,
  fields,
  newRow,
  rowLabel,
}: {
  value: string | undefined;
  onChange: (json: string) => void;
  fields: FieldDef[];
  newRow: Record<string, string>;
  rowLabel: (row: Record<string, string>) => string;
}) {
  const rows = React.useMemo<Record<string, string>[]>(() => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [value]);

  const [openIdx, setOpenIdx] = React.useState<number | null>(0);
  // Confirm dialog (replaces window.confirm) for removing a row.
  const [removeIdx, setRemoveIdx] = React.useState<number | null>(null);

  function commit(next: Record<string, string>[]) {
    onChange(JSON.stringify(next));
  }
  function update(i: number, key: string, v: string) {
    const next = rows.map((r, j) => (i === j ? { ...r, [key]: v } : r));
    commit(next);
  }
  function add() {
    const next = [...rows, { ...newRow }];
    commit(next);
    setOpenIdx(next.length - 1);
  }
  function remove(i: number) {
    setRemoveIdx(i);
  }
  function doRemove() {
    if (removeIdx === null) return;
    const next = rows.filter((_, j) => j !== removeIdx);
    commit(next);
    setOpenIdx(null);
    setRemoveIdx(null);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
    setOpenIdx(j);
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((row, i) => {
          const open = openIdx === i;
          return (
            <li key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="flex-1 text-left text-sm font-medium hover:text-phisig-red transition-colors truncate"
                >
                  <span className="text-muted-foreground mr-2 text-xs">#{i + 1}</span>
                  {rowLabel(row)}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="h-11 w-11 inline-flex items-center justify-center rounded hover:bg-secondary disabled:opacity-30"
                    aria-label="Move up"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    className="h-11 w-11 inline-flex items-center justify-center rounded hover:bg-secondary disabled:opacity-30"
                    aria-label="Move down"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="h-11 w-11 inline-flex items-center justify-center rounded hover:bg-red-50 text-red-600"
                    aria-label="Remove"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {open && (
                <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-border bg-secondary/30">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <Label className="mb-1 inline-block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {f.label}
                      </Label>
                      {f.iconPicker ? (
                        <Select
                          value={row[f.key] || ""}
                          onValueChange={(v) => update(i, f.key, v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Pick an icon" /></SelectTrigger>
                          <SelectContent>
                            {ICONS.map((ic) => (
                              <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : f.textarea ? (
                        <Textarea
                          value={row[f.key] || ""}
                          onChange={(e) => update(i, f.key, e.target.value)}
                          rows={3}
                          placeholder={f.placeholder}
                        />
                      ) : (
                        <Input
                          value={row[f.key] || ""}
                          onChange={(e) => update(i, f.key, e.target.value)}
                          placeholder={f.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Add row
      </Button>

      {/* ---------- Confirm Dialog (replaces window.confirm) ---------- */}
      <Dialog open={removeIdx !== null} onOpenChange={(o) => !o && setRemoveIdx(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this row?</DialogTitle>
            <DialogDescription>
              This row will be removed. Remember to Save to make the change permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveIdx(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={doRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Chapter logo uploader. Uploads to the admin-only /api/upload-photo endpoint
 * (Cloudinary → Blob → dev data-URI fallback) and stores the returned URL in
 * brand.logoUrl. A larger preview than the headshot input since the logo is the
 * chapter's primary brand mark. Empty → the site renders the auto-generated
 * brand-tinted shield instead.
 */
function BrandLogoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { push } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      onChange(json.url);
      push({ title: "Logo uploaded - click Save to apply", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-border bg-secondary/40 p-2 shrink-0">
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc(value, { w: 192, h: 192, crop: "limit" })}
            alt="Chapter logo preview"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-center text-muted-foreground leading-tight">
            No logo<br />(auto shield)
          </span>
        )}
      </div>
      <div className="flex-1 min-w-[200px] space-y-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Upload a file or paste an image URL"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Upload logo"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EboardHeadshotInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { push } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      onChange(json.url);
      push({ title: "Photo uploaded - click Save to apply", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img
          src={imageSrc(value, { w: 96, h: 96, crop: "fill", gravity: "auto" })}
          alt="Headshot preview"
          className="h-12 w-12 rounded-full object-cover ring-2 ring-phisig-red/20"
        />
      ) : (
        <div className="h-12 w-12 rounded-full bg-secondary border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">
 - 
        </div>
      )}
      <div className="flex-1 space-y-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Slug or URL" />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function PhotoPreview({ slug, className, objectPosition, handle }: { slug?: string; className?: string; objectPosition?: string; handle?: string }) {
  if (!slug) return <div className={`aspect-[4/3] rounded-xl bg-secondary border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground ${className ?? ""}`}>No slug yet</div>;
  // WHITE-LABEL: the corner badge shows THIS chapter's Instagram handle, and is
  // omitted entirely when the chapter hasn't set one — never a hardcoded
  // reference account leaking onto every tenant's photo preview.
  const cleanHandle = handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "";
  return (
    <Link
      href={`https://www.instagram.com/p/${slug}/`}
      target="_blank"
      rel="noreferrer noopener"
      className={`block relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-secondary ${className ?? ""}`}
    >
      <img
        src={`/api/photo/${slug}`}
        alt={`Preview ${slug}`}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: objectPosition || "50% 50%" }}
      />
      {cleanHandle && (
        <span className="absolute bottom-2 right-2 text-[10px] bg-white/90 backdrop-blur rounded px-2 py-0.5 inline-flex items-center gap-1 text-phisig-red font-semibold">
          {cleanHandle} <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}
