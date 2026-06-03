"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircle2, ChevronRight, ChevronLeft, Loader2, Sparkles,
  Building2, Palette, Mail, ShieldCheck, Rocket, User, Lock,
  CreditCard, Percent, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GreekstackLogo } from "@/components/brand/greekstack-logo";

const STEPS = [
  { id: "identity", label: "Chapter Details", icon: Building2, blurb: "Configure fraternity identity, school details, and charter details." },
  { id: "brand", label: "Brand Styling", icon: Palette, blurb: "Configure local chapter primary, dark, and soft-tint colors." },
  { id: "contact", label: "Contact Details", icon: Mail, blurb: "Set up recruitment contacts, social handles, and house location." },
  { id: "admin", label: "Admin Credentials", icon: User, blurb: "Create your chapter's primary administrator account." },
  { id: "billing", label: "Billing Plan", icon: CreditCard, blurb: "Choose the integration and payment model for your chapter." },
  { id: "launch", label: "Launch Site", icon: Rocket, blurb: "Confirm details and activate the chapter management system." },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export default function OnboardWizard() {
  const router = useRouter();
  const { push } = useToast();
  const [step, setStep] = React.useState<StepId>("identity");
  const [busy, setBusy] = React.useState(false);

  // Identity State — start EMPTY (placeholders show the Phi Sig reference as a
  // hint). Pre-filling real values meant a click-through published Phi Sig's
  // identity as the new chapter's own. Required fields are enforced in
  // validateStep("identity").
  const [fraternityName, setFraternityName] = React.useState("");
  const [fraternityShort, setFraternityShort] = React.useState("");
  const [greekLetters, setGreekLetters] = React.useState("");
  const [greekLettersGlyphs, setGreekLettersGlyphs] = React.useState("");
  const [schoolName, setSchoolName] = React.useState("");
  const [schoolShort, setSchoolShort] = React.useState("");
  const [charterYear, setCharterYear] = React.useState("");
  const [foundingYear, setFoundingYear] = React.useState("");
  const [fraternityLetters, setFraternityLetters] = React.useState("");

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
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Billing State
  const [billingPlan, setBillingPlan] = React.useState<"flat_subscription" | "dues_split">("dues_split");

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isLastStep = stepIndex === STEPS.length - 1;

  function validateStep(currentStep: StepId): boolean {
    if (currentStep === "identity") {
      if (!fraternityName.trim() || !greekLetters.trim() || !schoolName.trim()) {
        push({ title: "Validation Error", description: "Fraternity name, Greek letters, and school name are required.", variant: "destructive" });
        return false;
      }
    } else if (currentStep === "brand") {
      if (!primaryColor.trim() || !darkColor.trim() || !softColor.trim()) {
        push({ title: "Validation Error", description: "All three brand colors are required.", variant: "destructive" });
        return false;
      }
    } else if (currentStep === "contact") {
      if (!rushEmail.trim()) {
        push({ title: "Validation Error", description: "Rush contact email is required.", variant: "destructive" });
        return false;
      }
    } else if (currentStep === "admin") {
      if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
        push({ title: "Validation Error", description: "Admin name, email, and password are required.", variant: "destructive" });
        return false;
      }
      if (adminPassword.length < 8) {
        push({ title: "Validation Error", description: "Password must be at least 8 characters.", variant: "destructive" });
        return false;
      }
      if (adminPassword !== confirmPassword) {
        push({ title: "Validation Error", description: "Passwords don't match.", variant: "destructive" });
        return false;
      }
    } else if (currentStep === "billing") {
      if (!billingPlan) {
        push({ title: "Validation Error", description: "Please select a billing plan.", variant: "destructive" });
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1].id);
    }
  }

  function goPrev() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].id);
    }
  }

  async function handleLaunch() {
    setBusy(true);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          billingPlan,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Onboarding failed");
      }

      push({ title: "Setup Complete", description: "Your site has been successfully initialized!", variant: "success" });
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      push({ title: "Launch Failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="text-center mb-8 flex flex-col items-center animate-fade-in">
        <GreekstackLogo className="mb-4" size={48} />
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-maroon-700 bg-maroon-100/50 px-3 py-1 rounded-full">
          <Sparkles className="h-3.5 w-3.5" /> Platform Initialization
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-maroon-900">
          Setup Your White-Label Portal
        </h1>
        <p className="mt-2 text-sm text-maroon-700 max-w-lg mx-auto">
          Welcome to Greekstack. Complete these details to initialize your chapter's production database and brand styles instantly.
        </p>
      </div>

      {/* Step Rail */}
      <ol className="grid grid-cols-5 gap-2" role="list" aria-label="Setup progress">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const current = s.id === step;
          const done = stepIndex > i;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  // Only allow jumping back to steps already verified
                  if (i < stepIndex) setStep(s.id);
                }}
                disabled={i > stepIndex}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "w-full flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-maroon-700/40",
                  current && "border-maroon-700 bg-white/90 shadow-md",
                  done && "border-emerald-300 bg-emerald-50/50",
                  !current && !done && "border-maroon-100 bg-white/40 opacity-60 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  current && "bg-maroon-700 text-white shadow-sm",
                  done && "bg-emerald-500 text-white",
                  !current && !done && "bg-maroon-100 text-maroon-800"
                )}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={cn(
                  "text-[10px] font-semibold tracking-wide uppercase hidden md:block",
                  current ? "text-maroon-900" : done ? "text-emerald-800" : "text-maroon-600"
                )}>
                  Step {i + 1}
                </span>
                <span className="text-[10px] text-maroon-500 line-clamp-1 hidden sm:block">
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <Card className="backdrop-blur-md bg-white/75 border border-white/40 shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-maroon-900 flex items-center gap-2">
              {React.createElement(STEPS[stepIndex].icon, { className: "h-5 w-5 text-maroon-700" })}
              {STEPS[stepIndex].label}
            </h2>
            <p className="mt-1.5 text-sm text-maroon-700">{STEPS[stepIndex].blurb}</p>
          </div>

          <div className="h-px bg-maroon-100" />

          {step === "identity" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <WField label="Fraternity Name (Full)" value={fraternityName} onChange={setFraternityName} placeholder="Phi Sigma Kappa" />
              <WField label="Fraternity Name (Short)" value={fraternityShort} onChange={setFraternityShort} placeholder="Phi Sig" />
              <WField label="Fraternity Letters (Glyphs/Abbr)" value={fraternityLetters} onChange={setFraternityLetters} placeholder="ΦΣΚ" />
              <WField label="Greek Letters (Chapter Name)" value={greekLetters} onChange={setGreekLetters} placeholder="Gamma Triton" />
              <WField label="Greek Letters (Glyphs)" value={greekLettersGlyphs} onChange={setGreekLettersGlyphs} placeholder="ΓΤ" />
              <WField label="School / University" value={schoolName} onChange={setSchoolName} placeholder="University of South Carolina" />
              <WField label="School Abbreviation" value={schoolShort} onChange={setSchoolShort} placeholder="USC" />
              <WField label="Chapter Charter Year" value={charterYear} onChange={setCharterYear} placeholder="1975" />
              <WField label="Fraternity Founding Year" value={foundingYear} onChange={setFoundingYear} placeholder="1873" />
            </div>
          )}

          {step === "brand" && (
            <div className="space-y-4">
              <p className="text-xs text-maroon-700 leading-relaxed">
                Configure color hex keys below. These colors will instantly propagate across the site root layout styles.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <WColor label="Primary Theme Color" value={primaryColor} onChange={setPrimaryColor} fallback="#C8102E" />
                <WColor label="Dark Gradient/Text Color" value={darkColor} onChange={setDarkColor} fallback="#A20D26" />
                <WColor label="Soft Background Tint" value={softColor} onChange={setSoftColor} fallback="#FCEFF1" />
              </div>

              {/* Real-time brand preview */}
              <div className="mt-6 rounded-xl border border-maroon-100 p-4 bg-white/40 space-y-3">
                <p className="text-xs font-semibold text-maroon-800 uppercase tracking-wider">Live Visual Palette Preview</p>
                <div className="flex gap-2">
                  <div className="flex-1 h-14 rounded-lg flex items-center justify-center text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: primaryColor }}>
                    Primary
                  </div>
                  <div className="flex-1 h-14 rounded-lg flex items-center justify-center text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: darkColor }}>
                    Dark Gradient
                  </div>
                  <div className="flex-1 h-14 rounded-lg flex items-center justify-center text-xs font-semibold border border-maroon-200 shadow-sm" style={{ backgroundColor: softColor, color: darkColor }}>
                    Soft / Tint
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "contact" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <WField label="Recruitment Email Address" value={rushEmail} onChange={setRushEmail} placeholder="rush@yourchapter.com" />
              <WField label="Recruitment Phone Number" value={rushPhone} onChange={setRushPhone} placeholder="(803) 555-0195" />
              <WField label="Instagram Handle" value={instagramHandle} onChange={setInstagramHandle} placeholder="@yourchapter" />
              <WField label="Instagram Profile URL" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://www.instagram.com/yourchapter/" />
              <WField label="Chapter House Address" value={address} onChange={setAddress} placeholder="1525 College Street" />
              <WField label="City, State & Zip Code" value={cityState} onChange={setCityState} placeholder="Columbia, SC 29208" />
            </div>
          )}

          {step === "admin" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <WField label="Administrator Full Name" value={adminName} onChange={setAdminName} placeholder="Mark Laughery" />
              </div>
              <WField label="Admin Login Email" value={adminEmail} onChange={setAdminEmail} placeholder="admin@yourchapter.com" />
              <div>
                <Label htmlFor="admin-pw" className="mb-1.5 inline-block text-maroon-900 font-semibold text-sm">Admin Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-maroon-400" />
                  <Input
                    id="admin-pw"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pl-9 bg-white/70 border-maroon-200 focus:border-maroon-700"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="admin-pw2" className="mb-1.5 inline-block text-maroon-900 font-semibold text-sm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-maroon-400" />
                  <Input
                    id="admin-pw2"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="pl-9 bg-white/70 border-maroon-200 focus:border-maroon-700"
                    required
                  />
                </div>
                {confirmPassword.length > 0 && adminPassword !== confirmPassword && (
                  <p className="mt-1.5 text-[11px] font-medium text-red-600">Passwords don&apos;t match.</p>
                )}
              </div>
            </div>
          )}

          {step === "billing" && (
            <div className="space-y-4 animate-slide-up">
              <p className="text-xs text-maroon-700 leading-relaxed">
                Choose the payment integration model that fits your chapter. You can switch plans or update payment settings later in the Admin panel.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {/* Option 1: Dues Split */}
                <button
                  type="button"
                  onClick={() => setBillingPlan("dues_split")}
                  className={cn(
                    "relative flex flex-col text-left p-5 rounded-2xl border transition-all duration-200 outline-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] min-h-[220px]",
                    billingPlan === "dues_split"
                      ? "border-maroon-700 bg-maroon-50/40 ring-1 ring-maroon-700 shadow-sm"
                      : "border-maroon-100 bg-white/40 hover:border-maroon-300"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "p-2 rounded-xl text-white shadow-sm",
                      billingPlan === "dues_split" ? "bg-maroon-700" : "bg-maroon-300"
                    )}>
                      <Percent className="h-5 w-5" />
                    </span>
                    {billingPlan === "dues_split" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-maroon-800 bg-maroon-100 px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-maroon-900">Transactional Dues Split</h3>
                  <p className="mt-1 text-xs text-maroon-700 leading-normal flex-grow">
                    Let Greekstack handle dues collection, budgeting, and parent billings. Automated text alerts keep collections high.
                  </p>
                  <div className="mt-4 pt-3 border-t border-maroon-100 w-full flex items-baseline gap-1">
                    <span className="text-2xl font-black text-maroon-900">1.5%</span>
                    <span className="text-xs text-maroon-600 font-semibold">per transaction</span>
                  </div>
                  <div className="mt-2 text-[10px] text-maroon-500 font-medium">
                    No set-up fees · Unlimited members · Free support
                  </div>
                </button>

                {/* Option 2: Flat Semester */}
                <button
                  type="button"
                  onClick={() => setBillingPlan("flat_subscription")}
                  className={cn(
                    "relative flex flex-col text-left p-5 rounded-2xl border transition-all duration-200 outline-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] min-h-[220px]",
                    billingPlan === "flat_subscription"
                      ? "border-maroon-700 bg-maroon-50/40 ring-1 ring-maroon-700 shadow-sm"
                      : "border-maroon-100 bg-white/40 hover:border-maroon-300"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "p-2 rounded-xl text-white shadow-sm",
                      billingPlan === "flat_subscription" ? "bg-maroon-700" : "bg-maroon-300"
                    )}>
                      <CreditCard className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-maroon-900">Flat Semester Subscription</h3>
                  <p className="mt-1 text-xs text-maroon-700 leading-normal flex-grow">
                    Simple flat pricing per active semester. Collect dues manually or using your own system. Full portal access.
                  </p>
                  <div className="mt-4 pt-3 border-t border-maroon-100 w-full flex items-baseline gap-1">
                    <span className="text-2xl font-black text-maroon-900">$299</span>
                    <span className="text-xs text-maroon-600 font-semibold">per semester</span>
                  </div>
                  <div className="mt-2 text-[10px] text-maroon-500 font-medium">
                    Billed twice a year · Cancel anytime · Full software access
                  </div>
                </button>
              </div>

              {/* Table of features comparison to make it feel premium and finished */}
              <div className="mt-6 rounded-xl border border-maroon-100 bg-white/40 overflow-hidden text-xs">
                <div className="bg-maroon-50/50 p-2.5 font-semibold text-maroon-900 border-b border-maroon-100">
                  Plan Feature Breakdown
                </div>
                <div className="divide-y divide-maroon-100">
                  <div className="p-2.5 flex justify-between">
                    <span className="text-maroon-700 font-medium">Chapter Recruitment Portal</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Included on both plans</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="text-maroon-700 font-medium">Alumni & Parents Login</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Included on both plans</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="text-maroon-700 font-medium">Automated Dues Invoices & Reminders</span>
                    <span className="flex items-center gap-1">
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5"><Check className="h-3 w-3" /> Split Plan</span>
                      <span className="text-maroon-400">·</span>
                      <span className="text-maroon-600">Manual on Flat Plan</span>
                    </span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="text-maroon-700 font-medium">Parent Co-Signer Invoicing</span>
                    <span className="flex items-center gap-1">
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5"><Check className="h-3 w-3" /> Split Plan</span>
                      <span className="text-maroon-400">·</span>
                      <span className="text-maroon-600">Manual on Flat Plan</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "launch" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> System is Configured Properly.
                </p>
                <p className="mt-1 text-sm text-emerald-800 leading-relaxed">
                  Your custom brand variables, contact endpoints, and initial administrator credentials are ready.
                  Upon activation, this page will lock and redirect you to the management dashboard.
                </p>
              </div>

              <div className="rounded-xl border border-maroon-100 p-4 bg-white/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-maroon-900">Summary Verification</h3>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div><span className="text-maroon-600">Chapter Name:</span> <span className="font-semibold text-maroon-900">{fraternityName} {greekLetters}</span></div>
                  <div><span className="text-maroon-600">School:</span> <span className="font-semibold text-maroon-900">{schoolName} ({schoolShort})</span></div>
                  <div><span className="text-maroon-600">Admin Email:</span> <span className="font-semibold text-maroon-900">{adminEmail}</span></div>
                  <div><span className="text-maroon-600">Primary Color:</span> <span className="font-mono font-semibold" style={{ color: primaryColor }}>{primaryColor}</span></div>
                  <div><span className="text-maroon-600">Billing Plan:</span> <span className="font-semibold text-maroon-950">{billingPlan === "dues_split" ? "Transactional Dues Split (1.5%)" : "Flat Semester Subscription ($299/sem)"}</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-maroon-100" />

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={goPrev}
              disabled={stepIndex === 0 || busy}
              className="text-maroon-700 hover:text-maroon-900 hover:bg-maroon-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            
            {!isLastStep ? (
              <Button
                onClick={goNext}
                className="bg-maroon-700 hover:bg-maroon-800 text-white shadow-sm flex items-center"
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleLaunch}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Rocket className="h-4 w-4 mr-1.5" />}
                Activate Portal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WField({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = React.useId();
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-block text-maroon-900 font-semibold text-sm">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white/70 border-maroon-200 focus:border-maroon-700 text-maroon-900"
      />
    </div>
  );
}

function WColor({
  label, value, onChange, fallback,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fallback: string;
}) {
  const id = React.useId();
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-block text-maroon-900 font-semibold text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded-lg border border-maroon-200 cursor-pointer p-0.5 bg-white shadow-sm"
          aria-label={`${label} Color Picker`}
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          className="font-mono bg-white/70 border-maroon-200 focus:border-maroon-700 text-maroon-900"
        />
      </div>
    </div>
  );
}
