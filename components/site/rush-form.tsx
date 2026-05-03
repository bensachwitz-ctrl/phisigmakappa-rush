"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Loader2,
  User, Mail, Phone, Sparkles, Send, Check,
  Camera, Upload, X as XIcon, ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FormData = {
  name: string;
  email: string;
  phone: string;
  about: string;
  headshotUrl: string;
};

const initial: FormData = {
  name: "", email: "", phone: "", about: "", headshotUrl: "",
};

const STEPS = [
  { id: "intro", label: "Start" },
  { id: "you", label: "Contact" },
  { id: "about", label: "About" },
  { id: "headshot", label: "Photo" },
  { id: "review", label: "Submit" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function RushForm() {
  const { push } = useToast();
  const [step, setStep] = React.useState<StepId>("intro");
  const [data, setData] = React.useState<FormData>(initial);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

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
    const i = stepIndex;
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].id);
  }

  function prev() {
    const i = stepIndex;
    if (i > 0) setStep(STEPS[i - 1].id);
  }

  async function submit() {
    setSubmitting(true);
    try {
      // Map "about" to backgroundInfo for the existing API
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        backgroundInfo: data.about,
        headshotUrl: data.headshotUrl,
      };
      const res = await fetch("/api/rush", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Submission failed");
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
    <Card className="overflow-hidden border-border/80 shadow-xl shadow-phisig-red/5 hover:shadow-2xl hover:shadow-phisig-red/10 transition-shadow duration-500">
      <div className="relative h-1 bg-secondary">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-phisig-red to-phisig-red-dark transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

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
          {step === "intro" && <IntroStep onStart={() => setStep("you")} />}
          {step === "you" && <ContactStep data={data} errors={errors} update={update} />}
          {step === "about" && <AboutStep data={data} update={update} />}
          {step === "headshot" && <HeadshotStep data={data} update={update} />}
          {step === "review" && <ReviewStep data={data} />}
        </div>

        {step !== "intro" && (
          <div className="mt-8 sm:mt-10 flex items-center justify-between gap-3 border-t border-border pt-5 sm:pt-6">
            <Button variant="ghost" onClick={prev} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step === "review" ? (
              <Button onClick={submit} disabled={submitting} size="lg" className="group">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <>Submit registration <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
                )}
              </Button>
            ) : (
              <Button onClick={next} size="lg" className="group">
                Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
    <div className="text-center py-4 sm:py-10">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-xl shadow-phisig-red/30 animate-float">
        <Sparkles className="h-7 w-7" />
      </div>
      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Sixty seconds. Three questions.
      </h3>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        Just your name, contact, and a quick intro. We'll handle the rest from there.
      </p>
      <div className="mt-8 flex items-center justify-center">
        <Button onClick={onStart} size="lg" className="group">
          Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
      <ul className="mt-10 grid sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
        {[
          { icon: User, label: "Contact info" },
          { icon: Sparkles, label: "Quick intro" },
          { icon: Camera, label: "Headshot" },
        ].map((s, i) => (
          <li
            key={s.label}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm hover:border-phisig-red/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
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

function ContactStep({
  data, errors, update,
}: {
  data: FormData;
  errors: Record<string, string>;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Header eyebrow="Step 1 of 3" title="How do we reach you?" sub="The basics — that's all we need." />
      <Field id="name" label="Full name" required error={errors.name} icon={User}>
        <Input
          id="name" autoComplete="name" autoFocus
          value={data.name} onChange={(e) => update("name", e.target.value)}
          placeholder="James Carter" className="pl-9"
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field id="email" label="Email" required error={errors.email} icon={Mail}>
          <Input
            id="email" type="email" autoComplete="email"
            value={data.email} onChange={(e) => update("email", e.target.value)}
            placeholder="you@email.sc.edu" className="pl-9"
          />
        </Field>
        <Field id="phone" label="Phone" required error={errors.phone} icon={Phone}>
          <Input
            id="phone" type="tel" inputMode="tel" autoComplete="tel"
            value={data.phone} onChange={(e) => update("phone", e.target.value)}
            placeholder="(803) 555-0142" className="pl-9"
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground bg-phisig-red-soft/50 border border-phisig-red/15 rounded-lg p-3">
        We assume you're a USC student. Brothers will fill in the rest from your social profiles —
        save you the typing.
      </p>
    </div>
  );
}

function AboutStep({
  data, update,
}: { data: FormData; update: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  return (
    <div className="space-y-5">
      <Header
        eyebrow="Step 2 of 3"
        title="Tell us about yourself"
        sub="A couple sentences in your own words. Skip if you'd rather not."
      />
      <Field id="about" label="A bit about you (optional)">
        <Textarea
          id="about" value={data.about}
          onChange={(e) => update("about", e.target.value)}
          placeholder="What you're studying, where you're from, what you're into, what you're looking for in a fraternity…"
          rows={6}
          className="text-base"
        />
      </Field>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
        {[
          "Major / year",
          "Hometown",
          "HS sports",
          "What you're into",
        ].map((p) => (
          <div key={p} className="rounded-md border border-dashed border-border px-2 py-1.5 text-center">
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadshotStep({
  data, update,
}: { data: FormData; update: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
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
      <Header eyebrow="Step 3 of 3" title="Headshot" sub="Helps brothers put a face to your name. Optional." />

      {data.headshotUrl ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <img
              src={data.headshotUrl} alt="Your headshot"
              className="h-44 w-44 rounded-full object-cover ring-4 ring-phisig-red/15 ring-offset-2 ring-offset-background shadow-lg animate-fade-in"
            />
            <button
              type="button" onClick={() => update("headshotUrl", "")}
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
            <Button variant="ghost" size="sm" onClick={() => update("headshotUrl", "")}>Remove</Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200",
            "flex flex-col items-center justify-center text-center px-6 py-12",
            drag ? "border-phisig-red bg-phisig-red-soft scale-[1.01]" : "border-border hover:border-phisig-red/40 hover:bg-phisig-red-soft/30",
            busy && "pointer-events-none opacity-60"
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-phisig-red-soft text-phisig-red mb-4">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
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
        On mobile, you can take a photo directly with your camera.
      </p>
    </div>
  );
}

function ReviewStep({ data }: { data: FormData }) {
  const lines = [
    { label: "Name", value: data.name || "—" },
    { label: "Email", value: data.email || "—" },
    { label: "Phone", value: data.phone || "—" },
  ];
  return (
    <div className="space-y-5">
      <Header eyebrow="Final step" title="Submit" sub="Make sure everything looks right." />
      <div className="rounded-xl border border-border bg-secondary/40 p-5">
        <div className="flex items-start gap-5">
          {data.headshotUrl ? (
            <img
              src={data.headshotUrl} alt=""
              className="h-20 w-20 rounded-full object-cover ring-2 ring-phisig-red/20 ring-offset-2 ring-offset-background shrink-0"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-secondary border-2 border-dashed border-border shrink-0 flex items-center justify-center text-muted-foreground">
              <Camera className="h-7 w-7" />
            </div>
          )}
          <dl className="flex-1 grid sm:grid-cols-3 gap-x-6 gap-y-2.5 text-sm">
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
      <p className="text-xs text-muted-foreground text-center">
        By submitting, you agree to receive event-related emails and texts. We'll never share your info.
      </p>
    </div>
  );
}

function SuccessCard({ data, onRestart }: { data: FormData; onRestart: () => void }) {
  const first = data.name.split(" ")[0] || "there";
  return (
    <Card className="border-phisig-red/30 overflow-hidden shadow-2xl shadow-phisig-red/10">
      <div className="h-1 bg-gradient-to-r from-phisig-red to-phisig-red-dark" />
      <CardContent className="py-12 px-6 text-center animate-fade-in">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-xl shadow-phisig-red/30">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          You're on the list, {first}.
        </h3>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto">
          Watch your email and texts — invitations are headed your way. Glad you took the first step.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="outline" onClick={onRestart}>Submit another</Button>
          <Button asChild className="group">
            <a href="#schedule">View schedule <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
  id, label, required, error, icon: Icon, children,
}: {
  id: string; label: string; required?: boolean; error?: string;
  icon?: React.ElementType; children: React.ReactNode;
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
      {error && <p className="mt-1 text-xs text-phisig-red animate-fade-in">{error}</p>}
    </div>
  );
}
