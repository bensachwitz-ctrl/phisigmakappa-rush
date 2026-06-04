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
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/**
 * Chapter-facing PLATFORM-subscription manager (paying Greekstack).
 *
 * Renders the current plan + status + trial countdown and one primary action:
 *   • Start subscription  → POST /api/admin/billing/checkout  → Stripe Checkout
 *   • Manage billing      → POST /api/admin/billing/portal     → Stripe Portal
 * Plus the value prop. Brand-tinted via the chapter's --brand-primary / phisig-red.
 *
 * NEVER hard-blocks — this is informational + a CTA. The four visual states map
 * onto the billing reasons (good standing / trial / past-due / not configured).
 */

type Reason =
  | "operator_active"
  | "subscribed"
  | "trialing"
  | "trial_active"
  | "no_tenant_row"
  | "lookup_error"
  | "past_due"
  | "canceled"
  | "trial_expired"
  | "unknown";

export function BillingManager(props: {
  planName: string;
  priceLabel: string;
  status: string | null;
  reason: Reason;
  trialEndsAt: string | null;
  daysLeft: number | null;
  hasCustomer: boolean;
  stripeConfigured: boolean;
  justSubscribed: boolean;
}) {
  const {
    planName,
    priceLabel,
    status,
    reason,
    trialEndsAt,
    daysLeft,
    hasCustomer,
    stripeConfigured,
    justSubscribed,
  } = props;

  const [submitting, setSubmitting] = React.useState<"checkout" | "portal" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const isActive = status === "active";
  const isTrialing = status === "trialing" || reason === "trial_active";
  const isPastDue = status === "past_due" || reason === "past_due";
  const isCanceled = status === "canceled" || reason === "canceled" || reason === "trial_expired";

  async function go(kind: "checkout" | "portal") {
    setSubmitting(kind);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/${kind}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setError(
          data?.error ||
            "Billing isn't configured yet. Please contact Greekstack support.",
        );
        setSubmitting(null);
        return;
      }
      // Portal with no customer yet → fall back to checkout automatically.
      if (kind === "portal" && res.status === 409 && data?.needsCheckout) {
        setSubmitting(null);
        return go("checkout");
      }
      if (!res.ok || !data?.ok || !data?.url) {
        setError(data?.error || "Something went wrong. Try again.");
        setSubmitting(null);
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setError("Could not reach the server. Try again.");
      setSubmitting(null);
    }
  }

  const trialDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-US", { dateStyle: "long" })
    : null;

  return (
    <div className="space-y-5">
      {justSubscribed && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You&apos;re all set — thanks for subscribing. It can take a few seconds
            for your plan status to update here.
          </span>
        </div>
      )}

      {/* Current plan + status */}
      <Card className="overflow-hidden border-phisig-red/15">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-phisig-red/10 text-phisig-red ring-1 ring-phisig-red/15">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex flex-wrap items-center gap-2">
                {planName}
                <StatusBadge
                  isActive={isActive}
                  isTrialing={isTrialing}
                  isPastDue={isPastDue}
                  isCanceled={isCanceled}
                  configured={stripeConfigured}
                />
              </CardTitle>
              <CardDescription className="mt-1">
                {priceLabel} · everything your chapter needs, one subscription.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          {!stripeConfigured ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              Online billing isn&apos;t set up on this deployment yet. Your chapter
              keeps running — reach out to Greekstack support to activate a plan.
            </p>
          ) : isActive ? (
            <p className="flex items-start gap-2 text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Your subscription is <strong>active</strong>. Thanks for being on
                Greekstack — manage your card, invoices, or plan anytime.
              </span>
            </p>
          ) : isPastDue ? (
            <p className="flex items-start gap-2 text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Your last payment didn&apos;t go through. Update your billing to
                keep your chapter&apos;s subscription in good standing — nothing is
                interrupted in the meantime.
              </span>
            </p>
          ) : isTrialing ? (
            <p className="flex items-start gap-2 text-amber-700">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                You&apos;re on a <strong>free trial</strong>
                {typeof daysLeft === "number" && daysLeft > 0 ? (
                  <>
                    {" "}
                    — <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"} left</strong>
                    {trialDate ? ` (ends ${trialDate})` : ""}.
                  </>
                ) : (
                  "."
                )}{" "}
                Set up billing now so there&apos;s no interruption when it ends.
              </span>
            </p>
          ) : isCanceled ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {reason === "trial_expired"
                  ? "Your free trial has ended."
                  : "Your subscription isn't active."}{" "}
                Start a subscription to keep full access going — your chapter
                stays online either way.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-2 text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-phisig-red" />
              Subscribe to lock in your chapter&apos;s platform — full access to
              every feature for {priceLabel}.
            </p>
          )}

          {error && (
            <p className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </CardContent>

        {stripeConfigured && (
          <CardFooter className="flex flex-wrap items-center gap-3">
            {isActive || isPastDue || hasCustomer ? (
              <Button
                onClick={() => go("portal")}
                disabled={submitting !== null}
                variant={isActive ? "outline" : "default"}
              >
                {submitting === "portal" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening…
                  </>
                ) : isPastDue ? (
                  <>
                    Update billing <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Manage billing <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => go("checkout")} disabled={submitting !== null}>
                {submitting === "checkout" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening Stripe…
                  </>
                ) : (
                  <>
                    {isTrialing ? "Set up billing" : "Start subscription"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}

            {/* Trialing-with-no-customer also gets a direct checkout CTA. */}
            {isTrialing && !hasCustomer && (
              <span className="text-xs text-muted-foreground">
                No charge until your trial ends.
              </span>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Value prop */}
      <Card className="bg-gradient-to-b from-phisig-red/[0.04] to-transparent border-phisig-red/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-phisig-red" />
            What your subscription includes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2.5 text-sm text-muted-foreground sm:grid-cols-2">
            {VALUE_PROPS.map((v) => (
              <li key={v} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-phisig-red" />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

const VALUE_PROPS = [
  "Your public rush site, hosted + secure",
  "Member roster, roles, and lifecycle tracking",
  "Online dues collection + treasury tools",
  "Events, RSVPs, and the chapter calendar",
  "TCPA-compliant SMS + email broadcasts",
  "Anti-hazing reporting + compliance trail",
];

function StatusBadge({
  isActive,
  isTrialing,
  isPastDue,
  isCanceled,
  configured,
}: {
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  configured: boolean;
}) {
  if (!configured) {
    return <Badge className="bg-secondary text-muted-foreground">Not set up</Badge>;
  }
  if (isActive) {
    return <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>;
  }
  if (isPastDue) {
    return <Badge className="bg-red-50 text-red-700">Past due</Badge>;
  }
  if (isTrialing) {
    return <Badge className="bg-amber-50 text-amber-700">Free trial</Badge>;
  }
  if (isCanceled) {
    return <Badge className="bg-secondary text-muted-foreground">Inactive</Badge>;
  }
  return <Badge className="bg-secondary text-muted-foreground">No plan</Badge>;
}
