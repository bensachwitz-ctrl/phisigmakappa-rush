"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { EditableLivePreview } from "@/components/onboard/editable-live-preview";
import { SuccessState } from "@/components/onboard/success-state";
import { OrgPresetPicker } from "@/components/onboard/org-preset-picker";
import { GreekLetterInserter } from "@/components/onboard/greek-letter-inserter";
import { ColorPresets } from "@/components/onboard/color-presets";
import { BookACall } from "@/components/onboard/book-a-call";
import {
  SchoolPicker,
  OrgPicker,
  type SchoolSelection,
  type OrgSelection,
} from "@/components/site/school-org-picker";
import { Magnetic, Reveal3D, FloatingOrbs, Spotlight, ShimmerBorder } from "@/components/site/anim";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
import { shade, type GreekOrg } from "@/lib/greek-orgs";
import {
  IconBranding, IconAdmin, IconLaunch, IconSpark,
  IconCheck, IconCheckCircle, IconArrowRight, IconSecurity, IconClose, IconExternal, type IconProps,
} from "@/components/brand/icons";
import {
  IconCrest, IconPricing, IconCoins, IconPercent, IconCalendar, IconSettingsGear,
} from "@/components/brand/icons/onboarding-wizard";
import { cn } from "@/lib/utils";

// Local platform "chip" — a soft blue→sky gradient rounded square holding a
// custom Greekstack icon. Mirrors the shared icon-chip look (which is typed to
// lucide), but renders our bespoke duotone SVGs and recolors to the de-purpled
// platform palette (royal blue + sky, gold-tinted accent layer).
function GsChip({
  icon: Icon,
  tone = "platform",
  size = "md",
  className,
}: {
  icon: React.ComponentType<IconProps>;
  tone?: "platform" | "muted";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-11 w-11 rounded-xl",
    lg: "h-14 w-14 rounded-2xl",
  }[size];
  const ic = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  const toneCls = {
    platform:
      "bg-gradient-to-br from-blue-500/15 to-sky-400/10 text-blue-500 ring-1 ring-blue-500/20",
    muted: "bg-secondary text-muted-foreground ring-1 ring-border",
  }[tone];
  return (
    <span className={cn("inline-flex items-center justify-center shadow-sm", box, toneCls, className)}>
      <Icon className={ic} aria-hidden="true" />
    </span>
  );
}

