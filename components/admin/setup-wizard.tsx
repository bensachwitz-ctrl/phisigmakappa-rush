"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircle2, ChevronRight, ChevronLeft, Loader2, Sparkles,
  Building2, Palette, Mail, ShieldCheck, Rocket,
  ArrowRight, AlertCircle, UserPlus, Database, Trash2, Wand2,
  Upload, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { imageSrc } from "@/lib/image-url";

type Cfg = Record<string, string>;

const STEPS = [
  { id: "identity", label: "Chapter identity", icon: Building2,
    blurb: "Who and where — drives page titles, footer attribution, JSON-LD." },
  { id: "brand", label: "Brand colors", icon: Palette,
    blurb: "Your organization's primary color — overrides the default brand color across your site." },
  { id: "contact", label: "Contact", icon: Mail,
    blurb: "Rush inbox, advisor of record, chapter house address." },
  { id: "policy", label: "Anti-hazing", icon: ShieldCheck,
    blurb: "Your organization's anti-hazing / risk-management hotline — visible on Privacy, Parents, and the about page." },
  { id: "launch", label: "Launch", icon: Rocket,
    blurb: "Review and go live." },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function SetupWizard({ initial }: { initial: Cfg }) {
  const { push } = useToast();
  const [step, setStep] = React.useState<StepId>("identity");
  const [values, setValues] = React.useState<Cfg>({ ...initial });
  const [busy, setBusy] = React.useState(false);
  const [savedSteps, setSavedSteps] = React.useState<Set<StepId>>(new Set());

  function set(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isLastStep = stepIndex === STEPS.length - 1;

  async function saveAndContinue() {
    setBusy(true);
    try {
      // Save only this step's keys — keeps the wizard idempotent and
      // surfaces validation errors per step instead of all-or-nothing.
      const updates: Cfg = {};
      for (const k of STEP_KEYS[step]) {
        if (values[k] !== undefined) updates[k] = values[k];
      }
      if (Object.keys(updates).length > 0) {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        if (!res.ok) throw new Error();
      }
      setSavedSteps((s) => new Set(s).add(step));
      push({ title: "Saved", variant: "success" });
      if (!isLastStep) setStep(STEPS[stepIndex + 1].id);
    } catch {
      push({ title: "Save failed", description: "Try again — your inputs are still in the form.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function goPrev() {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1].id);
  }

  return (
    <div className="space-y-6">
      {/* Step rail */}
      <ol className="grid grid-cols-5 gap-2" role="list" aria-label="Setup progress">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = savedSteps.has(s.id);
          const current = s.id === step;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStep(s.id)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "w-full flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/40",
                  current && "border-phisig-red bg-phisig-red-soft",
                  done && !current && "border-emerald-300 bg-emerald-50/40",
                  !current && !done && "border-border bg-card hover:border-phisig-red/30"
                )}
              >
                <span className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full",
                  current && "bg-phisig-red text-white",
                  done && !current && "bg-emerald-500 text-white",
                  !current && !done && "bg-secondary text-muted-foreground"
                )}>
                  {done && !current ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                </span>
                <span className={cn(
                  "text-[11px] font-medium leading-tight",
                  current ? "text-phisig-red" : done ? "text-emerald-800" : "text-muted-foreground"
                )}>
                  Step {i + 1}
                </span>
                <span className="text-[10px] text-muted-foreground line-clamp-1 hidden sm:block">
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <Card>
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              {React.createElement(STEPS[stepIndex].icon, { className: "h-5 w-5 text-phisig-red", "aria-hidden": true })}
              {STEPS[stepIndex].label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{STEPS[stepIndex].blurb}</p>
          </div>

          {step === "identity" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <WField label="Organization name (full)" id="chapter.fraternityName" values={values} set={set} placeholder="Phi Sigma Kappa" />
              <WField label="Organization short" id="chapter.fraternityShort" values={values} set={set} placeholder="Phi Sig" />
              <WField label="Greek letters (chapter)" id="chapter.greekLetters" values={values} set={set} placeholder="Gamma Triton" />
              <WField label="Org letters (glyphs)" id="chapter.fraternityLetters" values={values} set={set} placeholder="ΦΣΚ" />
              <WField label="Chapter glyphs" id="chapter.greekLettersGlyphs" values={values} set={set} placeholder="ΓΤ" />
              <WField label="School / university" id="chapter.schoolName" values={values} set={set} placeholder="University of South Carolina" />
              <WField label="School short" id="chapter.schoolShort" values={values} set={set} placeholder="USC" />
              <WField label="School URL" id="chapter.schoolUrl" values={values} set={set} placeholder="https://sc.edu" />
              <WField label="National HQ URL" id="chapter.nationalHqUrl" values={values} set={set} placeholder="https://phisigmakappa.org" />
              <WField label="Charter year" id="chapter.charterYear" values={values} set={set} placeholder="1975" />
              <WField label="Founding year (national)" id="chapter.foundingYear" values={values} set={set} placeholder="1873" />
              <WSelect
                label="Organization type"
                id="chapter.orgType"
                values={values}
                set={set}
                fallback="fraternity"
                hint="Sets terminology: Brother / Sister / Member."
                options={[
                  { value: "fraternity", label: "Fraternity" },
                  { value: "sorority", label: "Sorority" },
                  { value: "professional", label: "Professional" },
                  { value: "other", label: "Co-ed / Other" },
                ]}
              />
              <WSelect
                label="Chapter timezone"
                id="chapter.timezone"
                values={values}
                set={set}
                fallback="America/New_York"
                hint="Used for SMS quiet-hours (TCPA)."
                options={[
                  { value: "America/New_York", label: "Eastern (America/New_York)" },
                  { value: "America/Chicago", label: "Central (America/Chicago)" },
                  { value: "America/Denver", label: "Mountain (America/Denver)" },
                  { value: "America/Phoenix", label: "Arizona (America/Phoenix)" },
                  { value: "America/Los_Angeles", label: "Pacific (America/Los_Angeles)" },
                  { value: "America/Anchorage", label: "Alaska (America/Anchorage)" },
                  { value: "Pacific/Honolulu", label: "Hawaii (Pacific/Honolulu)" },
                ]}
              />
              <WField label="Cardinal principles / motto" id="chapter.cardinalPrinciples" values={values} set={set} placeholder="Brotherhood, Scholarship, Character" full />
              <WField label="Tagline / hashtag" id="chapter.tagline" values={values} set={set} placeholder="#DamnProud" />
              <WField label="Recruitment term label" id="rush.termLabel" values={values} set={set} placeholder="Fall '26" />
              <WField label="iOS launcher caption (≤12 chars)" id="chapter.appShortTitle" values={values} set={set} placeholder="Phi Sig USC" maxLength={12} />
            </div>
          )}

          {step === "brand" && (
            <>
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <Label className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
                  <ImageIcon className="h-4 w-4 text-phisig-red" aria-hidden="true" /> Chapter logo (optional)
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload your crest or logo (square / transparent PNG works best). It appears in the
                  header, footer, and login screens. Skip this and we&apos;ll generate a clean shield in
                  your brand colors automatically.
                </p>
                <WLogo
                  value={values["brand.logoUrl"] || ""}
                  onChange={(v) => set("brand.logoUrl", v)}
                  push={push}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Pick your school's primary hex. The platform derives a darker shade for gradient
                stops and a soft tint for backgrounds — paste hex codes that match your school's
                official brand guide. Examples: USC garnet <code className="font-mono text-foreground">#73000A</code>,
                Texas A&amp;M maroon <code className="font-mono text-foreground">#500000</code>,
                Penn State blue <code className="font-mono text-foreground">#001E44</code>.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <WColor label="Primary" id="brand.primaryHex" values={values} set={set} fallback="#C8102E" />
                <WColor label="Primary dark" id="brand.primaryDarkHex" values={values} set={set} fallback="#A20D26" />
                <WColor label="Primary soft / tint" id="brand.primarySoftHex" values={values} set={set} fallback="#FCEFF1" />
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                Need help picking a soft-tint? Drop your primary into{" "}
                <a href="https://www.tailwindshades.com/" target="_blank" rel="noreferrer noopener" className="underline">Tailwind Shades</a>{" "}
                and use the ~50 swatch.
              </p>
            </>
          )}

          {step === "contact" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <WField label="Rush inbox email" id="contact.rushEmail" values={values} set={set} placeholder="rush@yourchapter.com" />
              <WField label="Rush phone (optional)" id="contact.rushPhone" values={values} set={set} placeholder="(803) 555-0142" />
              <WField label="Advisor name" id="contact.advisorName" values={values} set={set} placeholder="Dr. Smith" />
              <WField label="Advisor title" id="contact.advisorTitle" values={values} set={set} placeholder="Alumni Advisor · Gamma Triton" />
              <WField label="Advisor email" id="contact.advisorEmail" values={values} set={set} placeholder="advisor@yourchapter.com" />
              <WField label="Instagram handle" id="contact.instagramHandle" values={values} set={set} placeholder="@yourchapter" />
              <WField label="Instagram URL" id="contact.instagramUrl" values={values} set={set} placeholder="https://www.instagram.com/yourchapter/" full />
              <WField label="Chapter house address" id="contact.address" values={values} set={set} placeholder="1525 College Street" />
              <WField label="City, State Zip" id="contact.cityState" values={values} set={set} placeholder="Columbia, SC 29208" />
            </div>
          )}

          {step === "policy" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <WField label="Anti-hazing hotline (display)" id="antiHazing.hotline" values={values} set={set} placeholder="1-888-NOT-HAZE" />
              <WField label="Anti-hazing hotline URL" id="antiHazing.hotlineUrl" values={values} set={set} placeholder="https://hazingprevention.org/help/" />
              <div className="sm:col-span-2">
                <Label htmlFor="ah-body" className="mb-1.5 inline-block">Anti-hazing body paragraph</Label>
                <textarea
                  id="ah-body"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={values["antiHazing.body"] || ""}
                  onChange={(e) => set("antiHazing.body", e.target.value)}
                  placeholder="Phi Sigma Kappa national and the Gamma Triton chapter strictly prohibit hazing in any form…"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Two sentences. Rendered on /privacy, /parents, and the homepage Zero-tolerance card.
                </p>
              </div>
            </div>
          )}

          {step === "launch" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> You're ready to go live.
                </p>
                <p className="mt-1.5 text-sm text-emerald-800 leading-relaxed">
                  Your chapter identity, brand colors, contact info, and anti-hazing policy are saved.
                  The public site re-brands on the next page load. Hand the URL to your e-board and the first PNM.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link href="/" target="_blank" className="rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40 transition-colors">
                  <p className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-phisig-red" aria-hidden="true" /> View your public homepage
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Opens in a new tab — confirm everything reads correctly.</p>
                </Link>
                <Link href="/admin/settings" className="rounded-xl border border-border bg-card p-4 hover:border-phisig-red/40 transition-colors">
                  <p className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-phisig-red" aria-hidden="true" /> Advanced settings
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Hero photos, stats, FAQ, timeline, executive board, all editable.</p>
                </Link>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next steps</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li>• Invite e-board members via <Link href="/admin/brothers" className="text-phisig-red hover:underline">Brothers → Invite</Link>.</li>
                  <li>• Add the first rush event in <Link href="/admin/events" className="text-phisig-red hover:underline">Events</Link>.</li>
                  <li>• Swap the 3 hero photos in <Link href="/admin/settings" className="text-phisig-red hover:underline">Site content → Hero</Link>.</li>
                  <li>• Read the full handbook at <Link href="/admin/help" className="text-phisig-red hover:underline">Help</Link>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={goPrev}
              disabled={stepIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
            {!isLastStep ? (
              <Button onClick={saveAndContinue} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Save &amp; continue <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button onClick={saveAndContinue} disabled={busy} variant="default">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
                Mark setup complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Which cfg keys each step is responsible for ────────────────────────────
const STEP_KEYS: Record<StepId, string[]> = {
  identity: [
    "chapter.fraternityName", "chapter.fraternityShort",
    "chapter.greekLetters", "chapter.greekLettersGlyphs", "chapter.fraternityLetters",
    "chapter.schoolName", "chapter.schoolShort", "chapter.schoolUrl",
    "chapter.nationalHqUrl",
    "chapter.charterYear", "chapter.foundingYear",
    "chapter.orgType", "chapter.timezone",
    "chapter.cardinalPrinciples", "chapter.tagline",
    "chapter.appShortTitle", "rush.termLabel",
  ],
  brand: ["brand.logoUrl", "brand.primaryHex", "brand.primaryDarkHex", "brand.primarySoftHex"],
  contact: [
    "contact.rushEmail", "contact.rushPhone",
    "contact.advisorName", "contact.advisorTitle", "contact.advisorEmail",
    "contact.instagramHandle", "contact.instagramUrl",
    "contact.address", "contact.cityState",
  ],
  policy: ["antiHazing.hotline", "antiHazing.hotlineUrl", "antiHazing.body"],
  launch: [],
};

// ── Tiny helpers ──────────────────────────────────────────────────────────

function WField({
  label, id, values, set, placeholder, full = false, maxLength,
}: {
  label: string;
  id: string;
  values: Cfg;
  set: (k: string, v: string) => void;
  placeholder?: string;
  full?: boolean;
  maxLength?: number;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label htmlFor={id} className="mb-1.5 inline-block">{label}</Label>
      <Input
        id={id}
        value={values[id] || ""}
        onChange={(e) => set(id, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}

function WColor({
  label, id, values, set, fallback,
}: {
  label: string;
  id: string;
  values: Cfg;
  set: (k: string, v: string) => void;
  fallback: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-block">{label} <span className="text-muted-foreground font-normal">(default {fallback})</span></Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={values[id] || fallback}
          onChange={(e) => set(id, e.target.value)}
          className="h-9 w-12 rounded-md border border-input cursor-pointer"
        />
        <Input
          id={id}
          value={values[id] || ""}
          onChange={(e) => set(id, e.target.value)}
          placeholder={fallback}
          className="font-mono"
        />
      </div>
    </div>
  );
}

/**
 * Logo uploader for the setup wizard's Brand step. Uploads to the admin-only
 * /api/upload-photo endpoint and stores the returned URL in brand.logoUrl, so
 * a chapter can add their crest during the few-clicks setup flow (not just in
 * advanced settings). Empty → the site auto-generates a brand-tinted shield.
 */
function WLogo({
  value, onChange, push,
}: {
  value: string;
  onChange: (v: string) => void;
  push: (t: { title: string; description?: string; variant?: "success" | "destructive" | "default" }) => void;
}) {
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
      push({ title: "Logo uploaded", variant: "success" });
    } catch (err: any) {
      push({ title: err?.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-card p-2 shrink-0">
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc(value, { w: 160, h: 160, crop: "limit" })}
            alt="Logo preview"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-[9px] text-center text-muted-foreground leading-tight">
            No logo<br />(auto shield)
          </span>
        )}
      </div>
      <div className="flex-1 min-w-[180px] space-y-2">
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
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
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

function WSelect({
  label, id, values, set, fallback, options, hint,
}: {
  label: string;
  id: string;
  values: Cfg;
  set: (k: string, v: string) => void;
  fallback: string;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-block">{label}</Label>
      <select
        id={id}
        value={values[id] || fallback}
        onChange={(e) => set(id, e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  FirstRunCard — the SINGLE guided first-run surface on the dashboard.
//
//  This replaces the two competing "set up your chapter" prompts a brand-new
//  admin used to see at once (the old "Get rush ready" checklist AND the
//  separate "Finish chapter setup — X/12 fields" banner). It presents ONE
//  progress meter, ONE clear path, and three accelerators:
//    1. Deep-linked checklist steps (each jumps to the exact screen).
//    2. One-click sample-data load/clear (so the app isn't an empty shell).
//    3. A prominent "Invite your e-board" CTA → /admin/brothers.
//
//  Completion-detection lives in the server component (app/admin/page.tsx);
//  this component is presentation + the client-side actions only.
// ════════════════════════════════════════════════════════════════════════════

export type FirstRunStep = {
  /** Short label, e.g. "Add your first rush event". */
  label: string;
  /** True when this step is already satisfied. */
  ok: boolean;
  /** One-line nudge shown under the label when incomplete. */
  hint: string;
  /** Deep link to the exact screen that resolves this step. */
  href: string;
};

export function FirstRunCard({
  steps,
  /** When true the full identity/brand wizard still has fields to fill —
   *  drives the "Resume full setup" deep-link to /admin/setup. */
  brandSetupComplete,
}: {
  steps: FirstRunStep[];
  brandSetupComplete: boolean;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [sampleBusy, setSampleBusy] = React.useState<null | "seed" | "clear">(null);

  const total = steps.length;
  const done = steps.filter((s) => s.ok).length;
  const remaining = total - done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = remaining === 0 && brandSetupComplete;

  async function runSample(action: "seed" | "clear") {
    if (sampleBusy) return;
    setSampleBusy(action);
    try {
      const res = await fetch("/api/admin/sample-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        // Surface a server-provided message when there is one, else a default.
        let msg = "Please try again in a moment.";
        try {
          const j = await res.json();
          if (j?.error && typeof j.error === "string") msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      push({
        title: action === "seed" ? "Sample data loaded" : "Sample data cleared",
        description:
          action === "seed"
            ? "Your dashboard is now populated so you can explore every feature."
            : "Demo records removed. Your real chapter data is untouched.",
        variant: "success",
      });
      // Re-pull the server component so the new counts + checklist reflect
      // immediately without a hard navigation.
      router.refresh();
    } catch (err) {
      push({
        title: action === "seed" ? "Couldn't load sample data" : "Couldn't clear sample data",
        description: err instanceof Error ? err.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSampleBusy(null);
    }
  }

  return (
    <section
      aria-label="Get your chapter live"
      className="relative overflow-hidden rounded-2xl border border-phisig-red/15 bg-gradient-to-br from-phisig-red-soft/45 via-white to-white p-5 shadow-[0_12px_34px_-18px_hsl(var(--primary)/0.22)]"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-phisig-red/10 blur-3xl" />

      {/* ── Header + single unified progress meter ───────────────────────── */}
      <div className="relative flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shrink-0 shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.6)]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tracking-tight">
            {allDone
              ? "Your chapter is live-ready"
              : `Get your chapter live — ${remaining} step${remaining === 1 ? "" : "s"} to go`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allDone
              ? "Everything's set. Hand the public URL to your e-board and your first prospect."
              : "Finish these so the public site reads as a polished, finished product."}
          </p>
          {/* Single progress bar — done vs total across the whole flow. */}
          <div className="mt-3 flex items-center gap-2.5">
            <div
              className="h-1.5 flex-1 rounded-full bg-phisig-red/10 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label="Chapter setup progress"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-phisig-red to-phisig-red-dark transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-phisig-red tabular-nums shrink-0">
              {done}/{total} done
            </span>
          </div>
        </div>
      </div>

      {/* ── Accelerators: sample data + invite e-board ───────────────────── */}
      <div className="relative mt-4 grid gap-2.5 sm:grid-cols-2">
        {/* Invite your e-board — prominent 1-click CTA to the real members
            screen (invite links + Add-Members wizard live there). */}
        <Link
          href="/admin/brothers"
          className="group flex items-center gap-3 rounded-xl border border-phisig-red/20 bg-white/70 p-3 transition-colors hover:border-phisig-red/40 hover:bg-phisig-red-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/30"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shrink-0 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.55)]">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">Invite your e-board</p>
            <p className="truncate text-xs text-muted-foreground">
              Send invite links so officers set their own login
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-phisig-red" aria-hidden="true" />
        </Link>

        {/* Load sample data — instant populated value for a new admin. */}
        <div className="flex items-center gap-3 rounded-xl border border-phisig-red/15 bg-white/70 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-phisig-red-soft text-phisig-red shrink-0 ring-1 ring-phisig-red/15">
            <Database className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">Load sample data</p>
            <p className="text-xs text-muted-foreground">
              Populate the dashboard with demo records to explore
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => runSample("seed")}
            disabled={sampleBusy !== null}
            className="shrink-0"
          >
            {sampleBusy === "seed" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Load
          </Button>
        </div>
      </div>

      {/* ── Deep-linked checklist ────────────────────────────────────────── */}
      <ul className="relative mt-4 space-y-2">
        {steps.map((c) => (
          <li
            key={c.label}
            className={cn(
              "group flex items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
              c.ok
                ? "border-emerald-200/70 bg-emerald-50/40"
                : "border-amber-200/70 bg-amber-50/40 hover:bg-amber-50/70",
            )}
          >
            {c.ok ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-px ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 shrink-0 mt-px ring-1 ring-amber-200">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium", c.ok ? "text-emerald-900" : "text-amber-900")}>
                {c.label}
              </p>
              {!c.ok && <p className="text-xs text-amber-800/80 mt-0.5">{c.hint}</p>}
            </div>
            {!c.ok && (
              <Link
                href={c.href}
                className="inline-flex items-center gap-1 text-xs font-semibold text-phisig-red hover:underline shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/30"
              >
                Fix <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ul>

      {/* ── Footer: resume the full wizard + subtle clear-sample link ────── */}
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-phisig-red/10 pt-3">
        <Link
          href="/admin/setup"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-phisig-red hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/30 rounded"
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
          {brandSetupComplete ? "Review chapter setup wizard" : "Resume full setup wizard"}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => runSample("clear")}
          disabled={sampleBusy !== null}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/20 rounded"
        >
          {sampleBusy === "clear" ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          )}
          Clear sample data
        </button>
      </div>
    </section>
  );
}
