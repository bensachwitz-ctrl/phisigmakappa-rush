"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Loader2, AlertTriangle } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Platform-operator sign-in. Posts the single SUPERADMIN_PASSWORD to
 * /api/platform/login, which sets the signed `gs_superadmin` cookie on success.
 * This is intentionally NOT the chapter-admin login — chapter e-board members
 * never authenticate here.
 */
export default function PlatformLoginPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // If an operator is already signed in, skip the form and go straight to the
  // console. The tenants endpoint is operator-gated, so a 200 proves the cookie.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platform/tenants", { cache: "no-store" });
        if (!cancelled && res.ok) router.replace("/platform");
      } catch {
        /* not signed in — stay on the form */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError(j.error || "Sign-in failed");
        return;
      }
      router.push("/platform");
      router.refresh();
    } catch {
      setError("Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatedBackground
      variant="aurora-grid"
      tone="platform"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <IconChip icon={ShieldCheck} tone="platform" size="lg" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
              Greekstack
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Platform console
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Operator access only. Enter the platform password.
          </p>
        </div>

        <Card className="border-slate-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="ppw" className="mb-1.5 inline-block">
                  Platform password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="ppw"
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={busy}
                size="lg"
                className="w-full bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  "Enter console"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          This console manages every chapter on the platform. Restricted to Greekstack operators.
        </p>
      </div>
    </AnimatedBackground>
  );
}
