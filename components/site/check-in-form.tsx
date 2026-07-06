"use client";

/**
 * CheckInForm — the public rush-event check-in widget (rush-cycle feature 2).
 *
 * Two-stage, low-friction flow:
 *   1. Phone first. A returning PNM types their number and is checked in
 *      instantly (the API matches them by phone).
 *   2. If the number isn't recognized, the form expands to the full new-PNM
 *      fields (name, email, major, year, hometown) + a TCPA consent checkbox,
 *      and submitting creates their Rush record so they appear in the chapter's
 *      recruitment pipeline / Kanban immediately.
 *
 * POSTs to /api/check-in/{code}. Fully client-side state; the success screen is
 * the terminal state so a phone left on the table can't double-submit.
 */

import * as React from "react";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";

type Props = { code: string; orgName: string };

type Result = { ok: true; isNewPnm: boolean; name: string; eventName: string };

export function CheckInForm({ code, orgName }: Props) {
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [major, setMajor] = React.useState("");
  const [year, setYear] = React.useState("");
  const [hometown, setHometown] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  const [expanded, setExpanded] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<Result | null>(null);

  // Move focus to the success heading when the terminal screen renders so a
  // keyboard/screen-reader user is taken to the confirmation rather than being
  // stranded on the (now-unmounted) form. The heading is tabIndex={-1} so it can
  // receive programmatic focus without entering the tab order.
  const successHeadingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    if (done) successHeadingRef.current?.focus();
  }, [done]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/check-in/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, email, major, year, hometown, consent }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDone(data as Result);
        return;
      }
      // The API tells us when it needs the full form (unknown number).
      if (data.needsForm) {
        setExpanded(true);
        setError(null);
        return;
      }
      setError(data.error || "Something went wrong. Try again.");
    } catch {
      setError("Network error - check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 ref={successHeadingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          {done.isNewPnm ? `Welcome, ${firstName(done.name)}!` : `You're in, ${firstName(done.name)}.`}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {done.isNewPnm ? (
            <>
              You&apos;re checked in to <strong>{done.eventName}</strong> and on{" "}
              {orgName}&apos;s recruitment list. The chapter will be in touch about
              what&apos;s next.
            </>
          ) : (
            <>
              Checked in to <strong>{done.eventName}</strong>. Great to see you
              back - enjoy the event.
            </>
          )}
        </p>
        <p className="mt-5 text-xs text-muted-foreground">
          You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-5 sm:p-6 space-y-4">
      <div>
        <label htmlFor="ci-phone" className="mb-1 block text-sm font-medium">
          Phone number
        </label>
        <input
          id="ci-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(803) 555-0142"
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50"
        />
        {!expanded && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Been to an event before? Your number is all we need.
          </p>
        )}
      </div>

      {expanded && (
        <div className="space-y-4 rounded-xl border border-dashed border-phisig-red/30 bg-phisig-red/[0.03] p-4">
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 leading-relaxed">
            Your phone number wasn&apos;t found in our recruitment database. Please complete the quick form below to register and check in.
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-phisig-red">
            <UserPlus className="h-3.5 w-3.5" /> New here - tell us about you
          </p>
          <div>
            <label htmlFor="ci-name" className="mb-1 block text-sm font-medium">
              Full name
            </label>
            <input
              id="ci-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Jordan Reyes"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50"
            />
          </div>
          <div>
            <label htmlFor="ci-email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="ci-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@school.edu"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ci-major" className="mb-1 block text-sm font-medium">
                Major
              </label>
              <input
                id="ci-major"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="Finance"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50"
              />
            </div>
            <div>
              <label htmlFor="ci-year" className="mb-1 block text-sm font-medium">
                Year
              </label>
              <select
                id="ci-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50"
              >
                <option value="">Select…</option>
                {["Freshman", "Sophomore", "Junior", "Senior", "Transfer", "Graduate"].map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="ci-home" className="mb-1 block text-sm font-medium">
              Hometown <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="ci-home"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
              placeholder="Charleston, SC"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50"
            />
          </div>
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={busy || !phone}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-phisig-red"
            />
            <span>
              I agree to receive recurring recruitment/rush text &amp; email messages
              from {orgName} (automated technology; msg &amp; data rates may apply; up
              to ~8 msgs/cycle). Reply STOP to opt out, HELP for help. Consent is not
              a condition of membership.
            </span>
          </label>
        </div>
      )}

      {error && (
        <p role="alert" aria-live="assertive" className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !phone || (expanded && !consent)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-phisig-red px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-phisig-red/90 disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Checking in…
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" /> {expanded ? "Join & check in" : "Check in"}
          </>
        )}
      </button>
    </form>
  );
}

function firstName(full: string): string {
  return (full || "").trim().split(/\s+/)[0] || full;
}

export default CheckInForm;
