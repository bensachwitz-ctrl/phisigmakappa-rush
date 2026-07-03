"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { GreekstackWordmark } from "@/components/brand/greekstack-logo";
import { Loader2, Lock, ArrowLeft, User, KeyRound, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Mode = "brother" | "admin";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();

  const [mode, setMode] = React.useState<Mode>("admin");

  // Refs to the two mode radios so arrow-key navigation can MOVE focus to the
  // newly-checked radio (the WAI-ARIA radiogroup contract) — otherwise focus is
  // stranded on the old radio, which just became tabIndex={-1}.
  const brotherTabRef = React.useRef<HTMLButtonElement>(null);
  const adminTabRef = React.useRef<HTMLButtonElement>(null);
  function focusMode(next: Mode) {
    setMode(next);
    // Defer to the next frame so the radio is tabbable (tabIndex 0) before focus.
    requestAnimationFrame(() => {
      (next === "brother" ? brotherTabRef : adminTabRef).current?.focus();
    });
  }

  // Brother fields
  const [firstName, setFirstName] = React.useState("");
  const [brotherPw, setBrotherPw] = React.useState("");

  // Admin fields — username + password only (no personal name)
  const [adminUser, setAdminUser] = React.useState("");
  const [adminPw, setAdminPw] = React.useState("");

  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("gs_brother_name");
    // If we have a remembered brother name AND the user wasn't redirected from a
    // protected admin page, default to brother login. Otherwise stay in admin mode.
    const fromQuery = params.get("from");
    if (stored && !fromQuery) {
      setMode("brother");
      setFirstName(stored.split(" ")[0]);
    } else if (stored) {
      // Keep the name remembered for the brother tab even if admin is the default
      setFirstName(stored.split(" ")[0]);
    }
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body =
        mode === "admin"
          ? { mode: "admin", username: adminUser, password: adminPw }
          : { mode: "brother", firstName, password: brotherPw };
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        push({ title: j.error || "Login failed", variant: "destructive" });
        return;
      }
      try {
        if (mode === "brother") localStorage.setItem("gs_brother_name", j.brother?.name || firstName);
      } catch {}
      const from = params.get("from") || "/admin";
      router.push(from);
      router.refresh();
    } catch {
      push({ title: "Login failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
      {/* Brand wash — the same blue-tinted radial+linear field the marketing
          site paints, so the operator login reads as part of Greekstack rather
          than a bare gray form. Decorative + non-interactive. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(37,99,235,0.10),transparent_55%),linear-gradient(to_bottom,#f6f8fc_0%,#ffffff_34%,#eef4ff_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent"
      />

      <div className="container py-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to public site
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <GreekstackWordmark size="lg" className="justify-center" />
            {/* Cinzel inscriptional caps + Cormorant serif subhead — the classical
                brand voice carried onto the operator sign-in. */}
            <h1 className="mt-6 text-2xl font-bold uppercase tracking-[0.06em]">Welcome back</h1>
            <p className="mt-1.5 font-serif text-base italic text-muted-foreground">
              {mode === "admin" ? "Chapter admin - e-board only" : "Active brothers"}
            </p>
          </div>

          <Card className="gs-glass">
            <CardContent className="p-6 sm:p-8">
              {/* Mode tabs — radiogroup pattern so the choice between
                  Brother and Admin reads as one mutually-exclusive option
                  to assistive tech, not two unrelated buttons. */}
              <div
                role="radiogroup"
                aria-label="Sign-in type"
                className="grid grid-cols-2 gap-2 mb-6 rounded-xl bg-secondary p-1"
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    focusMode(mode === "admin" ? "brother" : "admin");
                  }
                }}
              >
                <button
                  ref={brotherTabRef}
                  type="button"
                  role="radio"
                  aria-checked={mode === "brother"}
                  tabIndex={mode === "brother" ? 0 : -1}
                  onClick={() => setMode("brother")}
                  className={cn(
                    "rounded-md py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                    mode === "brother" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Brother
                </button>
                <button
                  ref={adminTabRef}
                  type="button"
                  role="radio"
                  aria-checked={mode === "admin"}
                  tabIndex={mode === "admin" ? 0 : -1}
                  onClick={() => setMode("admin")}
                  className={cn(
                    "rounded-md py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                    mode === "admin" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Admin
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "brother" ? (
                  <>
                    <div>
                      <Label htmlFor="fn" className="mb-1.5 inline-block">First name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fn"
                          autoFocus
                          autoComplete="username"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Alex"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bpw" className="mb-1.5 inline-block">Your password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="bpw"
                          type="password"
                          autoComplete="current-password"
                          value={brotherPw}
                          onChange={(e) => setBrotherPw(e.target.value)}
                          className="pl-9"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        You set this when you completed your onboarding form. Forgot it? Ask the admin to send a fresh invite link.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="auser" className="mb-1.5 inline-block">Admin username</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="auser"
                          autoFocus
                          autoComplete="username"
                          value={adminUser}
                          onChange={(e) => setAdminUser(e.target.value)}
                          placeholder="yourchapter"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="apw" className="mb-1.5 inline-block">Admin password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="apw"
                          type="password"
                          autoComplete="current-password"
                          value={adminPw}
                          onChange={(e) => setAdminPw(e.target.value)}
                          className="pl-9"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Single shared admin credential. Distribute to e-board only.
                      </p>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={busy}
                  variant="platform"
                  size="lg"
                  className="w-full font-display uppercase tracking-[0.12em]"
                >
                  {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>) : "Enter"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Forgot your password? Ask the admin to send you a fresh onboarding link.
          </p>
          {/* Honest disclosure: brute-force throttle is real, so make the rule
              public. Tells legitimate users why a 5th wrong attempt locks them
              out and gives the e-board cover when a teammate complains. */}
          <p className="mt-2 text-center text-[11px] text-muted-foreground/80">
            After 5 failed attempts the account locks for 15 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
