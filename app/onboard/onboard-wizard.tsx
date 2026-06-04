"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { IconChip } from "@/components/ui/icon-chip";
import { LivePreview } from "@/components/onboard/live-preview";
import { SuccessState } from "@/components/onboard/success-state";
import { OrgPresetPicker } from "@/components/onboard/org-preset-picker";
import { GreekLetterInserter } from "@/components/onboard/greek-letter-inserter";
import { ColorPresets } from "@/components/onboard/color-presets";
import { Magnetic, Reveal3D, FloatingOrbs } from "@/components/site/anim";
import { shade, type GreekOrg } from "@/lib/greek-orgs";
import {
  CheckCircle2, ChevronRight, ChevronLeft, Loader2, Sparkles,
  Building2, Palette, Mail, Rocket, User, Lock, AlertCircle, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "identity", label: "Chapter Details", icon: Building2, blurb: "Configure organization identity, school details, and charter details." },
  { id: "brand", label: "Brand Styling", icon: Palette, blurb: "Configure local chapter primary, dark, and soft-tint colors." },
  { id: "contact", label: "Contact Details", icon: Mail, blurb: "Set up recruitment contacts, social handles, and house location." },
  { id: "admin", label: "Admin Credentials", icon: User, blurb: "Create your chapter's primary administrator account." },
  { id: "launch", label: "Launch Site", icon: Rocket, blurb: "Confirm details and activate the chapter management system." },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export default function OnboardWizard() {
  const router = useRouter();
  const { push } = useToast();
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState<StepId>("identity");
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
  // as hints; required fields are enforced in validateStep("identity").
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

  // Brand State
  const [primaryColor, setPrimaryColor] = React.useState("#C8102E");
  const [darkColor, setDarkColor] = React.useState("#A20D26");
  const [softColor, setSoftColor] = React.useState("#FCEFF1");

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
    if (currentStep === "identity") {
      if (!fraternityName.trim()) e.fraternityName = "Required";
      if (!greekLetters.trim()) e.greekLetters = "Required";
      if (!schoolName.trim()) e.schoolName = "Required";
      if (!subdomain.trim()) e.subdomain = "Required";
      if (Object.keys(e).length) {
        setErrors(e);
        push({ title: "Validation Error", description: "Organization name, Greek letters, school name, and desired subdomain are required.", variant: "destructive" });
        return false;
      }
    } else if (currentStep === "brand") {
      if (!primaryColor.trim()) e.primaryColor = "Required";
      if (!darkColor.trim()) e.darkColor = "Required";
      if (!softColor.trim()) e.softColor = "Required";
      if (Object.keys(e).length) {
        setErrors(e);
        push({ title: "Validation Error", description: "All three brand colors are required.", variant: "destructive" });
        return false;
      }
    } else if (currentStep === "contact") {
      if (!rushEmail.trim()) {
        setErrors({ rushEmail: "Required" });
        push({ title: "Validation Error", description: "Rush contact email is required.", variant: "destructive" });
        return false;
      }
    } else if (currentStep === "admin") {
      if (!adminName.trim()) e.adminName = "Required";
      if (!adminEmail.trim()) e.adminEmail = "Required";
      if (!adminPassword.trim()) e.adminPassword = "Required";
      if (Object.keys(e).length) {
        setErrors(e);
        push({ title: "Validation Error", description: "Admin name, email, and password are required.", variant: "destructive" });
        return false;
      }
      if (adminPassword.length < 8) {
        setErrors({ adminPassword: "Must be at least 8 characters" });
        push({ title: "Validation Error", description: "Password must be at least 8 characters.", variant: "destructive" });
        return false;
      }
    }
    setErrors({});
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" /> Greekstack
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Your chapter site, <span className="gs-gradient-text">live in seconds</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Answer a few quick questions and watch your fully branded website take shape in
          real time. Hit launch and it goes live instantly — no code, no waiting.
        </p>
      </Reveal3D>

      {/* Progress rail */}
      <div className="mx-auto max-w-4xl space-y-3">
        {/* Animated fill track — eases to the % complete as steps advance. */}
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={STEPS.length - 1}
          aria-valuenow={stepIndex}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400"
            initial={false}
            animate={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26 }}
          />
        </div>

        <ol className="grid grid-cols-5 gap-2 sm:gap-3" role="list" aria-label="Setup steps">
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
                className={cn(
                  "group flex w-full flex-col items-center gap-2 rounded-2xl border p-2.5 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 sm:p-3",
                  current && "border-indigo-400/50 bg-white/[0.07] shadow-lg shadow-indigo-950/40",
                  done && "border-emerald-400/30 bg-emerald-500/[0.08]",
                  !current && !done && "border-white/10 bg-white/[0.02]",
                  !reachable && "cursor-not-allowed opacity-50",
                  reachable && !current && "hover:border-white/20 hover:bg-white/[0.05]"
                )}
              >
                {done ? (
                  <motion.span
                    initial={reduce ? false : { scale: 0.5, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 18 }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </motion.span>
                ) : current ? (
                  // Current step "breathes" subtly so the eye knows where it is.
                  <motion.span
                    animate={reduce ? undefined : { scale: [1, 1.07, 1] }}
                    transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="will-change-transform"
                  >
                    <IconChip icon={Icon} tone="platform" size="md" />
                  </motion.span>
                ) : (
                  <IconChip icon={Icon} tone="muted" size="md" />
                )}
                <span
                  className={cn(
                    "hidden text-[10px] font-bold uppercase tracking-wide sm:block",
                    current ? "text-indigo-200" : done ? "text-emerald-300" : "text-slate-400"
                  )}
                >
                  {s.label}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide sm:hidden",
                    current ? "text-indigo-200" : done ? "text-emerald-300" : "text-slate-500"
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

      {/* Two-column: wizard + live preview */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* Wizard card */}
        <GlassPanel>
          <div className="space-y-6 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <IconChip icon={StepIcon} tone="platform" size="lg" className="shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  Step {stepIndex + 1} of {STEPS.length}
                </p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-xl font-bold tracking-tight text-white outline-none focus-visible:underline focus-visible:decoration-indigo-400/60 focus-visible:underline-offset-4"
                >
                  {STEPS[stepIndex].label}
                </h2>
                <p className="mt-1 text-sm text-slate-300">{STEPS[stepIndex].blurb}</p>
              </div>
            </div>

            <div className="h-px bg-white/10" />

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
              {step === "identity" && (
                <div className="space-y-5">
                  {/* Preset library — pick any organization to auto-fill below */}
                  <OrgPresetPicker
                    selectedName={fraternityName}
                    onPick={applyOrgPreset}
                    onCustom={applyCustomOrg}
                  />

                  <div className="flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Or edit details
                    </span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <WField
                        label="Desired Subdomain"
                        value={subdomain}
                        onChange={setSubdomain}
                        placeholder="phisig-usc"
                        error={errors.subdomain}
                        required
                        hint={
                          <>
                            Your site will live at{" "}
                            <strong className="font-semibold text-indigo-200">
                              {(subdomain.trim() || "your-subdomain")}.greeklifesystems.vercel.app
                            </strong>
                          </>
                        }
                      />
                    </div>
                    <WField label="Organization Name (Full)" value={fraternityName} onChange={setFraternityName} placeholder="Phi Sigma Kappa" error={errors.fraternityName} required />
                    <WField label="Organization Name (Short)" value={fraternityShort} onChange={setFraternityShort} placeholder="Phi Sig" />
                    <WField
                      label="Organization Letters (Glyphs/Abbr)"
                      value={fraternityLetters}
                      onChange={setFraternityLetters}
                      placeholder="ΦΣΚ"
                      glyphInsert={(g) => appendGlyph(setFraternityLetters, fraternityLetters, g)}
                    />
                    <WField label="Greek Letters (Chapter Name)" value={greekLetters} onChange={setGreekLetters} placeholder="Gamma Triton" error={errors.greekLetters} required />
                    <WField
                      label="Greek Letters (Glyphs)"
                      value={greekLettersGlyphs}
                      onChange={setGreekLettersGlyphs}
                      placeholder="ΓΤ"
                      glyphInsert={(g) => appendGlyph(setGreekLettersGlyphs, greekLettersGlyphs, g)}
                    />
                    <WField label="School / University" value={schoolName} onChange={setSchoolName} placeholder="University of South Carolina" error={errors.schoolName} required />
                    <WField label="School Abbreviation" value={schoolShort} onChange={setSchoolShort} placeholder="USC" />
                    <WField label="Chapter Charter Year" value={charterYear} onChange={setCharterYear} placeholder="1975" />
                    <WField label="Organization Founding Year" value={foundingYear} onChange={setFoundingYear} placeholder="1873" />
                  </div>
                </div>
              )}

              {step === "brand" && (
                <div className="space-y-5">
                  <p className="text-sm leading-relaxed text-slate-300">
                    Pick your colors and watch the preview update live. These propagate across
                    your entire site the moment you launch.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <WColor label="Primary Theme Color" value={primaryColor} onChange={setPrimaryColor} fallback="#C8102E" error={errors.primaryColor} />
                    <WColor label="Dark Gradient/Text Color" value={darkColor} onChange={setDarkColor} fallback="#A20D26" error={errors.darkColor} />
                    <WColor label="Soft Background Tint" value={softColor} onChange={setSoftColor} fallback="#FCEFF1" error={errors.softColor} />
                  </div>

                  {/* Quick-pick brand color presets — sets primary + auto-suggests dark/soft */}
                  <ColorPresets primaryColor={primaryColor} onPick={applyColorPreset} />

                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Wand2 className="h-3.5 w-3.5 text-indigo-300" /> See it all come together in the
                    live preview{" "}
                    <span className="lg:hidden">below</span>
                    <span className="hidden lg:inline">on the right</span>.
                  </p>
                </div>
              )}

              {step === "contact" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <WField label="Recruitment Email Address" value={rushEmail} onChange={setRushEmail} placeholder="rush@yourchapter.com" error={errors.rushEmail} required />
                  <WField label="Recruitment Phone Number" value={rushPhone} onChange={setRushPhone} placeholder="(803) 555-0195" />
                  <WField label="Instagram Handle" value={instagramHandle} onChange={setInstagramHandle} placeholder="@yourchapter" />
                  <WField label="Instagram Profile URL" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://www.instagram.com/yourchapter/" />
                  <WField label="Chapter House Address" value={address} onChange={setAddress} placeholder="1525 College Street" />
                  <WField label="City, State & Zip Code" value={cityState} onChange={setCityState} placeholder="Columbia, SC 29208" />
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
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="admin-pw"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(
                          "border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-500 focus-visible:ring-indigo-400/60",
                          errors.adminPassword && "border-rose-400/60 focus-visible:ring-rose-400/50"
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

              {step === "launch" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Everything is ready to launch.
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/80">
                      Hit the button below and Greekstack provisions your branded site, admin
                      dashboard, and database instantly — then takes you straight to it.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Summary</h3>
                    <div className="mt-3 grid grid-cols-1 gap-y-2.5 text-sm sm:grid-cols-2">
                      <SummaryRow label="Chapter">{`${fraternityName} ${greekLetters}`.trim() || "—"}</SummaryRow>
                      <SummaryRow label="School">{schoolName ? `${schoolName}${schoolShort ? ` (${schoolShort})` : ""}` : "—"}</SummaryRow>
                      <SummaryRow label="Site URL">
                        <span className="font-mono text-indigo-200">{(subdomain.trim() || "your-chapter")}.greeklifesystems.vercel.app</span>
                      </SummaryRow>
                      <SummaryRow label="Admin">{adminEmail || "—"}</SummaryRow>
                    </div>
                  </div>
                </div>
              )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="h-px bg-white/10" />

            {/* Footer controls */}
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="glass"
                onClick={goPrev}
                disabled={stepIndex === 0 || busy}
                className="text-slate-200"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>

              {!isLastStep ? (
                <Magnetic strength={14} radius={80}>
                  <Button type="button" variant="platform" size="lg" onClick={goNext} className="gs-sheen">
                    Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Magnetic>
              ) : (
                <Magnetic strength={16} radius={90}>
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
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Launching your site…
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-5 w-5" /> Launch My Site
                      </>
                    )}
                  </Button>
                </Magnetic>
              )}
            </div>
          </div>
        </GlassPanel>

        {/* Live preview */}
        <LivePreview
          fraternityName={fraternityName}
          fraternityShort={fraternityShort}
          greekLetters={greekLetters}
          greekLettersGlyphs={greekLettersGlyphs}
          fraternityLetters={fraternityLetters}
          schoolName={schoolName}
          schoolShort={schoolShort}
          primaryColor={primaryColor}
          darkColor={darkColor}
          softColor={softColor}
          subdomain={subdomain}
        />
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

function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-indigo-950/30 ring-1 ring-white/5 backdrop-blur-xl">
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
  const colors = ["#6366f1", "#22d3ee", "#a855f7", "#34d399"];
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
      <AlertCircle className="h-3.5 w-3.5" /> {children}
    </p>
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
  label, value, onChange, placeholder, error, required, hint, glyphInsert,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: React.ReactNode;
  // When provided, renders a click-to-build Greek-letter inserter under the
  // field that appends glyphs (for the glyph/abbreviation fields).
  glyphInsert?: (glyph: string) => void;
}) {
  const id = React.useId();
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={cn(
          "border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-indigo-400/60",
          error && "border-rose-400/60 focus-visible:ring-rose-400/50"
        )}
      />
      {error ? <FieldError>{error}</FieldError> : hint ? <p className="mt-1.5 text-xs text-slate-400">{hint}</p> : null}
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
  return (
    <div>
      <FieldLabel htmlFor={id} required>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-12 cursor-pointer rounded-lg border border-white/10 bg-white/5 p-0.5 shadow-sm"
          aria-label={`${label} Color Picker`}
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          aria-invalid={error ? true : undefined}
          className={cn(
            "border-white/10 bg-white/5 font-mono text-white placeholder:text-slate-500 focus-visible:ring-indigo-400/60",
            error && "border-rose-400/60 focus-visible:ring-rose-400/50"
          )}
        />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
