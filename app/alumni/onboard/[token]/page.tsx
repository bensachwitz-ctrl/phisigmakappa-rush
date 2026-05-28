"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, User, Mail, Lock, MapPin, Briefcase, Phone,
  CheckCircle, Calendar, Award, ShieldCheck, Loader2, XCircle, ArrowRight,
} from "lucide-react";

// R45 — Alumni portal onboarding redemption page.
//
// An alum lands here from a single-use invite link the chapter texted or
// emailed them. We validate the token (GET), pre-fill any details the
// chapter already had on file, and let them set a password + confirm
// consent in ONE streamlined screen (no multi-step wizard — they already
// proved intent by following the link). Single-use + 30-day expiry are
// enforced server-side; this page just renders the right state.

interface Prefill {
  fullName?: string;
  preferredName?: string;
  graduationYear?: number | string;
  pledgeClass?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  employer?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  bio?: string;
  optInDirectory?: boolean;
  optInNewsletter?: boolean;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "invalid"; reason: string }
  | { phase: "ready"; prefill: Prefill; invitedBy?: string | null };

export default function AlumniOnboardPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = String(params?.token || "");

  const [load, setLoad] = useState<LoadState>({ phase: "loading" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    preferredName: "",
    email: "",
    graduationYear: "",
    pledgeClass: "",
    phone: "",
    city: "",
    state: "",
    employer: "",
    jobTitle: "",
    linkedinUrl: "",
    bio: "",
    password: "",
    confirmPassword: "",
    optInDirectory: true,
    optInNewsletter: true,
    consent: false,
  });

  // Validate the invite + hydrate prefill on mount.
  useEffect(() => {
    if (!token) {
      setLoad({ phase: "invalid", reason: "not-found" });
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/alumni/onboard/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (!data.ok) {
          setLoad({ phase: "invalid", reason: data.reason || "not-found" });
          return;
        }
        const p: Prefill = data.prefill || {};
        setForm((f) => ({
          ...f,
          fullName: p.fullName ?? "",
          preferredName: p.preferredName ?? "",
          email: p.email ?? "",
          graduationYear: p.graduationYear != null ? String(p.graduationYear) : "",
          pledgeClass: p.pledgeClass ?? "",
          phone: p.phone ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          employer: p.employer ?? "",
          jobTitle: p.jobTitle ?? "",
          linkedinUrl: p.linkedinUrl ?? "",
          bio: p.bio ?? "",
          optInDirectory: p.optInDirectory !== false,
          optInNewsletter: p.optInNewsletter !== false,
        }));
        setLoad({ phase: "ready", prefill: p, invitedBy: data.invitedBy });
      } catch {
        if (active) setLoad({ phase: "invalid", reason: "network" });
      }
    })();
    return () => { active = false; };
  }, [token]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim()) return setError("Your full name is required.");
    if (!form.email.trim()) return setError("A valid email is required.");
    const yr = parseInt(form.graduationYear, 10);
    if (isNaN(yr) || yr < 1873 || yr > 2099) return setError("Please enter a valid graduation year.");
    if (!form.password || form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords don't match.");
    if (!form.consent) return setError("Please agree to the data-use terms to continue.");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/alumni/onboard/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, graduationYear: yr }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(data.redirectTo || "/portal/alumni/dashboard");
    } catch {
      setError("A connection error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (load.phase === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20 text-maroon-700">
          <Loader2 className="w-8 h-8 animate-spin mb-3" aria-hidden="true" />
          <p className="text-sm">Checking your invite…</p>
        </div>
      </Shell>
    );
  }

  // ── Invalid invite ───────────────────────────────────────────────────
  if (load.phase === "invalid") {
    const copy: Record<string, { title: string; body: string }> = {
      "not-found": { title: "Invite not found", body: "This link doesn't match an invite. Double-check the link the chapter sent you, or ask them to send a fresh one." },
      expired: { title: "This invite has expired", body: "Invite links are valid for 30 days. Reach out to the chapter's alumni chair for a new link." },
      revoked: { title: "This invite was revoked", body: "The chapter canceled this invite. Contact the alumni chair if you think this is a mistake." },
      completed: { title: "Account already created", body: "This invite was already used to create an account. You can sign in instead." },
      network: { title: "Connection problem", body: "We couldn't reach the server. Check your connection and refresh the page." },
    };
    const c = copy[load.reason] || copy["not-found"];
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-maroon-100 p-8 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-50 text-red-600 mb-4">
            <XCircle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-maroon-900 mb-2">{c.title}</h1>
          <p className="text-sm text-maroon-600 mb-6 max-w-sm mx-auto">{c.body}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal/alumni">
              <Button className="bg-maroon-700 hover:bg-maroon-800 text-cream-50 w-full sm:w-auto">Sign in</Button>
            </Link>
            <Link href="/alumni/join">
              <Button className="bg-cream-100 hover:bg-cream-200 text-maroon-900 border border-maroon-200 w-full sm:w-auto">Request access</Button>
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Ready: onboarding form ───────────────────────────────────────────
  return (
    <Shell>
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500 text-cream-50 mb-3 shadow-sm">
          <GraduationCap className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-maroon-900">Welcome back, brother.</h1>
        <p className="text-sm text-maroon-600 mt-1">
          {load.invitedBy ? `${load.invitedBy} invited you to ` : "You've been invited to "}
          create your alumni portal account. Most of your details are pre-filled — just set a password and confirm.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-maroon-100 p-6 sm:p-8 shadow-sm space-y-5">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name *" icon={User}>
            <input name="fullName" value={form.fullName} onChange={onChange} required autoComplete="name"
              className={inputCls} placeholder="John Doe" />
          </Field>
          <Field label="Preferred Name" icon={User}>
            <input name="preferredName" value={form.preferredName} onChange={onChange}
              className={inputCls} placeholder="Johnny" />
          </Field>
        </div>

        <Field label="Email *" icon={Mail}>
          <input type="email" name="email" value={form.email} onChange={onChange} required autoComplete="email" inputMode="email"
            className={inputCls} placeholder="john.doe@example.com" />
        </Field>

        {/* Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Password *" icon={Lock}>
            <input type="password" name="password" value={form.password} onChange={onChange} required minLength={8} autoComplete="new-password"
              className={inputCls} placeholder="••••••••" />
          </Field>
          <Field label="Confirm Password *" icon={Lock}>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={onChange} required minLength={8} autoComplete="new-password"
              className={inputCls} placeholder="••••••••" />
          </Field>
        </div>
        <p className="text-[10px] text-maroon-500 -mt-2">At least 8 characters.</p>

        {/* Chapter history */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Graduation Year *" icon={Calendar}>
            <input type="number" name="graduationYear" value={form.graduationYear} onChange={onChange} required min={1873} max={2099}
              className={inputCls} placeholder="2018" />
          </Field>
          <Field label="Pledge Class" icon={Award}>
            <input name="pledgeClass" value={form.pledgeClass} onChange={onChange}
              className={inputCls} placeholder="Fall 2014" />
          </Field>
        </div>

        {/* Contact + professional (optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="City" icon={MapPin}>
            <input name="city" value={form.city} onChange={onChange} className={inputCls} placeholder="Charlotte" />
          </Field>
          <Field label="State" icon={MapPin}>
            <input name="state" value={form.state} onChange={onChange} className={inputCls} placeholder="NC" />
          </Field>
          <Field label="Employer" icon={Briefcase}>
            <input name="employer" value={form.employer} onChange={onChange} className={inputCls} placeholder="Company" />
          </Field>
          <Field label="Job Title" icon={Briefcase}>
            <input name="jobTitle" value={form.jobTitle} onChange={onChange} className={inputCls} placeholder="Engineer" />
          </Field>
          <Field label="Phone" icon={Phone}>
            <input name="phone" value={form.phone} onChange={onChange} className={inputCls} placeholder="555-0199" inputMode="tel" />
          </Field>
          <Field label="LinkedIn URL" icon={Briefcase}>
            <input name="linkedinUrl" value={form.linkedinUrl} onChange={onChange} className={inputCls} placeholder="linkedin.com/in/…" />
          </Field>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">Short bio (optional)</label>
          <textarea name="bio" value={form.bio} onChange={onChange} rows={3} className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
            placeholder="Class of 2018, in tech, happy to mentor brothers and PNMs about careers." />
        </div>

        {/* Consent block — compliance */}
        <div className="rounded-xl border border-maroon-100 bg-cream-50/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-maroon-900">
            <ShieldCheck className="w-4 h-4 text-amber-700" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wide">Your privacy &amp; consent</span>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="optInDirectory" checked={form.optInDirectory} onChange={onChange}
              className="mt-0.5 h-4 w-4 rounded border-maroon-300 text-maroon-700 focus:ring-amber-500" />
            <span className="text-xs text-maroon-700">List me in the <strong>public alumni directory</strong> (name, grad year, city, employer — never my email or phone). You can change this anytime.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="optInNewsletter" checked={form.optInNewsletter} onChange={onChange}
              className="mt-0.5 h-4 w-4 rounded border-maroon-300 text-maroon-700 focus:ring-amber-500" />
            <span className="text-xs text-maroon-700">Email me chapter <strong>newsletters &amp; event invites</strong>.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} required
              className="mt-0.5 h-4 w-4 rounded border-maroon-300 text-maroon-700 focus:ring-amber-500" />
            <span className="text-xs text-maroon-700">
              <strong>Required:</strong> I understand the chapter will store the details I provide to run the alumni portal, and I agree to the{" "}
              <Link href="/privacy" target="_blank" className="underline text-maroon-900 hover:text-amber-700">privacy policy</Link>.
            </span>
          </label>
        </div>

        <Button type="submit" disabled={submitting}
          className="w-full bg-gradient-to-r from-amber-600 to-maroon-700 hover:from-amber-700 hover:to-maroon-800 text-cream-50 flex items-center justify-center gap-2 shadow-md min-h-[48px]">
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Creating your account…</>
          ) : (
            <><CheckCircle className="w-4 h-4" aria-hidden="true" /> Create my alumni account <ArrowRight className="w-4 h-4" aria-hidden="true" /></>
          )}
        </Button>
        <p className="text-center text-[11px] text-maroon-500">
          Already have an account? <Link href="/portal/alumni" className="underline text-maroon-800">Sign in</Link>
        </p>
      </form>
    </Shell>
  );
}

const inputCls =
  "w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900";

function Field({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 w-4 h-4 text-maroon-400" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-between">
      <div>
        <PublicNav />
        <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">{children}</main>
      </div>
      <PublicFooter />
    </div>
  );
}