// ── The streamlined 4-stage flow ─────────────────────────────────────────────
// Re-ordered + slimmed from the old 6-step wall of fields. The order is
// deliberate: pick how you pay FIRST (no card, lowest-commitment yes), fill the
// essentials, set the login, then launch + (optionally) book a call. Each stage
// is intentionally light — fewer, larger, well-spaced inputs; the long identity
// field-wall is collapsed behind a "fine-tune details" expander on the Chapter
// stage so the default surface stays calm.
const STEPS = [
  { id: "pricing", label: "Pricing", icon: IconPricing, blurb: "Choose how you'd like to pay — no card required to launch." },
  { id: "chapter", label: "Your Chapter", icon: IconCrest, blurb: "Pick your school & organization to auto-theme everything, then make it yours in the live preview." },
  { id: "admin", label: "Admin Login", icon: IconAdmin, blurb: "Create your chapter's administrator account — this is how you'll sign in." },
  { id: "launch", label: "Launch", icon: IconLaunch, blurb: "Go live in seconds — then optionally grab a hand from the owner." },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export default function OnboardWizard() {
  const router = useRouter();
  const { push } = useToast();
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState<StepId>("pricing");
  // Animation direction for the step transition: 1 = advancing, -1 = going back.
  // Drives the directional slide in the AnimatePresence wrapper below.
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [busy, setBusy] = React.useState(false);
  const [launched, setLaunched] = React.useState(false);
  const [liveUrl, setLiveUrl] = React.useState("");
  // Heading of the active step — focused on each transition so keyboard/screen-
  // reader users land on the new step's title instead of being stranded.
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const firstRender = React.useRef(true);
  // Inline, per-field validation hints layered on top of the toast errors so
  // the user sees exactly which input needs attention without losing the toast.
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Identity State — start EMPTY so a new chapter never publishes Phi Sig's
  // real identity by skimming the form. Placeholders show the reference values
  // as hints; required fields are enforced in validateStep("chapter").
  const [fraternityName, setFraternityName] = React.useState("");
  const [fraternityShort, setFraternityShort] = React.useState("");
  // Organization type drives the member-noun terminology layer once the chapter
  // launches (Brother/Sister/Member). Defaults to "fraternity" so the wizard +
  // launched site read identically to the original frat copy until a sorority
  // (or pro/co-ed org) is picked. Set from the preset picker; editable below.
  const [orgType, setOrgType] = React.useState<"fraternity" | "sorority" | "professional" | "other">("fraternity");
  const [greekLetters, setGreekLetters] = React.useState("");
  const [greekLettersGlyphs, setGreekLettersGlyphs] = React.useState("");
  const [schoolName, setSchoolName] = React.useState("");
  const [schoolShort, setSchoolShort] = React.useState("");
  const [charterYear, setCharterYear] = React.useState("");
  const [foundingYear, setFoundingYear] = React.useState("");
  const [fraternityLetters, setFraternityLetters] = React.useState("");
  const [subdomain, setSubdomain] = React.useState("");
  // Live, debounced subdomain availability — so the user learns a name is taken
  // while typing on Step 1, never as a destructive failure at the final Launch.
  // `idle` (nothing typed yet) · `checking` (request in flight) · `available` ·
  // `taken`/`reserved`/`invalid` (blocking). The final-submit check in
  // /api/onboard stays the source of truth; this is a belt-and-suspenders hint.
  type SubStatus = "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";
  const [subStatus, setSubStatus] = React.useState<SubStatus>("idle");

  // School + Org picker selections (the NEW typeahead source of truth for the
  // auto-theme). These mirror into the flat identity/brand fields below on every
  // pick so the rest of the wizard + the POST body stay unchanged; keeping the
  // selection objects lets each picker re-show its chosen label + swatches.
  const [schoolSel, setSchoolSel] = React.useState<SchoolSelection | null>(null);
  const [orgSel, setOrgSel] = React.useState<OrgSelection | null>(null);

  // Brand State
  const [primaryColor, setPrimaryColor] = React.useState("#C8102E");
  const [darkColor, setDarkColor] = React.useState("#A20D26");
  const [softColor, setSoftColor] = React.useState("#FCEFF1");

  // Hero copy — editable directly on the live preview. Empty = the launched
  // site keeps its neutral white-label default (lib/site-config.ts); a non-empty
  // value is persisted to hero.h1.lead / hero.subline by /api/onboard.
  const [heroHeadline, setHeroHeadline] = React.useState("");
  const [heroTagline, setHeroTagline] = React.useState("");

  // Pricing method (Stage 1 "pricing"). `plan` is the value persisted to the Tenant:
  //   "monthly"         — Base plan, $50/mo, FIRST MONTH FREE
  //   "semester"        — Base plan, $250 / semester
  //   "dues_percentage" — Dues-share, $0 upfront, 1.5% → 3% of dues collected
  //   "custom"          — Custom build (a "talk to us" path → /contact#custom)
  // Defaults to "monthly" — the headline first-month-free offer — so a founder who
  // skips straight through still lands on the most generous, no-card option. The
  // Custom card is primarily a link out to /contact#custom; "custom" is part of
  // the persisted allowlist so the value round-trips cleanly if ever selected.
  const [plan, setPlan] = React.useState<"monthly" | "semester" | "dues_percentage" | "custom">("monthly");

  // Contact State
  const [rushEmail, setRushEmail] = React.useState("");
  const [rushPhone, setRushPhone] = React.useState("");
  const [instagramHandle, setInstagramHandle] = React.useState("");
  const [instagramUrl, setInstagramUrl] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [cityState, setCityState] = React.useState("");

  // Admin State
  const [adminName, setAdminName] = React.useState("");
  const [adminEmail, setAdminEmail] = React.useState("");
  const [adminPassword, setAdminPassword] = React.useState("");

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isLastStep = stepIndex === STEPS.length - 1;

  // ── Preset library wiring ─────────────────────────────────────────────────
  // Picking an org auto-fills the identity + brand fields from the preset, then
  // leaves everything fully editable (custom typing always wins afterward).
  function clearErrors(...keys: string[]) {
    setErrors((prev) => {
      if (!keys.some((k) => k in prev)) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }

  function applyOrgPreset(org: GreekOrg) {
    setFraternityName(org.name);
    setFraternityShort(org.short);
    setFraternityLetters(org.glyph);
    setPrimaryColor(org.primary);
    setDarkColor(org.dark);
    setSoftColor(org.soft);
    // Capture org type for the terminology layer. The preset library tags NPHC
    // ("Divine Nine") orgs generically — that bucket spans both fraternities and
    // sororities — so map it to the neutral "other" term set rather than guess a
    // gender. Fraternity/sorority map straight through.
    setOrgType(org.type === "sorority" ? "sorority" : org.type === "nphc" ? "other" : "fraternity");
    // Clear any identity/brand errors the preset just satisfied.
    clearErrors("fraternityName", "primaryColor", "darkColor", "softColor");
  }

  // ── School picker → identity + (school-themed) brand ──────────────────────
  // Picking a school fills schoolName/schoolShort and seeds the brand palette
  // from the school's own colors (primary + a derived dark + soft) so the preview
  // themes to e.g. USC cardinal instantly. The org pick (below) intentionally
  // wins on color when it runs afterward — an org's own letters/colors are the
  // truer chapter identity — but either is fully overridable downstream.
  function applySchool(sel: SchoolSelection | null) {
    setSchoolSel(sel);
    if (!sel) {
      // Cleared — leave the typed values alone (don't yank a name the user kept).
      return;
    }
    setSchoolName(sel.name);
    setSchoolShort(sel.custom ? "" : sel.short);
    const [p, s] = sel.colors;
    // Prefer the school's secondary as the "dark" gradient when it's a real
    // distinct color; fall back to a derived shade (white/near-white secondaries
    // make poor gradient floors, so derive in that case).
    const secondaryIsUsable = !/^#f{3,6}$/i.test(s.replace(/[^0-9a-f]/gi, "")) && s.toLowerCase() !== p.toLowerCase();
    setPrimaryColor(p);
    setDarkColor(secondaryIsUsable ? s : shade(p, "dark"));
    setSoftColor(shade(p, "soft"));
    clearErrors("schoolName", "primaryColor", "darkColor", "softColor");
  }

  // ── Org picker → identity + brand (the richer NEW catalog) ────────────────
  // Picking an org fills the full org name, glyph letters, council type, and the
  // brand palette from the org's heraldic colors. This is the primary auto-theme
  // path; it runs the same effect as the preset picker but sourced from the
  // broader ~90-org typeahead catalog.
  function applyOrg(sel: OrgSelection | null) {
    setOrgSel(sel);
    if (!sel) return;
    setFraternityName(sel.name);
    setFraternityShort(sel.custom ? "" : sel.short);
    // The catalog's `letters` are the glyphs (e.g. "ΦΣΚ") — fill both the
    // glyph/abbreviation field and the glyph helper so the crest + preview render.
    if (sel.letters) {
      setFraternityLetters(sel.letters);
      setGreekLettersGlyphs(sel.letters);
    }
    setOrgType(sel.type === "sorority" ? "sorority" : "fraternity");
    const [p] = sel.colors;
    setPrimaryColor(p);
    // Derive dark + soft from the primary for a cohesive gradient floor + tint
    // (org heraldic secondaries are often white/metallic, which read poorly as a
    // gradient base). All three remain fully overridable on the preview.
    setDarkColor(shade(p, "dark"));
    setSoftColor(shade(p, "soft"));
    clearErrors("fraternityName", "primaryColor", "darkColor", "softColor");
  }

  // "Custom / not listed" — clear the org-derived identity fields so the chapter
  // can type its own (brand colors are left intact as a sensible starting point).
  function applyCustomOrg() {
    setFraternityName("");
    setFraternityShort("");
    setFraternityLetters("");
  }

  // Append a Greek glyph to a target field via its setter (click-to-build).
  function appendGlyph(setter: (v: string) => void, current: string, glyph: string) {
    setter(current + glyph);
  }

  // Pick a preset color → set primary and auto-suggest matching dark + soft.
  function applyColorPreset(hex: string) {
    setPrimaryColor(hex);
    setDarkColor(shade(hex, "dark"));
    setSoftColor(shade(hex, "soft"));
    clearErrors("primaryColor", "darkColor", "softColor");
  }

  function validateStep(currentStep: StepId): boolean {
    const e: Record<string, string> = {};
    // Stage 1 "pricing" — always valid (a default plan is always selected).
    if (currentStep === "chapter") {
      // The four essentials for a valid, on-brand launch. Brand colors are
      // auto-themed from the pickers (and always carry a sensible default), so
      // they no longer gate the step — the chapter identity + subdomain do.
      if (!fraternityName.trim()) e.fraternityName = "Required";
      if (!greekLetters.trim()) e.greekLetters = "Required";
      if (!schoolName.trim()) e.schoolName = "Required";
      if (!subdomain.trim()) e.subdomain = "Required";
      if (Object.keys(e).length) {
        setErrors(e);
        push({ title: "A few details needed", description: "Organization name, chapter Greek letters, school, and a subdomain are required.", variant: "destructive" });
        return false;
      }
    } else if (currentStep === "admin") {
      if (!adminName.trim()) e.adminName = "Required";
      if (!adminEmail.trim()) e.adminEmail = "Required";
      if (!adminPassword.trim()) e.adminPassword = "Required";
      if (Object.keys(e).length) {
        setErrors(e);
        push({ title: "A few details needed", description: "Admin name, email, and password are required.", variant: "destructive" });
        return false;
      }
      if (adminPassword.length < 8) {
        setErrors({ adminPassword: "Must be at least 8 characters" });
        push({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
        return false;
      }
    }
    setErrors({});
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    // On the chapter step, refuse to advance past a known-bad subdomain so the
    // user fixes it here instead of at the final Launch. (Mirrors the disabled
    // Continue button; this guards the keyboard/Enter path too.)
    if (step === "chapter" && subdomainBlocks) {
      setErrors((prev) => ({
        ...prev,
        subdomain:
          subStatus === "taken"
            ? "That subdomain is already taken — try another."
            : subStatus === "reserved"
            ? "That subdomain is reserved — try another."
            : "That subdomain is invalid — try another.",
      }));
      push({
        title: "Subdomain unavailable",
        description: "Please choose a different subdomain before continuing.",
        variant: "destructive",
      });
      return;
    }
    if (stepIndex < STEPS.length - 1) {
      setDir(1);
      setStep(STEPS[stepIndex + 1].id);
    }
  }

  function goPrev() {
    if (stepIndex > 0) {
      setErrors({});
      setDir(-1);
      setStep(STEPS[stepIndex - 1].id);
    }
  }

  // Move focus to the new step's heading after each transition (skip the very
  // first mount so we don't yank focus on page load). `preventScroll` keeps the
  // sticky layout from jumping.
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // ── Live subdomain availability (debounced ~400ms) ────────────────────────
  // Mirror the server's sanitizer (trim → lower → strip non-[a-z0-9-]) so the
  // value we check is exactly the key the registry is keyed on. We short-circuit
  // the obvious local rejects (empty / <3 / malformed / "--") to "invalid"
  // without a network round-trip; everything else hits /api/onboard/check, which
  // applies the SAME reserved denylist + format guard and the registry lookup.
  // Each run cancels the previous (AbortController + a `cancelled` flag) so a
  // slow earlier response can never overwrite the status for a newer value.
  const normalizedSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  React.useEffect(() => {
    const value = normalizedSubdomain;
    if (!value) {
      setSubStatus("idle");
      return;
    }
    if (value.length < 3 || value.includes("--") || !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(value)) {
      setSubStatus("invalid");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setSubStatus("checking");
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/onboard/check?subdomain=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as
          | { available: boolean; reason?: "taken" | "reserved" | "invalid" }
          | null;
        if (cancelled) return;
        if (!data) {
          // Couldn't read a verdict — don't block the user on a transient error;
          // the final submit remains the source of truth.
          setSubStatus("idle");
          return;
        }
        if (data.available) setSubStatus("available");
        else setSubStatus(data.reason ?? "taken");
      } catch {
        if (!cancelled) setSubStatus("idle"); // aborted or network error → no block
      }
    }, 400);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedSubdomain]);

  // Block forward navigation while a subdomain is known-bad. `idle`/`checking`
  // never block (don't trap the user mid-type or mid-request); only a resolved
  // taken/reserved/invalid does. The final POST re-validates regardless.
  const subdomainBlocks =
    subStatus === "taken" || subStatus === "reserved" || subStatus === "invalid";

  async function handleLaunch() {
    setBusy(true);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain,
          orgType,
          fraternityName,
          fraternityShort,
          greekLetters,
          greekLettersGlyphs,
          schoolName,
          schoolShort,
          charterYear,
          foundingYear,
          fraternityLetters,
          primaryColor,
          darkColor,
          softColor,
          rushEmail,
          rushPhone,
          instagramHandle,
          instagramUrl,
          address,
          cityState,
          adminName,
          adminEmail,
          adminPassword,
          // Pricing method chosen on the pricing step → persisted to the Tenant.
          plan,
          // Hero copy the founder edited live on the preview (empty = keep the
          // neutral white-label defaults). Trimmed server-side too.
          heroHeadline,
          heroTagline,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Onboarding failed");
      }

      push({ title: "Setup Complete", description: "Your site has been successfully initialized!", variant: "success" });
      if (data.url) {
        // Show the celebratory "your site is live" beat, then hand off to the
        // freshly provisioned subdomain (preserves the original redirect).
        setLiveUrl(data.url);
        setLaunched(true);
        setTimeout(() => {
          window.location.href = data.url;
        }, 2200);
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch (err: any) {
      push({ title: "Launch Failed", description: err.message || "Something went wrong.", variant: "destructive" });
      setBusy(false);
    }
  }

  // ── Celebratory success takeover ──────────────────────────────────────────
  if (launched) {
    return (
      <motion.div
        className="relative mx-auto max-w-xl"
        initial={reduce ? false : { opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 220, damping: 22 }}
      >
        {/* Confetti-lite burst — a ring of brand-gradient shards that fly out
            once, behind the success card. Purely decorative + reduced-motion-safe. */}
        {!reduce && <ConfettiBurst />}
        <GlassPanel>
          <SuccessState fraternityName={fraternityName} greekLetters={greekLetters} url={liveUrl} />
        </GlassPanel>
      </motion.div>
    );
  }

  const StepIcon = STEPS[stepIndex].icon;

  return (
    <div className="relative space-y-8">
      {/* Brand-neutral ambient depth behind the whole wizard (decorative). */}
      <FloatingOrbs className="-z-10 opacity-40" blur={100} />

      {/* Header */}
      <Reveal3D className="text-center" y={18}>
        {/* Platform wordmark lockup — the de-purpled keystone mark + "Greekstack"
            so the whole flow reads as the platform brand, not a chapter brand. */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 shadow-lg shadow-blue-950/30 backdrop-blur-md">
            <GreekstackWordmark size="sm" textClassName="text-base text-white" />
            <span className="ml-1 hidden h-3.5 w-px bg-white/15 sm:inline-block" aria-hidden="true" />
            <span className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300 sm:inline-flex">
              <IconSpark className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" /> Setup
            </span>
          </span>
        </div>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Your chapter site, <span className="gs-gradient-text">live in seconds</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Answer a few quick questions and watch your fully branded website take shape in
          real time. Hit launch and it goes live instantly — no code, no waiting.
        </p>

        {/* Trust strip — three quiet reassurances under the hero. AA-contrast,
            decorative icons aria-hidden, wraps cleanly on mobile. */}
        <ul className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-300">
          {[
            { icon: IconSecurity, text: "No card required" },
            { icon: IconLaunch, text: "Live in under a minute" },
            { icon: IconCheckCircle, text: "Edit anything later" },
          ].map((t) => {
            const Ico = t.icon;
            return (
              <li key={t.text} className="inline-flex items-center gap-1.5">
                <Ico className="h-3.5 w-3.5 text-emerald-400/90" aria-hidden="true" />
                {t.text}
              </li>
            );
          })}
        </ul>
      </Reveal3D>

      {/* ── Progress rail ──────────────────────────────────────────────────────
          A glass-framed stepper: a labeled readout, an animated gradient fill
          track, and a row of step chips sitting over a connecting "spine" so the
          path between steps reads as one continuous journey. The active chip
          retints its icon accent to gold (--gs-accent) and breathes; completed
          steps flip to an emerald check. */}
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] p-3 shadow-xl shadow-blue-950/20 ring-1 ring-white/5 backdrop-blur-md sm:p-4">
        {/* Readout + percentage */}
        <div className="mb-2.5 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            Step {stepIndex + 1}
            <span className="text-slate-500"> / {STEPS.length}</span>
            <span className="ml-2 font-medium normal-case tracking-normal text-slate-300">
              {STEPS[stepIndex].label}
            </span>
          </p>
          <p className="text-[11px] font-semibold tabular-nums text-slate-400">
            {Math.round((stepIndex / (STEPS.length - 1)) * 100)}%
          </p>
        </div>

        {/* Animated fill track — eases to the % complete as steps advance. A soft
            sheen rides the leading edge for a touch of life. */}
        <div
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={STEPS.length - 1}
          aria-valuenow={stepIndex}
        >
          <motion.div
            className="relative h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-amber-400"
            initial={false}
            animate={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26 }}
          >
            <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_10px_2px_rgba(251,191,36,0.6)]" aria-hidden="true" />
          </motion.div>
        </div>

        {/* Step chips, over a connecting spine. */}
        <div className="relative mt-3">
          {/* Spine: a faint base line + an emerald progress line tracing completed
              steps. Inset to the first/last chip CENTERS so it spans between them,
              behind the chips. With 4 equal columns the centers sit at 12.5% and
              87.5%, so we inset by 12.5% (1/8). */}
          <div className="pointer-events-none absolute inset-x-[12.5%] top-[22px] -z-0 h-0.5 rounded-full bg-white/[0.07]" aria-hidden="true" />
          <motion.div
            className="pointer-events-none absolute left-[12.5%] top-[22px] -z-0 h-0.5 origin-left rounded-full bg-gradient-to-r from-emerald-400/70 to-sky-400/60"
            style={{ right: "12.5%" }}
            initial={false}
            animate={{ scaleX: STEPS.length > 1 ? stepIndex / (STEPS.length - 1) : 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26 }}
            aria-hidden="true"
          />

          <ol className="relative z-[1] grid grid-cols-4 gap-2 sm:gap-3" role="list" aria-label="Setup steps">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const current = s.id === step;
            const done = stepIndex > i;
            const reachable = i <= stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (i < stepIndex) {
                      setErrors({});
                      setDir(-1);
                      setStep(s.id);
                    }
                  }}
                  disabled={i > stepIndex || busy}
                  aria-current={current ? "step" : undefined}
                  title={s.label}
                  className={cn(
                    "group flex w-full flex-col items-center gap-2 rounded-2xl border p-2.5 text-center transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 sm:p-3",
                    current && "border-amber-400/50 bg-white/[0.07] shadow-lg shadow-blue-950/40",
                    done && "border-emerald-400/30 bg-emerald-500/[0.08]",
                    !current && !done && "border-white/10 bg-white/[0.02]",
                    !reachable && "cursor-not-allowed opacity-50",
                    reachable && !current && "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
                  )}
                >
                  {done ? (
                    <motion.span
                      initial={reduce ? false : { scale: 0.5, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 18 }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md ring-1 ring-emerald-300/30"
                    >
                      <IconCheckCircle className="h-5 w-5" />
                    </motion.span>
                  ) : current ? (
                    // Current step "breathes" subtly so the eye knows where it is.
                    // Active step carries a gold-tinted accent layer + a soft halo.
                    <span className="relative will-change-transform [--gs-accent:#fbbf24]">
                      {!reduce && (
                        <motion.span
                          className="absolute inset-0 rounded-xl bg-amber-400/20 blur-md"
                          animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.12, 1] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                          aria-hidden="true"
                        />
                      )}
                      <motion.span
                        className="relative block"
                        animate={reduce ? undefined : { scale: [1, 1.07, 1] }}
                        transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <GsChip icon={Icon} tone="platform" size="md" className="ring-amber-300/40" />
                      </motion.span>
                    </span>
                  ) : (
                    <GsChip icon={Icon} tone="muted" size="md" className="transition-transform group-hover:scale-105" />
                  )}
                  <span
                    className={cn(
                      "hidden text-[10px] font-bold uppercase tracking-wide transition-colors sm:block",
                      current ? "text-sky-200" : done ? "text-emerald-300" : "text-slate-400"
                    )}
                  >
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide sm:hidden",
                      current ? "text-sky-200" : done ? "text-emerald-300" : "text-slate-500"
                    )}
                  >
                    {i + 1}
                  </span>
                </button>
              </li>
            );
          })}
          </ol>
        </div>
      </div>

      {/* Layout — the editable live preview is CHAPTER-specific, so it only joins
          as a second column on that stage. Pricing / Admin / Launch render the
          wizard alone in a centered, focused column so each of those stages feels
          calm and uncluttered (no irrelevant device mock competing for the eye). */}
      <div
        className={cn(
          "grid items-start gap-6",
          step === "chapter"
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]"
            : "mx-auto max-w-3xl grid-cols-1"
        )}
      >
        {/* Wizard card */}
        <GlassPanel>
          {/* Cursor-tracking glow for fine-pointer devices only (no-op on touch /
              reduced-motion). Sits behind the content; the panel clips it. */}
          <Spotlight size={520} color="rgba(37,99,235,0.16)" edgeColor="rgba(56,189,248,0.10)" />
          <div className="relative space-y-6 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              {/* Active-step chip — gold-accented to match the rail's active state. */}
              <GsChip icon={StepIcon} tone="platform" size="lg" className="shrink-0 ring-amber-300/30 [--gs-accent:#fbbf24]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Step {stepIndex + 1} of {STEPS.length}
                </p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-xl font-bold tracking-tight text-white outline-none focus-visible:underline focus-visible:decoration-sky-400/60 focus-visible:underline-offset-4"
                >
                  {STEPS[stepIndex].label}
                </h2>
                <p className="mt-1 text-sm text-slate-300">{STEPS[stepIndex].blurb}</p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            {/* Step body — directional slide/fade between steps via AnimatePresence.
                mode="wait" so the outgoing step finishes before the next enters;
                custom `dir` flips the slide direction (forward vs. back). Snappy
                (~0.25s) to keep the form feeling fast. No overflow-hidden here so
                input focus rings never clip; the parent GlassPanel already clips
                any transient horizontal travel. */}
            <div className="relative">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={stepVariants}
                  initial={reduce ? "reduced" : "enter"}
                  animate="center"
                  exit={reduce ? "reduced" : "exit"}
                  transition={reduce ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="will-change-transform"
                >
              {step === "chapter" && (
                <div className="space-y-5">
                  {/* ── Fast path: pick a school + org to auto-theme everything ── */}
                  <div className="relative overflow-hidden rounded-2xl border border-blue-400/25 bg-gradient-to-b from-blue-500/[0.09] to-white/[0.02] p-4 shadow-inner sm:p-5">
                    <div className="flex items-center gap-2.5">
                      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-400/10 text-sky-300 ring-1 ring-blue-500/20">
                        {!reduce && (
                          <motion.span
                            className="absolute inset-0 rounded-xl bg-amber-400/15 blur-md"
                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                            aria-hidden="true"
                          />
                        )}
                        <IconSpark className="relative h-4 w-4 text-amber-400" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">Pick your school &amp; organization</h3>
                          <span className="hidden rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/20 sm:inline-flex">
                            Fastest
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          We&apos;ll auto-fill your name, letters &amp; colors — edit anything after.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                      <SchoolPicker value={schoolSel} onChange={applySchool} />
                      <OrgPicker value={orgSel} onChange={applyOrg} />
                    </div>

                    {/* Tiny reassurance that picks are a starting point, not a lock-in. */}
                    <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <IconCrest className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                      Both have a &ldquo;Can&apos;t find it? Enter manually&rdquo; option — and every field stays editable below.
                    </p>
                  </div>

                  {/* Browse-by-card preset library (kept) — an alternate way to pick
                      an org as a visual grid; mirrors into the same fields. */}
                  <details className="group rounded-xl border border-white/10 bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60">
                      <span className="flex items-center gap-2">
                        <IconBranding className="h-4 w-4 text-sky-300" aria-hidden="true" />
                        Prefer to browse a visual grid of organizations?
                      </span>
                      <IconArrowRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true" />
                    </summary>
                    <div className="border-t border-white/10 p-3 sm:p-4">
                      <OrgPresetPicker
                        selectedName={fraternityName}
                        onPick={applyOrgPreset}
                        onCustom={applyCustomOrg}
                      />
                    </div>
                  </details>

                  <div className="flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Or enter the essentials
                    </span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  {/* ── The four essentials ─────────────────────────────────────
                      Slimmed from the old field-wall to exactly what a valid,
                      on-brand launch needs: a subdomain, the org name, the
                      chapter's Greek letters, and the school. The pickers above
                      auto-fill most of these; anything left blank can be typed
                      here. Everything else lives in the optional expander below so
                      this surface stays calm — no dense blotchy wall. */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <WField
                        label="Choose your subdomain"
                        value={subdomain}
                        onChange={setSubdomain}
                        placeholder="phisig-usc"
                        error={errors.subdomain}
                        // Tint the input border to match a resolved blocking
                        // status (taken/reserved/invalid) without hiding the live
                        // status hint below it. A hard `error` still takes over.
                        invalid={subdomainBlocks}
                        required
                        hint={
                          <SubdomainStatus
                            host={`${normalizedSubdomain || "your-subdomain"}.greekstack.vercel.app`}
                            status={subStatus}
                          />
                        }
                      />
                    </div>
                    <WField label="Organization name" value={fraternityName} onChange={setFraternityName} placeholder="Phi Sigma Kappa" error={errors.fraternityName} required />
                    <WField label="Chapter Greek letters" value={greekLetters} onChange={setGreekLetters} placeholder="Gamma Triton" error={errors.greekLetters} required />
                    <div className="sm:col-span-2">
                      <WField label="School / university" value={schoolName} onChange={setSchoolName} placeholder="University of South Carolina" error={errors.schoolName} required />
                    </div>
                  </div>

                  {/* ── Optional: fine-tune everything else ──────────────────────
                      The long-tail identity, brand-color, and contact fields,
                      tucked behind one expander so they're available without
                      crowding the default view. All optional — sensible defaults
                      and the live preview cover anyone who skips this. */}
                  <details className="group rounded-xl border border-white/10 bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60">
                      <span className="flex items-center gap-2">
                        <IconSettingsGear className="h-4 w-4 text-sky-300" aria-hidden="true" />
                        Fine-tune details
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Optional
                        </span>
                      </span>
                      <IconArrowRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true" />
                    </summary>
                    <div className="space-y-6 border-t border-white/10 p-4 sm:p-5">
                      {/* Extra identity fields */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Identity</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <WField label="Organization name (short)" value={fraternityShort} onChange={setFraternityShort} placeholder="Phi Sig" />
                          <WField label="School abbreviation" value={schoolShort} onChange={setSchoolShort} placeholder="USC" />
                          <WField
                            label="Organization letters (glyphs)"
                            value={fraternityLetters}
                            onChange={setFraternityLetters}
                            placeholder="ΦΣΚ"
                            glyphInsert={(g) => appendGlyph(setFraternityLetters, fraternityLetters, g)}
                          />
                          <WField
                            label="Chapter letters (glyphs)"
                            value={greekLettersGlyphs}
                            onChange={setGreekLettersGlyphs}
                            placeholder="ΓΤ"
                            glyphInsert={(g) => appendGlyph(setGreekLettersGlyphs, greekLettersGlyphs, g)}
                          />
                          <WField label="Chapter charter year" value={charterYear} onChange={setCharterYear} placeholder="1975" />
                          <WField label="Organization founding year" value={foundingYear} onChange={setFoundingYear} placeholder="1873" />
                        </div>
                      </div>

                      {/* Brand colors (also editable live on the preview) */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Brand colors</p>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <WColor label="Primary" value={primaryColor} onChange={setPrimaryColor} fallback="#C8102E" />
                          <WColor label="Dark / text" value={darkColor} onChange={setDarkColor} fallback="#A20D26" />
                          <WColor label="Soft tint" value={softColor} onChange={setSoftColor} fallback="#FCEFF1" />
                        </div>
                        <ColorPresets primaryColor={primaryColor} onPick={applyColorPreset} />
                      </div>

                      {/* Contact + social (optional) */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Recruitment contact &amp; social</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <WField label="Recruitment email" value={rushEmail} onChange={setRushEmail} placeholder="rush@yourchapter.com" />
                          <WField label="Recruitment phone" value={rushPhone} onChange={setRushPhone} placeholder="(803) 555-0195" />
                          <WField label="Instagram handle" value={instagramHandle} onChange={setInstagramHandle} placeholder="@yourchapter" />
                          <WField label="Instagram URL" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://www.instagram.com/yourchapter/" />
                          <WField label="Chapter house address" value={address} onChange={setAddress} placeholder="1525 College Street" />
                          <WField label="City, state & ZIP" value={cityState} onChange={setCityState} placeholder="Columbia, SC 29208" />
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Gentle nudge to the live preview (mobile shows it below; desktop to the side). */}
                  <p className="flex items-center gap-1.5 rounded-xl border border-sky-400/15 bg-sky-500/[0.06] px-3 py-2.5 text-xs text-slate-300">
                    <IconSpark className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                    <span>
                      Tip: edit your headline, name, and colors right on the live preview{" "}
                      <span className="lg:hidden">below</span>
                      <span className="hidden lg:inline">on the right</span> — it updates instantly.
                    </span>
                  </p>
                </div>
              )}

              {step === "admin" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <WField label="Administrator Full Name" value={adminName} onChange={setAdminName} placeholder="Mark Laughery" error={errors.adminName} required />
                  </div>
                  <WField label="Admin Login Email" value={adminEmail} onChange={setAdminEmail} placeholder="admin@yourchapter.com" error={errors.adminEmail} required />
                  <div>
                    <FieldLabel htmlFor="admin-pw" required>Admin Password</FieldLabel>
                    <div className="relative">
                      <IconSecurity className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="admin-pw"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(
                          "border-white/10 bg-white/5 pl-9 text-white transition-colors placeholder:text-slate-500 hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-sky-400/60",
                          errors.adminPassword && "border-rose-400/60 hover:border-rose-400/60 focus-visible:ring-rose-400/50"
                        )}
                        aria-invalid={errors.adminPassword ? true : undefined}
                        required
                      />
                    </div>
                    {errors.adminPassword ? (
                      <FieldError>{errors.adminPassword}</FieldError>
                    ) : (
                      <p className="mt-1.5 text-xs text-slate-400">Minimum 8 characters.</p>
                    )}
                  </div>
                </div>
              )}

              {step === "pricing" && (
                <PricingStep plan={plan} onChange={setPlan} />
              )}

              {step === "launch" && (
                <div className="space-y-4">
                  {/* Celebratory "ready" banner — a soft emerald→sky glass card with
                      a gentle breathing rocket badge to mark the finish line. */}
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.12] via-sky-500/[0.06] to-transparent p-4">
                    <div className="flex items-start gap-3">
                      <motion.span
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-300/30"
                        animate={reduce ? undefined : { y: [0, -3, 0] }}
                        transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                        aria-hidden="true"
                      >
                        <IconLaunch className="h-5 w-5" />
                      </motion.span>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-bold text-emerald-100">
                          Everything is ready to launch.
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-emerald-100/80">
                          Hit the button below and Greekstack provisions your branded site, admin
                          dashboard, and database instantly — then takes you straight to it.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-200">
                      <IconCheckCircle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> Review &amp; confirm
                    </h3>
                    <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2">
                      <SummaryRow label="Chapter">{`${fraternityName} ${greekLetters}`.trim() || "—"}</SummaryRow>
                      <SummaryRow label="School">{schoolName ? `${schoolName}${schoolShort ? ` (${schoolShort})` : ""}` : "—"}</SummaryRow>
                      <SummaryRow label="Site URL">
                        <span className="font-mono text-sky-200">{(subdomain.trim() || "your-chapter")}.greekstack.vercel.app</span>
                      </SummaryRow>
                      <SummaryRow label="Admin">{adminEmail || "—"}</SummaryRow>
                      <SummaryRow label="Plan">{PLAN_SUMMARY[plan]}</SummaryRow>
                    </div>
                  </div>

                  <p className="flex items-center gap-1.5 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2.5 text-xs text-emerald-100/90">
                    <IconSecurity className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>
                      No card required now — you&apos;re launching on the{" "}
                      <span className="font-semibold text-white">{PLAN_SUMMARY[plan]}</span>.
                    </span>
                  </p>

                  {/* ── Optional: book a 15-min call with the owner (Cal.com) ─────
                      Embeds the booker when NEXT_PUBLIC_CAL_LINK is set; otherwise
                      shows a tasteful "we'll reach out / skip" card — never a
                      broken embed. Always optional; the site is already live. */}
                  <BookACall />
                </div>
              )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            {/* Footer controls */}
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="glass"
                onClick={goPrev}
                disabled={stepIndex === 0 || busy}
                className="text-slate-200 transition-transform hover:-translate-x-0.5"
              >
                <IconArrowRight className="mr-1 h-4 w-4 rotate-180" /> Back
              </Button>

              {!isLastStep ? (
                <Magnetic strength={14} radius={80}>
                  <ShimmerBorder rounded="rounded-full">
                    <Button
                      type="button"
                      variant="platform"
                      size="lg"
                      onClick={goNext}
                      disabled={busy || (step === "chapter" && subdomainBlocks)}
                      className="gs-sheen"
                    >
                      Continue <IconArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </ShimmerBorder>
                </Magnetic>
              ) : (
                <Magnetic strength={16} radius={90}>
                  <ShimmerBorder rounded="rounded-full">
                    <Button
                      type="button"
                      variant="platform"
                      size="xl"
                      onClick={handleLaunch}
                      disabled={busy}
                      className="gs-sheen"
                    >
                      {busy ? (
                        <>
                          <IconSpark className="mr-2 h-5 w-5 animate-spin" /> Launching your site…
                        </>
                      ) : (
                        <>
                          <IconLaunch className="mr-2 h-5 w-5" /> Launch My Site
                        </>
                      )}
                    </Button>
                  </ShimmerBorder>
                </Magnetic>
              )}
            </div>
          </div>
        </GlassPanel>

        {/* Live preview — fully editable in real time (colors, name, hero copy).
            Only mounted on the Chapter stage, where the founder is actively
            shaping their site; it animates in/out with the stage change. */}
        {step === "chapter" && (
          <EditableLivePreview
            fraternityName={fraternityName}
            onFraternityName={setFraternityName}
            greekLetters={greekLetters}
            greekLettersGlyphs={greekLettersGlyphs}
            fraternityLetters={fraternityLetters}
            schoolName={schoolName}
            schoolShort={schoolShort}
            primaryColor={primaryColor}
            onPrimaryColor={setPrimaryColor}
            darkColor={darkColor}
            onDarkColor={setDarkColor}
            softColor={softColor}
            onSoftColor={setSoftColor}
            heroHeadline={heroHeadline}
            onHeroHeadline={setHeroHeadline}
            heroTagline={heroTagline}
            onHeroTagline={setHeroTagline}
            subdomain={subdomain}
          />
        )}
      </div>
    </div>
  );
}

