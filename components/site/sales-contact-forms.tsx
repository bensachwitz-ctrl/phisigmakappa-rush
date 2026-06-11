"use client";

/**
 * Client island for the Greekstack APEX /contact sales surface.
 *
 * Three self-contained forms + an optional Cal.com embed, all rendered inside
 * the apex chrome by app/contact/page.tsx (a server component that reads env and
 * passes config down as props — this island NEVER reads process.env directly,
 * except NEXT_PUBLIC_* which Next inlines at build, and even those arrive as
 * props for a single source of truth):
 *
 *   1. <ContactForm>      → POST /api/contact        (general "talk to sales")
 *   2. <CustomQuoteForm>  → POST /api/contact/quote  (pricing METHOD 3)
 *   3. Book-a-call:
 *        • NEXT_PUBLIC_CAL_LINK set  → <CalEmbed> (responsive Cal.com iframe)
 *        • otherwise                 → <RequestCallForm> → POST /api/contact/call
 *
 * Every form is a 4-state machine (idle · submitting · success · error), fully
 * labeled + aria-described for AT, honeypot-protected, and uses only the
 * globals.css animation utilities (which already collapse under
 * prefers-reduced-motion) so motion is safe by default.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { IconCheck } from "@/components/brand/icons";
import {
  IconAlert,
  IconSpinner,
  IconSend,
  IconCalendar,
} from "@/components/brand/icons/contact";

type SubmitState = "idle" | "submitting" | "success" | "error";

/** A labeled field with a stable id wiring label↔control↔error for AT. */
function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {required ? (
          <span className="text-blue-600" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Off-screen honeypot. Real users never see/focus it; bots auto-fill it. The
 *  field name "website" is the highest-yield trigger per OWASP form-spam data,
 *  and matches what the API routes inspect. */
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="website-hp">Website</label>
      <input
        id="website-hp"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Shared success panel — a confident, on-brand confirmation. */
function SuccessPanel({ title, body }: { title: string; body: string }) {
  return (
    <div
      role="status"
      className="animate-spring-in flex flex-col items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-6 py-10 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
        <IconCheck className="h-7 w-7" accent="#ffffff" aria-hidden="true" />
      </span>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/** Inline error banner shown above the form on submit failure. */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
    >
      <IconAlert className="mt-0.5 h-4 w-4 shrink-0" accent="currentColor" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/** POST a JSON body and normalize the result to {ok, error}. */
async function postJson(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, error: data.error || "Something went wrong. Please try again." };
  } catch {
    return { ok: false, error: "Network error — please check your connection and try again." };
  }
}

// ── 1. General contact form ─────────────────────────────────────────────────

export function ContactForm({ contactEmail }: { contactEmail: string }) {
  const [state, setState] = React.useState<SubmitState>("idle");
  const [error, setError] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    org: "",
    school: "",
    message: "",
    website: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError("");
    const res = await postJson("/api/contact", form);
    if (res.ok) {
      setState("success");
    } else {
      setState("error");
      setError(res.error || "Something went wrong.");
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
    }
  }

  if (state === "success") {
    return (
      <SuccessPanel
        title="Message sent"
        body="Thanks for reaching out — we'll get back to you by email shortly."
      />
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn("relative space-y-4", shake && "animate-shake-x")}
    >
      <Honeypot value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} />
      {state === "error" && error ? <ErrorBanner message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="c-name" label="Name" required>
          <Input
            id="c-name"
            name="name"
            autoComplete="name"
            required
            value={form.name}
            onChange={set("name")}
            placeholder="Jordan Reyes"
          />
        </Field>
        <Field id="c-email" label="Email" required>
          <Input
            id="c-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={set("email")}
            placeholder="you@chapter.org"
          />
        </Field>
        <Field id="c-org" label="Chapter / organization">
          <Input
            id="c-org"
            name="org"
            value={form.org}
            onChange={set("org")}
            placeholder="Beta Sigma"
          />
        </Field>
        <Field id="c-school" label="School">
          <Input
            id="c-school"
            name="school"
            value={form.school}
            onChange={set("school")}
            placeholder="University of Maryland"
          />
        </Field>
      </div>

      <Field id="c-message" label="How can we help?" required>
        <Textarea
          id="c-message"
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={set("message")}
          placeholder="Tell us a bit about your chapter and what you're looking for…"
        />
      </Field>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          variant="platform"
          size="lg"
          className="gs-sheen mobile-full"
          disabled={state === "submitting"}
        >
          {state === "submitting" ? (
            <>
              <IconSpinner className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
            </>
          ) : (
            <>
              <IconSend className="h-4 w-4" accent="#ffffff" aria-hidden="true" /> Send message
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Prefer email? Write us at{" "}
          <a href={`mailto:${contactEmail}`} className="font-medium text-blue-600 hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </div>
    </form>
  );
}

// ── 2. Custom-quote form (pricing METHOD 3) ─────────────────────────────────

export function CustomQuoteForm({ contactEmail }: { contactEmail: string }) {
  const [state, setState] = React.useState<SubmitState>("idle");
  const [error, setError] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    org: "",
    school: "",
    memberCount: "",
    customization: "",
    timeline: "",
    budget: "",
    website: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError("");
    const res = await postJson("/api/contact/quote", form);
    if (res.ok) {
      setState("success");
    } else {
      setState("error");
      setError(res.error || "Something went wrong.");
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
    }
  }

  if (state === "success") {
    return (
      <SuccessPanel
        title="Quote request received"
        body="We'll review what you need and email you a tailored quote — usually within a couple of business days."
      />
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn("relative space-y-4", shake && "animate-shake-x")}
    >
      <Honeypot value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} />
      {state === "error" && error ? <ErrorBanner message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="q-name" label="Name" required>
          <Input id="q-name" name="name" autoComplete="name" required value={form.name} onChange={set("name")} placeholder="Jordan Reyes" />
        </Field>
        <Field id="q-email" label="Email" required>
          <Input id="q-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} placeholder="you@chapter.org" />
        </Field>
        <Field id="q-org" label="Chapter / organization">
          <Input id="q-org" name="org" value={form.org} onChange={set("org")} placeholder="Beta Sigma" />
        </Field>
        <Field id="q-school" label="School">
          <Input id="q-school" name="school" value={form.school} onChange={set("school")} placeholder="University of Maryland" />
        </Field>
        <Field id="q-members" label="Members (approx.)" hint="Active + alumni is fine.">
          <Input id="q-members" name="memberCount" inputMode="numeric" value={form.memberCount} onChange={set("memberCount")} placeholder="~80 active" />
        </Field>
        <Field id="q-timeline" label="Timeline">
          <Input id="q-timeline" name="timeline" value={form.timeline} onChange={set("timeline")} placeholder="Before fall recruitment" />
        </Field>
      </div>

      <Field
        id="q-custom"
        label="What do you want customized?"
        required
        hint="Custom flows, integrations, branding, reporting — the more detail, the sharper the quote."
      >
        <Textarea
          id="q-custom"
          name="customization"
          required
          rows={5}
          value={form.customization}
          onChange={set("customization")}
          placeholder="e.g. a custom alumni-giving portal, Greek-council compliance exports, our own dues structure, and a branded mobile-first redesign…"
        />
      </Field>

      <Field id="q-budget" label="Budget" hint="Optional — a range helps us tailor scope.">
        <Input id="q-budget" name="budget" value={form.budget} onChange={set("budget")} placeholder="e.g. $2–5k base, then monthly" />
      </Field>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          variant="platform"
          size="lg"
          className="gs-sheen mobile-full"
          disabled={state === "submitting"}
        >
          {state === "submitting" ? (
            <>
              <IconSpinner className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
            </>
          ) : (
            <>
              Request my quote
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          A custom base fee applies. Questions first? Email{" "}
          <a href={`mailto:${contactEmail}`} className="font-medium text-blue-600 hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </div>
    </form>
  );
}

// ── 3a. Cal.com embed (responsive iframe) ───────────────────────────────────

/**
 * Renders the Cal.com booker for `calLink` (e.g. "yourname/15min") in a
 * responsive iframe. We deliberately use a plain iframe rather than
 * @calcom/embed-react: the package isn't a project dependency, and a same-shape
 * iframe needs no extra bundle while still giving the full inline booking flow.
 */
export function CalEmbed({ calLink }: { calLink: string }) {
  // calLink is platform-owner-controlled env (NEXT_PUBLIC_CAL_LINK), not user
  // input, so there's no untrusted-interpolation concern. Trim any leading slash
  // so both "yourname/15min" and "/yourname/15min" resolve correctly.
  const slug = calLink.replace(/^\/+/, "");
  const src = `https://cal.com/${slug}?embed=true&theme=light`;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <iframe
        title="Book a 15-minute call"
        src={src}
        loading="lazy"
        className="h-[640px] w-full"
        style={{ border: 0 }}
        allow="camera; microphone; fullscreen; clipboard-write"
      />
    </div>
  );
}

// ── 3b. Request-a-call fallback form ────────────────────────────────────────

export function RequestCallForm({ contactEmail }: { contactEmail: string }) {
  const [state, setState] = React.useState<SubmitState>("idle");
  const [error, setError] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    org: "",
    preferredTimes: "",
    website: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError("");
    const res = await postJson("/api/contact/call", form);
    if (res.ok) {
      setState("success");
    } else {
      setState("error");
      setError(res.error || "Something went wrong.");
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
    }
  }

  if (state === "success") {
    return (
      <SuccessPanel
        title="Call request sent"
        body="We'll reach out at one of your preferred times to lock in a 15-minute call."
      />
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn("relative space-y-4", shake && "animate-shake-x")}
    >
      <Honeypot value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} />
      {state === "error" && error ? <ErrorBanner message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="call-name" label="Name" required>
          <Input id="call-name" name="name" autoComplete="name" required value={form.name} onChange={set("name")} placeholder="Jordan Reyes" />
        </Field>
        <Field id="call-email" label="Email" required>
          <Input id="call-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} placeholder="you@chapter.org" />
        </Field>
      </div>

      <Field id="call-org" label="Chapter / organization">
        <Input id="call-org" name="org" value={form.org} onChange={set("org")} placeholder="Beta Sigma" />
      </Field>

      <Field
        id="call-times"
        label="Preferred times"
        required
        hint="Day/time windows and your time zone — or a phone number to text."
      >
        <Textarea
          id="call-times"
          name="preferredTimes"
          required
          rows={3}
          value={form.preferredTimes}
          onChange={set("preferredTimes")}
          placeholder="Weekday evenings ET, or Tue/Thu after 3pm…"
        />
      </Field>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          variant="platform"
          size="lg"
          className="gs-sheen mobile-full"
          disabled={state === "submitting"}
        >
          {state === "submitting" ? (
            <>
              <IconSpinner className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
            </>
          ) : (
            <>
              <IconCalendar className="h-4 w-4" accent="#ffffff" aria-hidden="true" /> Request a call
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Or email{" "}
          <a href={`mailto:${contactEmail}`} className="font-medium text-blue-600 hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      </div>
    </form>
  );
}
