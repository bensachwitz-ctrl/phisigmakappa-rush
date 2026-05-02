"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  GraduationCap,
  Trophy,
  Sparkles,
  Send,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FormData = {
  name: string;
  email: string;
  phone: string;
  hometown: string;
  major: string;
  year: string;
  highSchoolInfo: string;
  backgroundInfo: string;
};

const initial: FormData = {
  name: "",
  email: "",
  phone: "",
  hometown: "",
  major: "",
  year: "",
  highSchoolInfo: "",
  backgroundInfo: "",
};

const STEPS = [
  { id: "intro", label: "Welcome" },
  { id: "you", label: "About you" },
  { id: "school", label: "School" },
  { id: "activities", label: "Activities" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function RushForm() {
  const { push } = useToast();
  const [step, setStep] = React.useState<StepId>("intro");
  const [data, setData] = React.useState<FormData>(initial);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [direction, setDirection] = React.useState<1 | -1>(1);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  function update<K extends keyof FormData>(k: K, v: FormData[K]) {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k as string]) {
      setErrors((e) => {
        const { [k as string]: _, ...rest } = e;
        return rest;
      });
    }
  }

  function validateStep(s: StepId): boolean {
    const e: Record<string, string> = {};
    if (s === "you") {
      if (data.name.trim().length < 2) e.name = "Please enter your full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Enter a valid email.";
      if (data.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid phone number.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) {
      push({ title: "Almost there", description: "A couple fields need attention." });
      return;
    }
    setDirection(1);
    const i = stepIndex;
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].id);
  }

  function prev() {
    setDirection(-1);
    const i = stepIndex;
    if (i > 0) setStep(STEPS[i - 1].id);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/rush", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Submission failed");
      }
      setDone(true);
      push({
        title: json.updated ? "Info updated" : "You're in",
        description: "Watch your email for what's next.",
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
    return <SuccessCard data={data} onRestart={() => { setDone(false); setData(initial); setStep("intro"); }} />;
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-lg shadow-phisig-red/5">
      {/* Progress bar */}
      <div className="relative h-1 bg-secondary">
        <div
          className="absolute inset-y-0 left-0 bg-phisig-red transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step pills */}
      <div className="px-6 pt-6 pb-2">
        <ol className="flex items-center justify-between gap-2 text-xs">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <li key={s.id} className="flex-1">
                <div
                  className={cn(
                    "flex items-center gap-2 transition-opacity",
                    !active && !done && "opacity-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                      done && "bg-phisig-red text-white",
                      active && "bg-phisig-red text-white ring-4 ring-phisig-red/15",
                      !done && !active && "bg-secondary text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden sm:inline-block font-medium",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <CardContent className="p-6 sm:p-10">
        <div
          key={step}
          className={cn(
            "animate-fade-in",
            direction === 1 ? "" : ""
          )}
        >
          {step === "intro" && <IntroStep onStart={() => { setDirection(1); setStep("you"); }} />}
          {step === "you" && (
            <AboutYouStep
              data={data}
              errors={errors}
              update={update}
            />
          )}
          {step === "school" && (
            <SchoolStep data={data} update={update} />
          )}
          {step === "activities" && (
            <ActivitiesStep data={data} update={update} />
          )}
          {step === "review" && <ReviewStep data={data} />}
        </div>

        {step !== "intro" && (
          <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button variant="ghost" onClick={prev} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step === "review" ? (
              <Button onClick={submit} disabled={submitting} size="lg">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    Submit registration <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={next} size="lg">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Steps ---------- */

function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-6 sm:py-10 animate-fade-in">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-lg shadow-phisig-red/30">
        <Sparkles className="h-7 w-7" />
      </div>
      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Welcome — let's get you registered.
      </h3>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        Four quick steps. Sixty seconds. We'll use your info to send you event
        invitations and keep you in the loop.
      </p>
      <div className="mt-8 flex items-center justify-center">
        <Button onClick={onStart} size="lg">
          Get started <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <ul className="mt-10 grid sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
        {[
          { icon: User, label: "Tell us about you" },
          { icon: GraduationCap, label: "School info" },
          { icon: Trophy, label: "Activities" },
        ].map((s, i) => (
          <li
            key={s.label}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-phisig-red-soft text-phisig-red">
              <s.icon className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium">
              <span className="text-phisig-red mr-1">{i + 1}.</span> {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AboutYouStep({
  data,
  errors,
  update,
}: {
  data: FormData;
  errors: Record<string, string>;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Header
        eyebrow="Step 1 of 4"
        title="About you"
        sub="The basics so we can reach out."
      />
      <Field id="name" label="Full name" required error={errors.name} icon={User}>
        <Input
          id="name"
          autoComplete="name"
          autoFocus
          value={data.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="James Carter"
          className="pl-9"
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field id="email" label="Email" required error={errors.email} icon={Mail}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@email.sc.edu"
            className="pl-9"
          />
        </Field>
        <Field id="phone" label="Phone" required error={errors.phone} icon={Phone}>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(803) 555-0142"
            className="pl-9"
          />
        </Field>
      </div>
    </div>
  );
}

function SchoolStep({
  data,
  update,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  const years = ["Freshman", "Sophomore", "Junior", "Senior", "Transfer"];
  return (
    <div className="space-y-5">
      <Header
        eyebrow="Step 2 of 4"
        title="At USC"
        sub="What are you studying and where are you from?"
      />
      <Field id="year" label="Year">
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => update("year", y)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                data.year === y
                  ? "border-phisig-red bg-phisig-red text-white shadow-sm shadow-phisig-red/20"
                  : "border-border hover:border-phisig-red/40 hover:bg-phisig-red-soft"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field id="major" label="Major" icon={GraduationCap}>
          <Input
            id="major"
            value={data.major}
            onChange={(e) => update("major", e.target.value)}
            placeholder="Finance"
            className="pl-9"
          />
        </Field>
        <Field id="hometown" label="Hometown">
          <Input
            id="hometown"
            value={data.hometown}
            onChange={(e) => update("hometown", e.target.value)}
            placeholder="Charleston, SC"
          />
        </Field>
      </div>
    </div>
  );
}

function ActivitiesStep({
  data,
  update,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Header
        eyebrow="Step 3 of 4"
        title="Activities & background"
        sub="Help us get to know you a little better."
      />
      <Field id="hs" label="High school sports & activities">
        <Textarea
          id="hs"
          value={data.highSchoolInfo}
          onChange={(e) => update("highSchoolInfo", e.target.value)}
          placeholder="Varsity football, NHS, Eagle Scout, student government…"
          rows={4}
        />
      </Field>
      <Field id="bg" label="Anything else we should know">
        <Textarea
          id="bg"
          value={data.backgroundInfo}
          onChange={(e) => update("backgroundInfo", e.target.value)}
          placeholder="Family ties to the chapter, interests, hobbies, what you're looking for in a fraternity…"
          rows={4}
        />
      </Field>
    </div>
  );
}

function ReviewStep({ data }: { data: FormData }) {
  const lines: { label: string; value: string }[] = [
    { label: "Name", value: data.name || "—" },
    { label: "Email", value: data.email || "—" },
    { label: "Phone", value: data.phone || "—" },
    { label: "Year", value: data.year || "—" },
    { label: "Major", value: data.major || "—" },
    { label: "Hometown", value: data.hometown || "—" },
  ];
  return (
    <div className="space-y-5">
      <Header
        eyebrow="Step 4 of 4"
        title="Review and submit"
        sub="Make sure everything looks right."
      />
      <div className="rounded-xl border border-border bg-secondary/40 p-5">
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {lines.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                {l.label}
              </dt>
              <dd className="font-medium truncate text-right">{l.value}</dd>
            </div>
          ))}
        </dl>
        {(data.highSchoolInfo || data.backgroundInfo) && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            {data.highSchoolInfo && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  HS sports & activities
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap">{data.highSchoolInfo}</p>
              </div>
            )}
            {data.backgroundInfo && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Other
                </div>
                <p className="mt-1 text-sm whitespace-pre-wrap">{data.backgroundInfo}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        By submitting, you agree to receive event-related emails. We'll never share your info.
      </p>
    </div>
  );
}

function SuccessCard({ data, onRestart }: { data: FormData; onRestart: () => void }) {
  const first = data.name.split(" ")[0] || "there";
  return (
    <Card className="border-phisig-red/30 overflow-hidden shadow-xl shadow-phisig-red/10">
      <div className="h-1 bg-phisig-red" />
      <CardContent className="py-12 px-6 text-center animate-fade-in">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-phisig-red text-white shadow-lg shadow-phisig-red/30">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          You're on the list, {first}.
        </h3>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto">
          Watch your email — invitations to upcoming events are headed your way.
          Glad you took the first step.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="outline" onClick={onRestart}>
            Submit another
          </Button>
          <Button asChild>
            <a href="#schedule">
              View schedule <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- helpers ---------- */

function Header({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-phisig-red font-medium">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-block">
        {label} {required && <span className="text-phisig-red">*</span>}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-phisig-red">{error}</p>}
    </div>
  );
}