/* ── Local presentational helpers ──────────────────────────────────────────── */

/* Directional step transition. `custom` carries the nav direction (1 forward,
   -1 back); the new step slides in from the side it's heading toward and the
   old one slides out the opposite way. `reduced` is a pure crossfade for
   prefers-reduced-motion (no horizontal travel). */
const stepVariants = {
  enter: (d: 1 | -1) => ({ opacity: 0, x: d > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: 1 | -1) => ({ opacity: 0, x: d > 0 ? -28 : 28 }),
  reduced: { opacity: 0, x: 0 },
};

/* ── Pricing step ──────────────────────────────────────────────────────────── */

type PlanId = "monthly" | "semester" | "dues_percentage" | "custom";

/* One-line plan label reused in the launch summary + the "no card required" note. */
const PLAN_SUMMARY: Record<PlanId, string> = {
  monthly: "Base — $50/mo (first month free)",
  semester: "Base — $250 / semester",
  dues_percentage: "Dues-share — $0 upfront",
  custom: "Custom — tailored quote",
};

/**
 * PRICING STEP — choose how the chapter pays Greekstack. Two selectable methods
 * (Base: monthly|semester · Dues-share: a % of dues) presented as big radio
 * cards, plus a link out to Method 3 "Custom" (→ /contact#custom). NOTHING here
 * collects a card — the trial / dues-share start with no payment, so the founder
 * launches first and is billed (or not) later.
 *
 * Fully controlled: the selected `plan` lives in the wizard; this just renders +
 * reports changes. Implemented as a real radiogroup (role + roving aria-checked)
 * so it's keyboard + screen-reader navigable; the "Base" card has a nested
 * monthly/semester sub-toggle that itself maps to the monthly|semester plan ids.
 */
function PricingStep({ plan, onChange }: { plan: PlanId; onChange: (p: PlanId) => void }) {
  const baseSelected = plan === "monthly" || plan === "semester";
  const duesSelected = plan === "dues_percentage";

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-slate-300">
        First, pick the plan that fits your chapter. You can launch on any option with{" "}
        <span className="font-semibold text-white">no card required</span> — switch or add a
        payment method later from Admin&nbsp;→&nbsp;Billing.
      </p>

      <div
        role="radiogroup"
        aria-label="Pricing method"
        className="grid gap-4 lg:grid-cols-2"
      >
        {/* ── Method 1 — Base (recommended) ───────────────────────────────── */}
        <PlanCard
          selected={baseSelected}
          onSelect={() => onChange("monthly")}
          icon={IconCoins}
          eyebrow="Method 1"
          title="Base"
          recommended
          headline={
            plan === "semester" ? (
              <>
                <span className="text-3xl font-extrabold text-white">$250</span>
                <span className="text-sm font-semibold text-slate-400">/semester</span>
              </>
            ) : (
              <>
                <span className="text-3xl font-extrabold text-white">$50</span>
                <span className="text-sm font-semibold text-slate-400">/mo</span>
              </>
            )
          }
          highlight={plan === "semester" ? "Save ~17% vs monthly" : "First month free"}
          features={[
            "Everything included — recruitment, dues, events, roster, compliance",
            "Cancel anytime, no contract",
            "Stripe processing at cost (no platform markup)",
          ]}
        >
          {/* Monthly / semester sub-toggle — only meaningful when Base is chosen. */}
          <div
            className="mt-3 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Base billing cadence"
          >
            <CadencePill
              active={plan === "monthly"}
              onClick={(e) => {
                e.stopPropagation();
                onChange("monthly");
              }}
              icon={IconCalendar}
              title="Monthly"
              sub="$50/mo · 1st mo free"
            />
            <CadencePill
              active={plan === "semester"}
              onClick={(e) => {
                e.stopPropagation();
                onChange("semester");
              }}
              icon={IconCalendar}
              title="Per semester"
              sub="$250 / sem · save ~17%"
            />
          </div>
        </PlanCard>

        {/* ── Method 2 — Dues-share ───────────────────────────────────────── */}
        <PlanCard
          selected={duesSelected}
          onSelect={() => onChange("dues_percentage")}
          icon={IconPercent}
          eyebrow="Method 2"
          title="Dues-share"
          headline={
            <>
              <span className="text-3xl font-extrabold text-white">$0</span>
              <span className="text-sm font-semibold text-slate-400">upfront</span>
            </>
          }
          highlight="Pay as you grow"
          features={[
            "No fixed fee — we earn only when you collect",
            "1.5% of dues collected, then 3% as you scale",
            "Perfect for chapters starting from scratch",
          ]}
        />
      </div>

      {/* ── Method 3 — Custom (link out) ──────────────────────────────────── */}
      <a
        href="/contact#custom"
        className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-sky-400/40 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-400/10 text-sky-300 ring-1 ring-blue-500/20">
            <IconPricing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-bold text-white">
              Method 3 — Custom
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Talk to us
              </span>
            </p>
            <p className="truncate text-xs text-slate-400">
              Multi-chapter, councils, or a tailored build? We&apos;ll quote a custom plan.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sky-200">
          Contact us
          <IconExternal className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </a>

      {/* Reassurance footer */}
      <p className="flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-emerald-100/90">
        <IconSecurity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
        <span>
          We never ask for a card at signup. Your chapter goes live today; you only set up
          payment when you&apos;re ready.
        </span>
      </p>
    </div>
  );
}

