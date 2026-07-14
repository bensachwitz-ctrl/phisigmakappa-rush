"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { avatarSrc } from "@/lib/image-url";
import { IconSpinner as Loader2, IconUpload as Upload } from "@/components/brand/icons";
import { IconCheckCircle } from "@/components/brand/icons";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Grad"];
const MAJORS = [
  "Finance", "Marketing", "Accounting", "Management", "Economics",
  "Computer Science", "Engineering", "Biology", "Pre-Med", "Nursing",
  "Mass Comm", "Sport & Entertainment Mgmt", "Hospitality", "Public Health",
  "Political Science", "International Business", "Real Estate", "Other",
];

export function OnboardingForm({
  token,
  prefill,
}: {
  token: string;
  prefill: { name: string; email: string; phone: string };
}) {
  const { push } = useToast();
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  // Per-field inline validation messages (keyed by form field name). Shown under
  // the offending input so the invitee sees exactly what to fix, instead of only
  // a transient toast. Cleared per-field as the user edits.
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState({
    name: prefill.name,
    email: prefill.email,
    phone: prefill.phone,
    year: "",
    major: "",
    position: "",
    pledgeClass: "",
    bio: "",
    headshotUrl: "",
    password: "",
    confirmPassword: "",
    signatureName: prefill.name || "",
    agreedToHazingWaiver: false,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
    // Clear this field's inline error the moment the user starts correcting it.
    setErrors((e) => (e[k as string] ? { ...e, [k as string]: "" } : e));
  }

  // Stable id for a field's inline error line, so the input can point at it via
  // aria-describedby when errored (screen readers announce the message + tie it
  // to the field). Undefined when the field is clean so we never describe a field
  // by a message that isn't rendered.
  const errId = (name: string): string | undefined =>
    errors[name] ? `onb-err-${name}` : undefined;

  // Merge an optional static describedby (e.g. a help line) with the error id,
  // dropping falsy parts. Returns undefined when there's nothing to describe.
  const describedBy = (name: string, extra?: string): string | undefined =>
    [extra, errId(name)].filter(Boolean).join(" ") || undefined;

  // Inline error line rendered under a field. Returns null when the field is
  // clean so it never reserves space. Carries the id errId() points at.
  function FieldError({ name }: { name: string }) {
    if (!errors[name]) return null;
    return (
      <p id={`onb-err-${name}`} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
        {errors[name]}
      </p>
    );
  }

  async function uploadHeadshot(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-headshot", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error();
      set("headshotUrl", json.url);
    } catch {
      push({ title: "Headshot upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const onboardingSchema = z.object({
      name: z.string().min(1, "Full name is required"),
      signatureName: z.string().min(1, "Signature name is required"),
      agreedToHazingWaiver: z.literal(true, {
        errorMap: () => ({ message: "You must agree to the Zero-Tolerance Anti-Hazing Policy" }),
      }),
      // Password rule aligned with lib/otp validateNewPassword + the alumni
      // register flow: 8+ chars with at least one letter AND one number.
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[a-zA-Z]/, "Password must contain a letter")
        .regex(/[0-9]/, "Password must contain a number"),
      confirmPassword: z.string().min(8, "Confirm password is required"),
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

    const result = onboardingSchema.safeParse({
      name: form.name.trim(),
      signatureName: form.signatureName.trim(),
      agreedToHazingWaiver: form.agreedToHazingWaiver,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });

    if (!result.success) {
      // Surface EVERY failing field inline (not just the first), so the invitee
      // can fix them all at once, and still toast + focus the first one.
      const fieldErrors: Record<string, string> = {};
      for (const iss of result.error.issues) {
        const k = iss.path[0] as string;
        if (k && !fieldErrors[k]) fieldErrors[k] = iss.message;
      }
      setErrors(fieldErrors);

      const issue = result.error.issues[0];
      push({ title: issue.message, variant: "destructive" });

      const keyMap: Record<string, string> = {
        name: "onb-name",
        signatureName: "onb-sig-name",
        agreedToHazingWaiver: "onb-hazing-waiver",
        password: "onb-password",
        confirmPassword: "onb-confirm",
      };

      const elementId = keyMap[issue.path[0] as string] || (issue.path[0] as string);
      setTimeout(() => {
        const el = document.getElementById(elementId) || (document.querySelector(`[name="${elementId}"]`) as HTMLElement);
        if (el) el.focus();
      }, 50);
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      const res = await fetch(`/api/onboard/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Submit failed");
      setDone(true);
    } catch (err: any) {
      push({ title: err.message || "Submit failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const firstName = form.name.trim().split(/\s+/)[0];
    return (
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="p-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-4">
            <IconCheckCircle className="h-6 w-6" />
          </span>
          <h2 className="text-2xl font-semibold tracking-tight">You're in.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your profile is live in the chapter directory.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-white p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">Your sign-in</p>
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Username: </span>
              <span className="font-mono font-semibold">{firstName}</span>
            </p>
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">Password: </span>
              <span className="text-foreground">the one you just set</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Sign in any time at{" "}
              <a href="/admin/login" className="text-brand-red hover:underline font-medium">/admin/login</a>{" "}
              → choose <strong>Brother</strong> tab.
            </p>
          </div>
          <p className="mt-4 text-xs text-brand-red font-semibold tracking-[0.18em] uppercase">#DamnProud</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-7">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="onb-name" className="mb-1.5 inline-block">Full name *</Label>
            <Input id="onb-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Mark Laughery" required autoComplete="name" aria-invalid={!!errors.name} aria-describedby={describedBy("name")} />
            <FieldError name="name" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="onb-email" className="mb-1.5 inline-block">Email</Label>
              <Input id="onb-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@university.edu" autoComplete="email" inputMode="email" />
            </div>
            <div>
              <Label htmlFor="onb-phone" className="mb-1.5 inline-block">Phone</Label>
              <Input id="onb-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(803) 555-0142" autoComplete="tel" inputMode="tel" />
            </div>
          </div>

          <div role="group" aria-labelledby="onb-year-label">
            <span id="onb-year-label" className="mb-1.5 inline-block text-sm font-medium leading-none">Year</span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => set("year", y)}
                  aria-pressed={form.year === y}
                  className={
                    "min-h-[44px] rounded-full border px-3 py-1.5 text-sm transition " +
                    (form.year === y
                      ? "bg-brand-red text-white border-brand-red"
                      : "border-border bg-card text-muted-foreground hover:text-foreground")
                  }
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="onb-major" className="mb-1.5 inline-block">Major</Label>
              <Input id="onb-major" list="majors" value={form.major} onChange={(e) => set("major", e.target.value)} placeholder="Finance" />
              <datalist id="majors">
                {MAJORS.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <Label htmlFor="onb-pledge" className="mb-1.5 inline-block">Pledge class</Label>
              <Input id="onb-pledge" value={form.pledgeClass} onChange={(e) => set("pledgeClass", e.target.value)} placeholder="Alpha Phi" />
            </div>
          </div>

          <div>
            <Label htmlFor="onb-position" className="mb-1.5 inline-block">Position (optional)</Label>
            <Input id="onb-position" value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="President · VP · Treasurer · Rush Chair…" />
          </div>

          <div>
            <Label htmlFor="onb-headshot" className="mb-1.5 inline-block">Headshot (optional)</Label>
            <div className="flex items-center gap-3">
              {form.headshotUrl ? (
                <img src={avatarSrc(form.headshotUrl, 112)} alt="" className="h-14 w-14 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground" aria-hidden="true">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <label htmlFor="onb-headshot" className="cursor-pointer">
                <input
                  id="onb-headshot"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadHeadshot(f);
                  }}
                />
                <span className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-secondary">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
                  {form.headshotUrl ? "Replace photo" : "Upload photo"}
                </span>
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="onb-bio" className="mb-1.5 inline-block">Short bio (optional)</Label>
            <Textarea
              id="onb-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Hometown, interests, anything brothers should know."
            />
          </div>

          <div className="rounded-xl border border-brand-red/20 bg-brand-red-soft/30 p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">Set your sign-in</p>
              <p id="onb-pw-help" className="mt-1 text-xs text-muted-foreground">
                Your username will be your first name (<span className="font-mono">{(form.name.trim().split(/\s+/)[0]) || "yourFirstName"}</span>). Use at least 8 characters with a letter and a number - it's the only way back into your account.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="onb-password" className="mb-1.5 inline-block">Password *</Label>
                <Input
                  id="onb-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="At least 8 characters, with a letter and a number"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-describedby={describedBy("password", "onb-pw-help")}
                  aria-invalid={!!errors.password}
                />
                <FieldError name="password" />
              </div>
              <div>
                <Label htmlFor="onb-confirm" className="mb-1.5 inline-block">Confirm password *</Label>
                <Input
                  id="onb-confirm"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={describedBy("confirmPassword")}
                />
                <FieldError name="confirmPassword" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Zero-Tolerance Anti-Hazing Agreement</p>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Our national organization and our chapter strictly prohibit hazing in any form. New-member education is built around community, leadership, and chapter history - never humiliation, intimidation, or harm.
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="onb-hazing-waiver"
                checked={form.agreedToHazingWaiver}
                onCheckedChange={(checked) => set("agreedToHazingWaiver", checked === true)}
                className="mt-1 border-slate-300 data-[state=checked]:bg-brand-red data-[state=checked]:border-brand-red"
                aria-invalid={!!errors.agreedToHazingWaiver}
                aria-describedby={describedBy("agreedToHazingWaiver")}
              />
              <div className="flex-1">
                <Label htmlFor="onb-hazing-waiver" className="text-xs font-normal text-slate-600 leading-normal cursor-pointer select-none">
                  I agree to the Zero-Tolerance Anti-Hazing Policy and certify that my digital signature constitutes a binding acceptance of these terms.
                </Label>
                <FieldError name="agreedToHazingWaiver" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="onb-sig-name" className="text-xs font-semibold text-slate-700">Type full name to sign digitally:</Label>
              <Input
                id="onb-sig-name"
                value={form.signatureName}
                onChange={(e) => set("signatureName", e.target.value)}
                placeholder={prefill.name}
                required
                className="bg-white border-slate-300 font-medium"
                aria-invalid={!!errors.signatureName}
                aria-describedby={describedBy("signatureName")}
              />
              <FieldError name="signatureName" />
            </div>
          </div>

          <Button type="submit" disabled={busy || uploading} size="lg" className="w-full">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading photo…</> : "Complete my profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
