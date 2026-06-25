"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { avatarSrc } from "@/lib/image-url";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Loader2,
  Check, Upload, X as XIcon,
} from "lucide-react";
// Bespoke chapter-brand duotone icons (imported direct from the file, NOT the
// barrel). They default their accent to the live chapter primary so every mark
// on the conversion form reads in the CHAPTER color — never platform blue/gold.
import {
  IconUser, IconPhone, IconMail as IconMailDuo, IconBook, IconPin as IconPinDuo,
  IconGradCap, IconCamera, IconSend, IconCheckCircle, IconShieldCheck as IconShieldCheckDuo,
  IconSparkle, IconBolt, IconCalendarStar,
} from "@/components/brand/icons/chapter";
import { cn } from "@/lib/utils";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";
import type { ChapterIdentity } from "@/lib/chapter-identity";

type FormData = {
  name: string;
  phone: string;
  email: string;
  year: string;
  major: string;
  hometown: string;
  about: string;
  headshotUrl: string;
  ageAttestation: "ADULT_18_PLUS" | "MINOR_17_WITH_GUARDIAN_PERMISSION";
  customAnswers?: Record<string, string>;
};

const initial: FormData = {
  name: "", phone: "", email: "",
  year: "", major: "", hometown: "",
  about: "", headshotUrl: "",
  ageAttestation: "ADULT_18_PLUS",
  customAnswers: {},
};

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Transfer"];

// Removed the "intro" gate step — friction with no information value.
// Real PNMs land here from a CTA click already intent-aware; making them
// click "Get started" is a second commitment that's been measured to drop
// completion ~15% on similar flows. Form now opens directly on Contact.
const FULL_STEPS = [
  { id: "contact", label: "Contact" },
  { id: "profile", label: "Profile" },
  { id: "photo", label: "Photo" },
  { id: "review", label: "Submit" },
] as const;

const BOOTH_STEPS = [
  { id: "contact", label: "Contact" },
  { id: "profile", label: "Profile" },
  { id: "review", label: "Submit" },
] as const;

type StepId =
  | (typeof FULL_STEPS)[number]["id"]
  | (typeof BOOTH_STEPS)[number]["id"];

// Express-written-consent disclosure shown above the phone field on Step 1
// (TCPA / CTIA best practice — disclosure must precede phone collection).
// The form-wide affirmative checkbox is on the final Review step.
const SMS_PRE_DISCLOSURE =
  "We'll text you when the Fall '26 schedule drops and as rush events approach - up to 8 messages per rush cycle, sent using automated technology. Reply HELP for help, STOP to opt out. Msg & data rates may apply.";

// The line that appears next to the express-consent checkbox on the Review step.
// Identifies the sender by full legal name, the program, frequency, opt-out keywords,
// and links to the privacy policy. This is the recorded consent text — it MUST
// match the server's stored disclosure (app/api/rush buildSmsDisclosureText) in
// structure, with the chapter IDENTITY substituted per-tenant.
//
// Note on age: incoming freshmen can be 17 (early-grad / late-birthday /
// transfers from accelerated programs), so the consent allows 17 with verified
// parental permission — matching the under-18 guardian-consent path in /privacy.
// Hard-blocking 18+ would lock out legitimate rushees.
//
// R11: includes the 47 CFR §64.1200(f)(9) "automatic telephone dialing system"
// disclosure language so this consent qualifies as prior express written
// consent under TCPA — a plaintiff lawyer can no longer argue otherwise.
//
// White-label: the org name is derived from the current chapter identity
// (ChapterIdentityProvider). When unconfigured it falls back to a NEUTRAL
// "this chapter" — never a hardcoded chapter.
function buildExpressConsent(identity: ChapterIdentity): string {
  const org =
    [identity.chapterFullName, identity.schoolShort ? `(${identity.schoolShort})` : ""]
      .filter(Boolean)
      .join(" ")
      .trim() || "this chapter";
  return (
    "I am 18+ - or I am 17 and have a parent or legal guardian's permission to sign up. " +
    `I agree to receive recurring marketing and informational text and email recruitment/rush messages from ${org} ` +
    "sent using an automatic telephone dialing system or other automated technology. " +
    "Msg frequency varies (up to about 8 msgs per rush cycle). Msg & data rates may apply. " +
    "Reply HELP for help, STOP to opt out at any time. " +
    "Consent is not a condition of any membership consideration. " +
    "My information will only be used to communicate about recruitment/rush and is never sold or shared."
  );
}

