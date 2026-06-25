"use client";

/**
 * PortalForgotOtpFlow — the PHASE-3 "Forgot password?" OTP reset, inline.
 * ──────────────────────────────────────────────────────────────────────────
 * A self-contained 3-step flow that lives INSIDE the chapter login card so the
 * whole reset happens without leaving the sign-in screen (matching the owner's
 * screenshot): enter EMAIL → enter the emailed CODE → choose a NEW PASSWORD.
 *
 *   1. email   → POST /api/portal/reset/request  (neutral; no enumeration)
 *   2. code    → POST /api/portal/reset/verify    (issues a mustReset session)
 *   3. newpass → POST /api/portal/reset/complete   (clears mustReset → into app)
 *
 * Shared by the Brother and Alumni login pages (the only difference is `role`).
 * Classical chrome (Cinzel caps title, Cormorant subhead, gold focus ring,
 * gold "ENTER"-style CTA) + reduced-motion-safe. The honest neutral copy
 * ("If an account exists…") is whatever the server returns — this component
 * never fabricates a "sent" state.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";

type Step = "email" | "code" | "password" | "done";

export interface PortalForgotOtpFlowProps {
  role: "brother" | "alumni";
  /** Called when the user backs out to the sign-in form. */
  onBack: () => void;
  /** Where to send the member once the password is set. */
  dashboardHref: string;
}

const FIELD =
  "w-full pl-10 pr-4 py-2.5 bg-maroon-50 border border-maroon-200 rounded-xl focus:outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/30 text-sm text-maroon-900 transition";
const GOLD_CTA =
  "w-full min-h-[48px] bg-gradient-to-b from-cream-300 to-brand-secondary text-maroon-950 hover:from-cream-200 hover:to-cream-300 flex items-center justify-center gap-1.5 py-3 rounded-xl shadow-[0_8px_22px_-8px_rgba(168,120,15,0.6),inset_0_1px_0_0_rgba(255,255,255,0.5)] font-display font-bold uppercase tracking-[0.12em] transition";

export function PortalForgotOtpFlow({ role, onBack, dashboardHref }: PortalForgotOtpFlowProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function postJson(url: string, payload: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data } as { ok: boolean; data: any };
  }

  // STEP 1 — request the code. The server ALWAYS responds neutrally, so we
  // advance to the code step regardless of whether an account exists — this is
  // what prevents enumeration from the UI too.
  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const { ok, data } = await postJson("/api/portal/reset/request", { email, role });
      if (!ok && data?.error) {
        setError(data.error);
      } else {
        setNotice(data?.message || "If an account exists for that email, a reset code has been sent.");
        setStep("code");
      }
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // STEP 2 — verify the code → issues the mustReset session.
  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const { ok, data } = await postJson("/api/portal/reset/verify", { email, role, code });
      if (!ok) {
        setError(data?.error || "Invalid or expired code.");
      } else {
        setStep("password");
      }
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // STEP 3 — set the new password (authenticated by the mustReset session).
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // GATE-3 FIX 6: mirror the SERVER rule (lib/otp.ts validateNewPassword,
    // enforced by /api/portal/reset/complete) client-side so the user sees the
    // requirement BEFORE submit instead of a confusing post-submit rejection:
    // >= 8 chars AND at least one letter AND at least one number.
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError("Password must contain a letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain a number.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await postJson("/api/portal/reset/complete", { password, confirm });
      if (!ok) {
        setError(data?.error || "Could not update your password. Try again.");
      } else {
        setStep("done");
        setTimeout(() => {
          window.location.href = dashboardHref;
        }, 1200);
      }
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Step, { h: string; sub: string }> = {
    email: { h: "Reset Access", sub: "Enter your email and we'll send a one-time code" },
    code: { h: "Enter Your Code", sub: "Check your email for the 6-digit reset code" },
    password: { h: "Create New Password", sub: "Choose a strong password to secure your account" },
    done: { h: "All Set", sub: "Your password has been updated" },
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.06em] text-maroon-900">
          {titles[step].h}
        </h1>
        <p className="font-serif text-base italic text-maroon-600 mt-1.5">{titles[step].sub}</p>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
          {error}
        </div>
      )}
      {notice && step === "code" && (
        <div role="status" aria-live="polite" className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs text-center font-medium">
          {notice}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={submitEmail} className="space-y-4">
          <div>
            <label htmlFor="otp-email" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-maroon-400" aria-hidden />
              <input
                id="otp-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={FIELD}
              />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <Button type="submit" disabled={loading} className={GOLD_CTA}>
              {loading ? "Sending Code…" : "Send Code"}
            </Button>
            <BackButton onClick={onBack} label="Back to Sign In" />
          </div>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={submitCode} className="space-y-4">
          <div>
            <label htmlFor="otp-code" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
              6-Digit Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 w-4 h-4 text-maroon-400" aria-hidden />
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={8}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className={`${FIELD} tracking-[0.4em] font-mono text-center text-base`}
              />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <Button type="submit" disabled={loading} className={GOLD_CTA}>
              {loading ? "Verifying…" : "Verify Code"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError("");
                setNotice("");
                setCode("");
              }}
              className="w-full text-maroon-700 hover:text-maroon-900 text-[11px] font-medium underline underline-offset-2"
            >
              Use a different email
            </button>
            <BackButton onClick={onBack} label="Back to Sign In" />
          </div>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label htmlFor="otp-new" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-maroon-400" aria-hidden />
              <input
                id="otp-new"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ chars, with a letter & a number"
                aria-describedby="otp-new-hint"
                className={`${FIELD} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-pressed={showPw}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 inline-flex h-9 min-w-[44px] -translate-y-1/2 items-center justify-center rounded-md px-2 text-[11px] font-semibold text-maroon-600 hover:bg-maroon-50 hover:text-maroon-900 transition"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {/* GATE-3 FIX 6: surface the SERVER rule inline, BEFORE submit, so the
                requirement is never a surprise post-submit rejection. */}
            <p id="otp-new-hint" className="mt-1 text-[11px] text-maroon-500">
              At least 8 characters, including a letter and a number.
            </p>
          </div>
          <div>
            <label htmlFor="otp-confirm" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-maroon-400" aria-hidden />
              <input
                id="otp-confirm"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={FIELD}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className={GOLD_CTA}>
            {loading ? "Saving…" : "Set Password"}
          </Button>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-3 text-center">
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" aria-hidden />
            <span className="font-semibold">Password updated — signing you in…</span>
          </div>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-1.5 text-maroon-800 hover:text-maroon-900 hover:bg-cream-50 rounded-xl py-2 font-semibold text-xs transition"
    >
      <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
      {label}
    </button>
  );
}

export default PortalForgotOtpFlow;