/* A single big selectable plan card (radio semantics). When `recommended`, the
   card is wrapped in an animated shimmer ring and flagged with a "Most popular"
   ribbon so the eye lands on the headline offer. */
function PlanCard({
  selected,
  onSelect,
  icon: Icon,
  eyebrow,
  title,
  headline,
  highlight,
  features,
  recommended = false,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ComponentType<IconProps>;
  eyebrow: string;
  title: string;
  headline: React.ReactNode;
  highlight: string;
  features: string[];
  recommended?: boolean;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  const card = (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative flex h-full cursor-pointer flex-col rounded-2xl border p-5 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
        selected
          ? "border-sky-400/60 bg-sky-500/[0.10] shadow-xl shadow-blue-950/50"
          : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-blue-950/30",
      )}
    >
      {/* "Most popular" ribbon for the recommended plan. */}
      {recommended && (
        <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950 shadow-md shadow-amber-900/30">
          <IconSpark className="h-3 w-3" aria-hidden="true" /> Most popular
        </span>
      )}

      {/* Selected check — pops in when the card is chosen. */}
      <motion.span
        initial={false}
        animate={selected && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 16 }}
        className={cn(
          "absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors",
          selected ? "bg-sky-400 text-slate-950 shadow-sm shadow-sky-500/40" : "bg-white/5 text-transparent ring-1 ring-white/15",
        )}
        aria-hidden="true"
      >
        <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />
      </motion.span>

      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-400/10 text-sky-300 ring-1 ring-blue-500/20">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p>
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-1.5">{headline}</div>
      <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold text-amber-300 ring-1 ring-amber-400/20">
        <IconSpark className="h-3 w-3" aria-hidden="true" /> {highlight}
      </span>

      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
            <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {children}
    </div>
  );

  // The recommended card rides an animated gradient ring (reduced-motion-safe via
  // the .gs-shimmer-border CSS). `block` so it lays out as a normal grid cell.
  return recommended ? (
    <ShimmerBorder rounded="rounded-2xl" inline={false} className="h-full">
      {card}
    </ShimmerBorder>
  ) : (
    card
  );
}