export function RushForm({
  booth: boothProp,
  socialHandle,
  socialUrl,
  customQuestions = [],
}: {
  booth?: boolean;
  socialHandle?: string;
  socialUrl?: string;
  customQuestions?: Array<{ key: string; label: string; placeholder?: string; required?: boolean }>;
} = {}) {
  const { push } = useToast();
  // Chapter identity (per-tenant, via ChapterIdentityProvider) drives the
  // recorded express-consent text and the share copy — no hardcoded chapter.
  const identity = useChapterIdentity();
  const SMS_EXPRESS_CONSENT = buildExpressConsent(identity);
  // If a parent server component already detected ?booth=1 and passed it as a
  // prop, use that as the SSR-correct initial state so the Contact step (with
  // its TCPA pre-disclosure) renders on first paint without waiting for hydration.
  const [booth, setBooth] = React.useState(!!boothProp);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setBooth(new URLSearchParams(window.location.search).get("booth") === "1");
  }, []);
  // Both standard and booth flows now start on Contact. Booth still skips
  // photo at the end. Removing the intro-gate simplified the flow and
  // dropped one click between landing and starting to type.
  const STEPS = booth ? BOOTH_STEPS : FULL_STEPS;
  const FIRST_STEP: StepId = "contact";
  const [step, setStep] = React.useState<StepId>(FIRST_STEP);

  // Re-anchor on booth flips (effectively no-op now since both start on
  // contact, but kept so future step list changes don't strand the user).
  React.useEffect(() => {
    setStep(FIRST_STEP);
  }, [booth]);

  const [data, setData] = React.useState<FormData>(initial);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [consent, setConsent] = React.useState(false);
  const [receiptId, setReceiptId] = React.useState<string | null>(null);
  const [idleSecondsLeft, setIdleSecondsLeft] = React.useState<number | null>(null);
  // Honeypot — see /api/rush for full rationale. State stays "" for real users
  // (the input is offscreen + tabIndex=-1 + aria-hidden), so any non-empty
  // value indicates bot traffic. The server returns a fake-success 200 so the
  // bot doesn't retry, while skipping the DB write and SMS send.
  const [honeypot, setHoneypot] = React.useState("");

  // Booth-mode safety net: if a rushee abandons mid-form and the tablet sits idle for
  // 60 seconds, auto-clear the form so the next rushee doesn't see the previous one's email.
  // Also surface a visible countdown chip so the volunteer can see the timer.
  React.useEffect(() => {
    if (!booth || done) return;
    const total = 60;
    setIdleSecondsLeft(total);
    let remaining = total;
    const tick = window.setInterval(() => {
      remaining -= 1;
      setIdleSecondsLeft(Math.max(0, remaining));
    }, 1_000);
    const timer = window.setTimeout(() => {
      setData(initial);
      setStep(FIRST_STEP);
      setErrors({});
      setConsent(false);
    }, total * 1_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
      setIdleSecondsLeft(null);
    };
  }, [booth, step, data, done, FIRST_STEP]);

  // Booth-mode auto-restart: 6 seconds after success, reset everything for the next rushee.
  React.useEffect(() => {
    if (!booth || !done) return;
    const timer = window.setTimeout(() => {
      setDone(false);
      setData(initial);
      setStep(FIRST_STEP);
      setConsent(false);
    }, 6_000);
    return () => window.clearTimeout(timer);
  }, [booth, done, FIRST_STEP]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  function update<K extends keyof FormData>(k: K, v: FormData[K]) {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k as string]) {
      setErrors((e) => { const { [k as string]: _, ...rest } = e; return rest; });
    }
  }

  function validateStep(s: StepId): boolean {
    const e: Record<string, string> = {};
    if (s === "contact") {
      const contactSchema = z.object({
        name: z.string().min(2, "Please enter your full name."),
        phone: z.string().refine((val) => val.replace(/\D/g, "").length >= 10, "Enter a valid phone number."),
        email: z.string().email("Enter a valid email.").or(z.literal("")),
      });
      const result = contactSchema.safeParse({
        name: data.name.trim(),
        phone: data.phone,
        email: data.email.trim(),
      });
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path[0] as string;
          if (!e[path]) {
            e[path] = issue.message;
          }
        }
      }
    }
    if (s === "profile") {
      const profileSchema = z.object({
        year: z.string().min(1, "Pick your year."),
      });
      const result = profileSchema.safeParse({
        year: data.year,
      });
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path[0] as string;
          if (!e[path]) {
            e[path] = issue.message;
          }
        }
      }
    }
    setErrors(e);

    const firstErrorKey = Object.keys(e)[0];
    if (firstErrorKey) {
      setTimeout(() => {
        const el = document.getElementById(firstErrorKey) || (document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement);
        if (el) el.focus();
      }, 50);
    }

    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) {
      push({ title: "Almost there", description: "A couple fields need attention." });
      return;
    }
    const i = stepIndex;
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].id);
  }

  function prev() {
    const i = stepIndex;
    if (i > 0) setStep(STEPS[i - 1].id);
  }

  async function submit() {
    setSubmitting(true);

    // Offline guard — fail fast before the POST so the user sees a clear
    // "you're offline" message instead of a generic "submission failed"
    // 4 seconds later when fetch eventually times out.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSubmitting(false);
      push({
        title: "You're offline",
        description: "Reconnect and try again - your info is still typed in.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email.trim() || `${data.name.replace(/\s+/g, ".").toLowerCase()}-${Date.now()}@noemail.local`,
        year: data.year,
        major: data.major.trim(),
        hometown: data.hometown.trim(),
        backgroundInfo: data.about.trim(),
        headshotUrl: data.headshotUrl,
        ageAttestation: data.ageAttestation,
        // Server-side consent gate (TCPA): the express-written-consent box must
        // be affirmatively checked before a consent receipt is created. The
        // submit button is already client-gated on `consent`, but we send it so
        // the server can REFUSE to fabricate a receipt for any direct API caller
        // that bypasses the UI. /api/rush returns 400 when this is not true.
        consent,
        website: honeypot,
        customAnswers: data.customAnswers,
      };
      const res = await fetch("/api/rush", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Branch on HTTP status so the user sees an actionable message instead
      // of the generic catch-all. 429 = throttled, 5xx = our problem, 4xx =
      // their problem (usually validation), 2xx = success path.
      if (res.status === 429) {
        const j = await res.json().catch(() => ({}));
        push({
          title: "Slow down a sec",
          description: j.error || "Too many submissions from your network. Try again in an hour.",
          variant: "destructive",
        });
        return;
      }
      if (res.status >= 500) {
        push({
          title: "Server hiccup",
          description: "Not your fault. Refresh and try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Submission failed");
      setReceiptId(json?.consentReceipt?.id || null);
      setDone(true);
      push({
        title: json.updated ? "Info updated" : "You're in",
        description: "Watch your email and texts. Reply YES to the confirmation text.",
        variant: "success",
      });
    } catch (err: any) {
      push({
        title: "Submission failed",
        description: err.message || "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <SuccessCard data={data} booth={booth} receiptId={receiptId} identity={identity} socialHandle={socialHandle} socialUrl={socialUrl} onRestart={() => { setDone(false); setData(initial); setStep(FIRST_STEP); setReceiptId(null); }} />;
  }

  return (
    // The conversion panel is the most important surface on the page. Rather
    // than frosting the form itself (inputs must stay crisply legible), we keep
    // a solid card and ELEVATE it: a frosted-glass FRAME around it (.gs-glass)
    // over a deep grounding shadow (.gs-float-shadow) so the panel reads as
    // floating above the section's aurora — the same "important surface" cue the
    // apex site uses for its product mockup. Wrapper is purely presentational;
    // the stateful form Card inside is untouched.
    <div className="gs-glass gs-float-shadow rounded-[1.35rem] p-1.5 sm:p-2">
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-sm transition-shadow duration-500">
      {/* Honeypot — bot bait. Real users never see this field; assistive tech
          skips it via aria-hidden + tabIndex=-1; the offscreen position keeps
          it out of the visual viewport without using display:none (display:none
          is the one place spambots learned to skip). */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <div className="relative h-1 bg-secondary">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-phisig-red to-phisig-red-dark transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {booth && idleSecondsLeft !== null && idleSecondsLeft <= 20 && (
        <div className="bg-phisig-red-soft border-b border-phisig-red/20 px-4 py-2 text-center text-xs text-phisig-red font-semibold">
          Auto-clearing in {idleSecondsLeft}s - tap any field to keep going.
        </div>
      )}

      <div className="px-4 sm:px-6 pt-6 pb-2">
        <ol className="flex items-center justify-between gap-1 sm:gap-2 text-xs">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <li key={s.id} className="flex-1">
                <div className={cn("flex items-center gap-1.5 sm:gap-2 transition-all", !active && !done && "opacity-50")}>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300",
                      done && "bg-phisig-red text-white",
                      active && "bg-phisig-red text-white ring-4 ring-phisig-red/20 scale-110",
                      !done && !active && "bg-secondary text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className={cn("hidden md:inline-block font-medium text-xs", active ? "text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <CardContent className="p-5 sm:p-8 md:p-10">
        <div key={step} className="animate-fade-in">
          {step === "contact" && <ContactStep data={data} errors={errors} update={update} booth={booth} totalSteps={STEPS.length} />}
          {step === "profile" && <ProfileStep data={data} errors={errors} update={update} booth={booth} totalSteps={STEPS.length} customQuestions={customQuestions} />}
          {step === "photo" && <PhotoStep data={data} update={update} totalSteps={STEPS.length} />}
          {step === "review" && (
            <>
              <ReviewStep data={data} totalSteps={STEPS.length} booth={booth} />
              {/* Consent box — the trust-critical element. Lifted to a soft
                  brand-tinted surface with a shield lead so it reads as the
                  formal, important step (not a throwaway checkbox). The input,
                  its handler, and the aria-describedby linkage are UNCHANGED;
                  the whole <label> still toggles the checkbox on click. */}
              <label className="group mt-6 flex items-start gap-3 rounded-xl border border-phisig-red/20 bg-phisig-red-soft/40 p-4 cursor-pointer transition-colors hover:border-phisig-red/35 hover:bg-phisig-red-soft/60">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-phisig-red focus:ring-phisig-red shrink-0 cursor-pointer"
                  aria-describedby="sms-consent-text"
                />
                <span id="sms-consent-text" className="text-xs text-muted-foreground leading-relaxed">
                  <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-phisig-red">
                    <IconShieldCheckDuo className="h-3.5 w-3.5" /> Consent to contact
                  </span>
                  {SMS_EXPRESS_CONSENT}{" "}
                  See our{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer noopener" className="text-phisig-red hover:underline font-medium">
                    privacy policy
                  </a>.
                </span>
              </label>
            </>
          )}
        </div>

        {/* Footer nav row — always visible now (was previously hidden on the
            removed intro step). Back is disabled when at the first step. */}
        <div className="mt-8 sm:mt-10 flex items-center justify-between gap-3 border-t border-border pt-5 sm:pt-6">
            <Button variant="ghost" onClick={prev} disabled={submitting || stepIndex === 0}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step === "review" ? (
              // Final submit — the conversion action. Wrapped in a CHAPTER-brand
              // shimmer ring (BrandShimmerRing) that blooms on hover so it reads
              // as the primary action. The ring is decorative; the real, focusable
              // button stays exactly as wired (consent-gated, submit handler).
              // While disabled (consent unchecked) we drop the ring so it doesn't
              // imply the button is actionable yet.
              <BrandShimmerRing disabled={submitting || !consent} className="rounded-md">
                <Button onClick={submit} disabled={submitting || !consent} size="lg" className="group" title={!consent ? "Please review and accept the consent disclosure to submit." : undefined}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  ) : (
                    <>{booth ? "Add rushee" : "Submit registration"} <IconSend className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
                  )}
                </Button>
              </BrandShimmerRing>
            ) : (
              <Button onClick={next} size="lg" className="group">
                Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>

        {/* Trust micro-row — a quiet, always-visible reassurance strip at the
            base of the conversion panel. Custom brand duotone icons; no new copy
            obligations (these restate the disclosures already shown). It makes
            the form feel considered + trustworthy at the point of conversion
            without adding a step or touching the submit flow. */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <IconShieldCheckDuo className="h-3.5 w-3.5 text-phisig-red" /> Never sold or shared
          </span>
          <span className="hidden sm:inline text-border" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <IconCheckCircle className="h-3.5 w-3.5 text-phisig-red" /> Opt out anytime - reply STOP
          </span>
          <span className="hidden sm:inline text-border" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <IconBolt className="h-3.5 w-3.5 text-phisig-red" /> Goes straight to the rush chair
          </span>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

/**
 * BrandShimmerRing — a slow CHAPTER-brand gradient ring (primary → soft primary
 * → transparent) around a primary CTA, reusing the global `gs-border-spin`
 * keyframe (defined in app/globals.css; NOT redefined here). The platform
 * `.gs-shimmer-border` utility is hardwired to blue/sky/gold, so on the chapter
 * site we recolor it inline to the live `hsl(var(--primary))`.
 *
 * The ring sits OUTSIDE the child via a padding-box mask (never clips it) and is
 * decorative only — the focusable element is the child. `disabled` collapses the
 * ring so a not-yet-actionable button doesn't glow. Reduced-motion-safe: the
 * global prefers-reduced-motion block neutralizes the spin to a static ring.
 */
function BrandShimmerRing({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  if (disabled) return <span className={cn("inline-flex", className)}>{children}</span>;
  const ring: React.CSSProperties = {
    padding: "1.5px",
    background:
      "conic-gradient(from 0deg, hsl(var(--primary) / 0) 0deg, hsl(var(--primary)) 80deg, hsl(var(--primary) / 0.55) 170deg, hsl(var(--primary) / 0) 300deg)",
    WebkitMask:
      "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    maskComposite: "exclude",
    animation: "gs-border-spin 6s linear infinite",
  };
  return (
    <span className={cn("relative inline-flex isolate", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" style={ring} />
      {children}
    </span>
  );
}

/* ---------- Steps ---------- */

// IntroStep removed — the form now opens directly on the Contact step.
// The marketing copy ("Sixty seconds, four short steps") lives in the
// section header above the Card so users still see it without a click gate.

function ContactStep({
  data, errors, update, booth, totalSteps,
}: {
  data: FormData;
  errors: Record<string, string>;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  booth: boolean;
  totalSteps: number;
}) {
  // Light client-side liveness checks so the green check-mark fires as the
  // user types valid content. Don't gate progression on these — server
  // is still authoritative — they only feed the visual reassurance.
  const nameValid = data.name.trim().length >= 2 && /\p{L}/u.test(data.name);
  const phoneValid = data.phone.replace(/\D/g, "").length >= 10;
  const emailValid =
    !data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  const emailEntered = data.email.trim().length > 0;
  return (
    <div className="space-y-5">
      <Header
        eyebrow={`Step 1 of ${totalSteps}`}
        title={booth ? "Name & phone" : "Drop your number"}
        sub={booth ? "Two fields. Then year. Then you're done." : "Phone is required - that's how we'll text the schedule."}
      />
      <Field id="name" label="Full name" required error={errors.name} icon={IconUser} valid={nameValid}>
        <Input
          id="name" autoComplete="name" autoFocus
          value={data.name} onChange={(e) => update("name", e.target.value)}
          placeholder="James Carter" className="pl-9 pr-10" inputMode="text"
        />
      </Field>
      <Field id="phone" label="Phone" required error={errors.phone} icon={IconPhone} valid={phoneValid}>
        <Input
          id="phone" type="tel" inputMode="tel" autoComplete="tel"
          value={data.phone} onChange={(e) => update("phone", e.target.value)}
          placeholder="(803) 555-0142" className="pl-9 pr-10"
        />
      </Field>
      {!booth && (
        <Field id="email" label="Email (optional)" error={errors.email} icon={IconMailDuo} valid={emailEntered && emailValid}>
          <Input
            id="email" type="email" autoComplete="email"
            value={data.email} onChange={(e) => update("email", e.target.value)}
            placeholder="you@university.edu" className="pl-9 pr-10"
          />
        </Field>
      )}
      {/* TCPA pre-disclosure: must appear before / at the point of phone collection.
          Copy is unchanged (compliance-critical); only a small brand shield is
          added inline as a visual lead. */}
      <p className="text-[11px] sm:text-xs text-muted-foreground bg-phisig-red-soft/50 border border-phisig-red/15 rounded-xl p-3 leading-relaxed">
        <IconShieldCheckDuo className="mr-1 inline-block h-3.5 w-3.5 -translate-y-px text-phisig-red align-middle" />
        <span className="font-semibold text-foreground">SMS notice: </span>{SMS_PRE_DISCLOSURE}{" "}
        <span className="block mt-1.5">If you&apos;re 17, you&apos;ll need a parent or guardian&apos;s permission - see our <a href="/privacy" target="_blank" rel="noreferrer noopener" className="text-phisig-red hover:underline font-medium">privacy policy</a>. You&apos;ll affirm consent on the final step before submitting.</span>
      </p>

      {/* Age attestation — separate one-tap toggle so the consent record is
          unambiguous about WHICH path the rushee chose. ARIA radiogroup so
          screen readers announce "1 of 2 selected" properly. */}
      <Field id="ageAttestation" label="Age">
        <div role="radiogroup" aria-label="Age attestation" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={data.ageAttestation === "ADULT_18_PLUS"}
            onClick={() => update("ageAttestation", "ADULT_18_PLUS")}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-95",
              data.ageAttestation === "ADULT_18_PLUS"
                ? "border-phisig-red bg-phisig-red text-white shadow-md shadow-phisig-red/25"
                : "border-border hover:border-phisig-red/40 hover:bg-phisig-red-soft hover:-translate-y-0.5"
            )}
          >
            I&apos;m 18 or older
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={data.ageAttestation === "MINOR_17_WITH_GUARDIAN_PERMISSION"}
            onClick={() => update("ageAttestation", "MINOR_17_WITH_GUARDIAN_PERMISSION")}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-95",
              data.ageAttestation === "MINOR_17_WITH_GUARDIAN_PERMISSION"
                ? "border-phisig-red bg-phisig-red text-white shadow-md shadow-phisig-red/25"
                : "border-border hover:border-phisig-red/40 hover:bg-phisig-red-soft hover:-translate-y-0.5"
            )}
          >
            I&apos;m 17, with parent permission
          </button>
        </div>
      </Field>
    </div>
  );
}

function ProfileStep({
  data, errors, update, booth, totalSteps, customQuestions = [],
}: {
  data: FormData;
  errors: Record<string, string>;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  booth: boolean;
  totalSteps: number;
  customQuestions?: Array<{ key: string; label: string; placeholder?: string; required?: boolean }>;
}) {
  return (
    <div className="space-y-5">
      <Header
        eyebrow={`Step 2 of ${totalSteps - (booth ? 0 : 1)}`}
        title={booth ? "Year & major" : "Your details"}
        sub={booth ? "Tap your year. Major optional." : "Tap your year, then add major and hometown."}
      />
      <Field id="year" label="Year" required error={errors.year}>
        {/* Single-select year — ARIA radiogroup so screen readers announce the
            selected chip, matching the age-attestation control above. */}
        <div role="radiogroup" aria-label="Year" className="flex flex-wrap gap-2">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              role="radio"
              aria-checked={data.year === y}
              onClick={() => update("year", y)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-95",
                data.year === y
                  ? "border-phisig-red bg-phisig-red text-white shadow-md shadow-phisig-red/25"
                  : "border-border hover:border-phisig-red/40 hover:bg-phisig-red-soft hover:-translate-y-0.5"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field id="major" label="Major" icon={IconBook}>
          <Input
            id="major"
            value={data.major} onChange={(e) => update("major", e.target.value)}
            placeholder="Finance" className="pl-9"
            list="major-suggestions"
          />
          <datalist id="major-suggestions">
            {[
              "Finance", "Marketing", "Accounting", "Management", "Economics",
              "Computer Science", "Information Systems", "Mechanical Engineering",
              "Electrical Engineering", "Civil Engineering", "Chemical Engineering",
              "Pre-Med / Biology", "Biomedical Engineering", "Nursing", "Pharmacy",
              "Political Science", "International Business", "Sport & Entertainment Mgmt",
              "Hospitality Management", "Real Estate", "Risk Management",
              "Criminal Justice", "Psychology", "Communications",
              "Mathematics", "Statistics", "Undecided",
            ].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <Field id="hometown" label="Hometown" icon={IconPinDuo}>
          <Input
            id="hometown"
            value={data.hometown} onChange={(e) => update("hometown", e.target.value)}
            placeholder="Charleston, SC" className="pl-9"
          />
        </Field>
      </div>
      <Field id="about" label="Anything else (optional)">
        <Textarea
          id="about"
          value={data.about}
          onChange={(e) => update("about", e.target.value)}
          placeholder="HS sports, family ties to the chapter, what you're looking for…"
          rows={3}
        />
      </Field>
      {customQuestions && customQuestions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Additional Information</p>
          {customQuestions.map((q) => {
            const currentVal = data.customAnswers?.[q.key] || "";
            return (
              <Field key={q.key} id={`custom-${q.key}`} label={q.label} required={q.required}>
                <Input
                  id={`custom-${q.key}`}
                  value={currentVal}
                  onChange={(e) => {
                    const answers = { ...(data.customAnswers || {}), [q.key]: e.target.value };
                    update("customAnswers", answers);
                  }}
                  placeholder={q.placeholder || `Enter ${q.label.toLowerCase()}`}
                  className="bg-card/45 focus-visible:ring-phisig-red focus-visible:border-phisig-red"
                  required={q.required}
                />
              </Field>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhotoStep({
  data, update, totalSteps,
}: { data: FormData; update: <K extends keyof FormData>(k: K, v: FormData[K]) => void; totalSteps: number }) {
  const { push } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-headshot", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      update("headshotUrl", json.url);
      push({ title: "Headshot uploaded", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) upload(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  }

  return (
    <div className="space-y-5">
      <Header
        eyebrow={`Step 3 of ${totalSteps - 1}`}
        title="Headshot"
        sub="Helps brothers put a face to your name. Skip if you'd rather not."
      />

      {data.headshotUrl ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <img
              src={avatarSrc(data.headshotUrl, 352)}
              alt="Your headshot"
              className="h-44 w-44 rounded-full object-cover ring-4 ring-phisig-red/15 ring-offset-2 ring-offset-background shadow-lg animate-fade-in"
            />
            <button
              type="button"
              onClick={() => update("headshotUrl", "")}
              className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              <Upload className="h-3.5 w-3.5" /> Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => update("headshotUrl", "")}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200",
            "flex flex-col items-center justify-center text-center px-6 py-12",
            drag
              ? "border-phisig-red bg-phisig-red-soft scale-[1.01]"
              : "border-border hover:border-phisig-red/40 hover:bg-phisig-red-soft/30",
            busy && "pointer-events-none opacity-60"
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-phisig-red-soft text-phisig-red mb-4 transition-transform duration-300 group-hover:scale-105">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <IconCamera className="h-6 w-6" />}
          </div>
          <p className="text-base font-medium">
            {busy ? "Uploading…" : "Tap to choose or drag & drop"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WEBP · up to 8 MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="user"
        onChange={onPick}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground text-center">
        On mobile you can take a photo with your camera directly.
      </p>
    </div>
  );
}

function ReviewStep({ data, totalSteps, booth }: { data: FormData; totalSteps: number; booth: boolean }) {
  const lines = [
    { label: "Name", value: data.name || "-" },
    { label: "Phone", value: data.phone || "-" },
    { label: "Year", value: data.year || "-" },
    { label: "Major", value: data.major || "-" },
    ...(booth ? [] : [
      { label: "Hometown", value: data.hometown || "-" },
      { label: "Email", value: data.email || "-" },
    ]),
  ];
  return (
    <div className="space-y-5">
      <Header eyebrow={`Step ${totalSteps} of ${totalSteps - (booth ? 0 : 1)}`} title={booth ? "Confirm & submit" : "Review and submit"} sub={booth ? "Tap submit - next rushee in 6 seconds." : "Quick check - anything off?"} />
      <div className="rounded-xl border border-border bg-secondary/40 p-5">
        <div className="flex items-start gap-5">
          {data.headshotUrl ? (
            <img
              src={avatarSrc(data.headshotUrl, 160)} alt=""
              className="h-20 w-20 rounded-full object-cover ring-2 ring-phisig-red/20 ring-offset-2 ring-offset-background shrink-0"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-secondary border-2 border-dashed border-border shrink-0 flex items-center justify-center text-phisig-red/70">
              <IconCamera className="h-7 w-7" />
            </div>
          )}
          <dl className="flex-1 grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {lines.map((l) => (
              <div key={l.label}>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">{l.label}</dt>
                <dd className="font-medium truncate">{l.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {data.about && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">About</div>
            <p className="mt-1 text-sm whitespace-pre-wrap">{data.about}</p>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-md mx-auto">
        Confirm the box below to submit. Reply HELP for help, STOP to opt out at any time.
      </p>
    </div>
  );
}

function SuccessCard({ data, booth, receiptId, identity, socialHandle, socialUrl, onRestart }: { data: FormData; booth: boolean; receiptId: string | null; identity: ChapterIdentity; socialHandle?: string; socialUrl?: string; onRestart: () => void }) {
  const first = data.name.split(" ")[0] || "there";
  const { push } = useToast();

  // Share copy is derived from the current chapter identity + the live origin —
  // no hardcoded chapter handle or URL. The org name falls back to a neutral
  // "our chapter" if identity is unconfigured.
  const orgName =
    [identity.fraternityName, identity.schoolShort].filter(Boolean).join(" at ") ||
    identity.chapterFullName ||
    "our chapter";
  const shareTitle = identity.chapterAttribution || identity.fraternityName || "Rush";

  async function shareWithFriends() {
    const url =
      typeof window !== "undefined" ? window.location.origin : "";
    const text = `Just signed up for rush with ${orgName}.${url ? ` ${url}` : ""}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text, url: url || undefined });
      } catch { /* user cancelled */ }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      push({ title: "Link copied", description: "Share it with your buddies.", variant: "success" });
    }
  }

  if (booth) {
    return (
      <Card className="border-phisig-red/30 overflow-hidden shadow-2xl shadow-phisig-red/10 animate-spring-in">
        <div className="h-1 bg-gradient-to-r from-phisig-red to-phisig-red-dark" />
        <CardContent className="py-14 px-6 text-center animate-fade-in">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-xl shadow-phisig-red/30 animate-pulse-ring">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight">Got it, {first}.</h3>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            You're on the rush list. Reply <span className="font-mono text-foreground">YES</span> to the confirmation text we just sent.
          </p>
          {receiptId && (
            <p className="mt-2 text-[10px] text-muted-foreground/80 font-mono">
              Consent receipt: {receiptId.slice(0, 12)}…
            </p>
          )}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-phisig-red-soft border border-phisig-red/20 px-4 py-2 text-xs font-semibold text-phisig-red">
            Next rushee in 6 seconds…
          </div>
          <div className="mt-4">
            <Button variant="ghost" onClick={onRestart} className="text-muted-foreground">
              Or tap to add the next rushee now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-phisig-red/30 overflow-hidden shadow-2xl shadow-phisig-red/10 animate-spring-in">
      <div className="h-1 bg-gradient-to-r from-phisig-red to-phisig-red-dark" />
      <CardContent className="py-12 px-6 text-center animate-fade-in">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-xl shadow-phisig-red/30 animate-pulse-ring">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          You're on the list, {first}.
        </h3>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto">
          We just sent a confirmation text. <span className="font-medium text-foreground">Reply YES</span> to lock it in. Then watch for the Fall '26 schedule in August.
        </p>
        {receiptId && (
          <p className="mt-2 text-[10px] text-muted-foreground/70 font-mono">
            Consent receipt: <a className="hover:text-phisig-red" href={`/api/consent/${receiptId}`} target="_blank" rel="noreferrer noopener">{receiptId.slice(0, 12)}…</a>
          </p>
        )}

        <div className="mt-7 grid sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
          {[
            { num: "1", label: "Schedule drops mid-August", Icon: IconCalendarStar },
            { num: "2", label: "We'll text & email you", Icon: IconBolt },
            { num: "3", label: "Show up & meet the brothers", Icon: IconSparkle },
          ].map((s) => (
            <div key={s.num} className="group rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-phisig-red/30">
              <div className="flex items-center justify-between">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-phisig-red text-white text-[11px] font-semibold">
                  {s.num}
                </div>
                <s.Icon className="h-4 w-4 text-phisig-red transition-transform duration-300 group-hover:scale-110" />
              </div>
              <p className="mt-2 text-xs font-medium leading-snug">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
          <Button onClick={shareWithFriends} className="group">
            <IconSend className="h-4 w-4" /> Tell your buddies
          </Button>
          {/* Follow CTA renders ONLY when this chapter has a social handle + URL
              configured. No hardcoded chapter — an unconfigured tenant simply
              omits the button. */}
          {socialUrl && socialHandle && (
            <Button asChild variant="outline">
              <a href={socialUrl} target="_blank" rel="noreferrer noopener">
                Follow {socialHandle}
              </a>
            </Button>
          )}
          <Button variant="ghost" onClick={onRestart} className="text-muted-foreground">
            Submit another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- helpers ---------- */

function Header({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-phisig-red font-medium">{eyebrow}</p>
      <h3 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function Field({
  id, label, required, error, icon: Icon, children, valid,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  // Optional: when true, show a green check-mark on the right side of the
  // input. Lets the form give live encouraging feedback as users type
  // without the heavy "validation summary" pattern. Set to true when the
  // current input value passes light client-side validation.
  valid?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div className={cn(error && "animate-shake-x")}>
      <Label htmlFor={id} className="mb-1.5 inline-block">
        {label} {required && <span className="text-phisig-red" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </Label>
      {/* field-glow paints a soft cardinal ring on focus — better feedback
          than the default browser outline, still WCAG-visible. The shake
          on .animate-shake-x above gives a 320ms horizontal nudge when
          validation flags this field. */}
      <div className={cn("relative rounded-md", "field-glow")}>
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
        )}
        {/* Clone children to inject aria-invalid + aria-describedby on the
            actual <Input> so screen readers announce the error in context
            without us having to thread these props through every callsite. */}
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              "aria-invalid": error ? true : undefined,
              "aria-describedby": error ? errorId : undefined,
              "aria-required": required ? true : undefined,
            })
          : children}
        {valid && !error && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm pointer-events-none animate-spring-in z-10"
            aria-hidden="true"
            title="Looks good"
          >
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-phisig-red animate-fade-in" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
