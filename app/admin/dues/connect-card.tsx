"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPayouts as Banknote, IconCheckCircle as CheckCircle2, IconClock as Clock, IconAlertCircle as AlertCircle, IconSpinner as Loader2, IconArrowRight as ArrowRight } from "@/components/brand/icons";

/**
 * Stripe Connect payout status + onboarding launcher for the current chapter.
 *
 * Shows one of three states from GET /api/dues/connect:
 * - Not connected  → no account yet (or Stripe not configured)
 * - Pending        → account exists but charges_enabled is still false
 * - Active payouts  → charges_enabled true (charges now route to the chapter)
 *
 * The button POSTs to /api/dues/connect and redirects the browser to the
 * returned Stripe-hosted onboarding URL. Purely additive — until a chapter
 * finishes onboarding, dues/donations keep collecting to the platform exactly
 * as before.
 */

type ConnectStatus = {
  ok: boolean;
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  stale?: boolean;
  error?: string;
};

export function DuesConnectCard() {
  const [status, setStatus] = React.useState<ConnectStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [unavailable, setUnavailable] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dues/connect", { method: "GET" });
      if (res.status === 503) {
        setUnavailable(true);
        setStatus(null);
        return;
      }
      const data = (await res.json()) as ConnectStatus;
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not load payout status.");
        setStatus(null);
        return;
      }
      setStatus(data);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function startOnboarding() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/dues/connect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setUnavailable(true);
        setSubmitting(false);
        return;
      }
      if (!res.ok || !data?.ok || !data?.url) {
        setError(data?.error || "Could not start payout setup. Try again.");
        setSubmitting(false);
        return;
      }
      // Hand off to Stripe's hosted onboarding. Stripe returns the admin to
      // /api/dues/connect/return, which refreshes status and lands on /admin/dues.
      window.location.href = data.url as string;
    } catch {
      setError("Could not reach the server. Try again.");
      setSubmitting(false);
    }
  }

  const connected = !!status?.connected;
  const active = !!status?.chargesEnabled;
  const pending = connected && !active;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red-soft text-brand-red">
            <Banknote className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              Treasurer payouts
              <StatusBadge
                loading={loading}
                unavailable={unavailable}
                connected={connected}
                active={active}
              />
            </CardTitle>
            <CardDescription className="mt-1">
              Connect your chapter&apos;s own bank account so dues and donations
              pay out directly to you. Until you connect, payments are collected
              centrally and reconciled manually.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {loading ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking payout status…
          </p>
        ) : unavailable ? (
          <p className="flex items-start gap-2 text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            Online payments aren&apos;t configured yet. Add your Stripe keys in
            settings first, then connect a payout account here.
          </p>
        ) : active ? (
          <p className="flex items-start gap-2 text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Payouts are <strong>active</strong>. New dues and donation
              payments route straight to your connected account
              {status?.payoutsEnabled ? "" : " (bank payouts still finalizing)"}.
            </span>
          </p>
        ) : pending ? (
          <p className="flex items-start gap-2 text-amber-700">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your payout account is created but setup isn&apos;t finished.
              Continue to verify your details so charges can route to you. In the
              meantime payments still collect centrally - nothing is lost.
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            No payout account connected yet. Payments are collected centrally
            until you connect.
          </p>
        )}

        {error && (
          <p className="flex items-start gap-2 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </CardContent>

      {!unavailable && (
        <CardFooter className="flex flex-wrap items-center gap-3">
          <Button
            onClick={startOnboarding}
            disabled={submitting || loading || active}
            variant={active ? "outline" : "default"}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Opening Stripe…
              </>
            ) : active ? (
              "Payouts connected"
            ) : pending ? (
              <>
                Continue setup <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Connect payout account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          {!loading && (
            <button
              type="button"
              onClick={load}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Refresh status
            </button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

function StatusBadge({
  loading,
  unavailable,
  connected,
  active,
}: {
  loading: boolean;
  unavailable: boolean;
  connected: boolean;
  active: boolean;
}) {
  if (loading) return null;
  if (unavailable) {
    return (
      <Badge className="bg-amber-50 text-amber-700">Not configured</Badge>
    );
  }
  if (active) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700">Active payouts</Badge>
    );
  }
  if (connected) {
    return <Badge className="bg-amber-50 text-amber-700">Pending</Badge>;
  }
  return <Badge className="bg-secondary text-muted-foreground">Not connected</Badge>;
}