/* The monthly/semester cadence sub-toggle inside the Base card. */
function CadencePill({
  active,
  onClick,
  icon: Icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ComponentType<IconProps>;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
        active
          ? "border-sky-400/60 bg-sky-500/15"
          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-bold text-white">
        <Icon className={cn("h-3.5 w-3.5", active ? "text-sky-300" : "text-slate-400")} aria-hidden="true" />
        {title}
      </span>
      <span className="text-[10px] font-medium text-slate-400">{sub}</span>
    </button>
  );
}

function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-blue-950/30 ring-1 ring-white/5 backdrop-blur-xl">
      {children}
    </div>
  );
}

/* ConfettiBurst — a one-shot ring of brand-gradient shards that fly outward and
   fade when the chapter site goes live. Decorative + aria-hidden; only mounted
   under non-reduced motion (the caller gates it). Deterministic geometry (no
   per-render randomness) so SSR and the client agree. */
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 110 + (i % 3) * 26;
  // De-purpled success burst: royal blue · sky · gold · emerald (success keep).
  const colors = ["#2563eb", "#38bdf8", "#fbbf24", "#34d399"];
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    rotate: (i % 2 ? 1 : -1) * (120 + i * 18),
    color: colors[i % colors.length],
    delay: (i % 5) * 0.03,
  };
});

