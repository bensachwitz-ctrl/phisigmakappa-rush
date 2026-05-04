"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

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
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
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
    if (!form.name.trim()) {
      push({ title: "Full name is required", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      push({ title: "Pick a password at least 6 characters long", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      push({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
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
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="text-2xl font-semibold tracking-tight">You're in.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your profile is live in the chapter directory.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-white p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">Your sign-in</p>
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
              <a href="/admin/login" className="text-phisig-red hover:underline font-medium">/admin/login</a>{" "}
              → choose <strong>Brother</strong> tab.
            </p>
          </div>
          <p className="mt-4 text-xs text-phisig-red font-semibold tracking-[0.18em] uppercase">#DamnProud</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-7">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="mb-1.5 inline-block">Full name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Mark Laughery" required />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 inline-block">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="@email.sc.edu" />
            </div>
            <div>
              <Label className="mb-1.5 inline-block">Phone</Label>
              <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(803) 555-0142" />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 inline-block">Year</Label>
            <div className="flex flex-wrap gap-2">
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => set("year", y)}
                  className={
                    "rounded-full border px-3 py-1.5 text-sm transition " +
                    (form.year === y
                      ? "bg-phisig-red text-white border-phisig-red"
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
              <Label className="mb-1.5 inline-block">Major</Label>
              <Input list="majors" value={form.major} onChange={(e) => set("major", e.target.value)} placeholder="Finance" />
              <datalist id="majors">
                {MAJORS.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <Label className="mb-1.5 inline-block">Pledge class</Label>
              <Input value={form.pledgeClass} onChange={(e) => set("pledgeClass", e.target.value)} placeholder="Alpha Phi" />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 inline-block">Position (optional)</Label>
            <Input value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="President · VP · Treasurer · Rush Chair…" />
          </div>

          <div>
            <Label className="mb-1.5 inline-block">Headshot (optional)</Label>
            <div className="flex items-center gap-3">
              {form.headshotUrl ? (
                <img src={form.headshotUrl} alt="" className="h-14 w-14 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadHeadshot(f);
                  }}
                />
                <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-secondary">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {form.headshotUrl ? "Replace photo" : "Upload photo"}
                </span>
              </label>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 inline-block">Short bio (optional)</Label>
            <Textarea
              rows={3}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Hometown, interests, anything brothers should know."
            />
          </div>

          <div className="rounded-xl border border-phisig-red/20 bg-phisig-red-soft/30 p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-phisig-red">Set your sign-in</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your username will be your first name (<span className="font-mono">{(form.name.trim().split(/\s+/)[0]) || "yourFirstName"}</span>). Pick a password you'll remember — it's the only way back into your account.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 inline-block">Password *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <Label className="mb-1.5 inline-block">Confirm password *</Label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={busy} size="lg" className="w-full">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Complete my profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