function ConfettiBurst() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div className="absolute left-1/2 top-1/2">
        {CONFETTI.map((c, i) => (
          <motion.span
            key={i}
            className="absolute h-2.5 w-1.5 rounded-[2px] will-change-transform"
            style={{ background: c.color }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.6, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: c.x,
              y: c.y,
              scale: [0.6, 1, 0.9],
              rotate: c.rotate,
            }}
            transition={{ duration: 1.1, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
    </div>
  );
}

function FieldLabel({
  htmlFor, children, required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1.5 inline-flex items-center gap-1 text-sm font-semibold text-slate-200">
      {children}
      {required && <span className="text-rose-400" aria-hidden="true">*</span>}
    </Label>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-300">
      <IconClose className="h-3.5 w-3.5" /> {children}
    </p>
  );
}

/* SubdomainStatus — the live availability hint under the Desired Subdomain
   field. Always renders the resolved host line; the verdict line below lives in
   an aria-live="polite" region so screen readers announce "available / taken /
   reserved / invalid / checking" as the debounced check resolves (the region is
   always mounted, so changes are announced rather than missed on mount). Color +
   icon carry the same meaning visually; reduced-motion-safe (the only motion is
   the spinner, which respects the user's prefers-reduced-motion via the caller's
   `reduce` flag passed down). */
function SubdomainStatus({
  host,
  status,
}: {
  host: string;
  status: "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";
}) {
  const reduce = useReducedMotion();
  const verdict = (() => {
    switch (status) {
      case "checking":
        return {
          tone: "text-slate-300",
          icon: (
            <IconSpark
              className={cn("h-3.5 w-3.5 text-sky-300", !reduce && "animate-spin")}
              aria-hidden="true"
            />
          ),
          text: "Checking availability…",
        };
      case "available":
        return {
          tone: "text-emerald-300",
          icon: <IconCheckCircle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />,
          text: (
            <>
              <span className="font-semibold text-emerald-200">{host}</span> is available
            </>
          ),
        };
      case "taken":
        return {
          tone: "text-rose-300",
          icon: <IconClose className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />,
          text: "That subdomain is taken — try another.",
        };
      case "reserved":
        return {
          tone: "text-rose-300",
          icon: <IconClose className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />,
          text: "That subdomain is reserved — try another.",
        };
      case "invalid":
        return {
          tone: "text-amber-300",
          icon: <IconClose className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />,
          text: "Use 3+ characters: letters, numbers, and single hyphens only.",
        };
      default:
        return null; // idle — show only the host preview line
    }
  })();

  return (
    <>
      <span className="block text-slate-400">
        Your site will live at{" "}
        <strong className="font-semibold text-sky-200">{host}</strong>
      </span>
      {/* Live region is ALWAYS present so changes announce; empty when idle. */}
      <span role="status" aria-live="polite" className="mt-1 block min-h-[1rem]">
        {verdict ? (
          <span className={cn("inline-flex items-center gap-1 font-medium", verdict.tone)}>
            {verdict.icon} {verdict.text}
          </span>
        ) : null}
      </span>
    </>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="text-slate-400">{label}: </span>
      <span className="font-semibold text-white">{children}</span>
    </div>
  );
}

function WField({
  label, value, onChange, placeholder, error, invalid, required, hint, glyphInsert,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  // Tint the border + mark aria-invalid for a soft/external validity signal
  // (e.g. a live availability check) WITHOUT replacing the `hint` the way a
  // hard `error` string does. `error` still wins when both are set.
  invalid?: boolean;
  required?: boolean;
  hint?: React.ReactNode;
  // When provided, renders a click-to-build Greek-letter inserter under the
  // field that appends glyphs (for the glyph/abbreviation fields).
  glyphInsert?: (glyph: string) => void;
}) {
  const id = React.useId();
  const showInvalid = Boolean(error) || Boolean(invalid);
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={showInvalid ? true : undefined}
        className={cn(
          "border-white/10 bg-white/5 text-white transition-colors placeholder:text-slate-500 hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-sky-400/60",
          showInvalid && "border-rose-400/60 hover:border-rose-400/60 focus-visible:ring-rose-400/50"
        )}
      />
      {error ? <FieldError>{error}</FieldError> : hint ? <div className="mt-1.5 text-xs text-slate-400">{hint}</div> : null}
      {glyphInsert ? <GreekLetterInserter onInsert={glyphInsert} /> : null}
    </div>
  );
}

function WColor({
  label, value, onChange, fallback, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fallback: string;
  error?: string;
}) {
  const id = React.useId();
  // The native color input needs a valid #rrggbb; fall back so a partial hex
  // mid-type doesn't blank the swatch. The glow ring picks up the live color.
  const swatch = /^#([0-9a-fA-F]{6})$/.test((value || "").trim()) ? value.trim() : fallback;
  return (
    <div>
      <FieldLabel htmlFor={id} required>{label}</FieldLabel>
      <div className="flex items-center gap-2 rounded-lg p-0.5 transition-colors focus-within:bg-white/[0.03]">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.10), 0 3px 10px -3px ${swatch}aa` }}
          className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-white/5 p-0.5 shadow-sm transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          aria-label={`${label} Color Picker`}
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          aria-invalid={error ? true : undefined}
          className={cn(
            "border-white/10 bg-white/5 font-mono text-white placeholder:text-slate-500 focus-visible:ring-sky-400/60",
            error && "border-rose-400/60 focus-visible:ring-rose-400/50"
          )}
        />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
