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
  Percent,
  CalendarDays,
  Repeat,
} from "lucide-react";

/**
 * Chapter-facing PLATFORM-subscription manager (paying Greekstack).
 *
 * Renders the chapter's ACTUAL plan + status and the right primary action:
 *   • monthly / semester (subscription plans):
 *       – not yet subscribed → Start subscription → POST /api/admin/billing/checkout
 *       – active / past-due / has customer → Manage billing → POST /api/admin/billing/portal
 *       – trial / next-bill copy in the status line
 *   • dues_percentage:
 *       – "You pay 1.5% of dues this semester, then 3% — no monthly fee."
 *         (no subscription CTA; Greekstack's share comes out of dues)
 *   • custom:
 *       – contact-driven; directs to sales.
 * Plus a "Switch plan" affordance and a "Need something custom? Talk to sales"
 * link to /contact#custom. Brand-tinted via the chapter's --brand-primary /
 * phisig-red.
 *
 * NEVER hard-blocks — informational + a CTA. `plan` is optional (defaults to the
 * monthly subscription view) so an un-updated server page still renders sanely.
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

type Plan = "monthly" | "semester" | "dues_percentage" | "custom";

/** Normalize a possibly-legacy/empty plan slug coming from the server. */
function normPlan(plan: string | null | undefined): Plan {
  const p = (plan || "").trim().toLowerCase();
  if (p === "semester") return "semester";
  if (p === "dues_percentage" || p === "dues" || p === "percentage") {
    return "dues_percentage";
  }
  if (p === "custom") return "custom";
  return "monthly"; // "monthly", legacy "chapter", "", unknown
}

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
  /** Optional — the chapter's actual plan slug. Defaults to "monthly". */
  plan?: string | null;
  /** Optional — whether the dues intro (1.5%) cycle is already used (→ show 3%). */
  introFeeUsed?: boolean;
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
    plan,
    introFeeUsed,
  } = props;

  const activePlan = normPlan(plan);
  const isDuesPct = activePlan === "dues_percentage";
  const isCustom = activePlan === "custom";
  const isSubscription = activePlan === "monthly" || activePlan === "semester";

  const [submitting, setSubmitting] = React.useState<"checkout" | "portal" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const isActive = status === "active";
  const isTrialing = status === "trialing" || reason === "trial_active";
  const isPastDue = status === "past_due" || reason === "past_due";
  const isCanceled = status === "canceled" || reason === "canceled" || reason === "trial_expired";

  async function go(kind: "checkout" | "portal", planArg?: Plan) {
    setSubmitting(kind);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/${kind}`, {
        method: "POST",
        ...(kind === "checkout" && planArg
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan: planArg }),
            }
          : {}),
      });
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
        return go("checkout", isSubscription ? activePlan : "monthly");
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

  const planIcon = isDuesPct ? (
    <Percent className="h-5 w-5" />
  ) : activePlan === "semester" ? (
    <CalendarDays className="h-5 w-5" />
  ) : (
    <CreditCard className="h-5 w-5" />
  );

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
              {planIcon}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex flex-wrap items-center gap-2">
                {planName}
                {isDuesPct ? (
                  <Badge className="bg-emerald-50 text-emerald-700">Dues %</Badge>
                ) : isCustom ? (
                  <Badge className="bg-secondary text-muted-foreground">Custom</Badge>
                ) : (
                  <StatusBadge
                    isActive={isActive}
                    isTrialing={isTrialing}
                    isPastDue={isPastDue}
                    isCanceled={isCanceled}
                    configured={stripeConfigured}
                  />
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {priceLabel} · everything your chapter needs, one plan.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          {/* ── DUES-PERCENTAGE PLAN ───────────────────────────────────── */}
          {isDuesPct ? (
            <div className="space-y-2">
              <p className="flex items-start gap-2 text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  You pay{" "}
                  <strong>
                    {introFeeUsed ? "3% of dues" : "1.5% of dues this semester, then 3%"}
                  </strong>{" "}
                  — <strong>no monthly fee</strong>. Greekstack&apos;s share is
                  collected automatically from each member&apos;s dues payment, so
                  there&apos;s nothing to subscribe to or manage here.
                </span>
              </p>
              <p className="flex items-start gap-2 text-muted-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-phisig-red" />
                Full access to every feature — your rush site, roster, dues, events,
                and compliance trail — with no upfront or recurring cost.
              </p>
            </div>
          ) : isCustom ? (
            /* ── CUSTOM PLAN ──────────────────────────────────────────── */
            <p className="flex items-start gap-2 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-phisig-red" />
              <span>
                Your chapter is on a <strong>custom plan</strong> arranged with our
                team. Need to make a change or have a question about billing? Reach
                out and we&apos;ll take care of it — your chapter stays fully online.
              </span>
            </p>
          ) : !stripeConfigured ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              Online billing isn&apos;t set up on this deployment yet. Your chapter
              keeps running — reach out to Greekstack support to activate a plan.
            </p>
          ) : isActive ? (
            <p className="flex items-start gap-2 text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Your subscription is <strong>active</strong>
                {activePlan === "semester" ? " (billed every 6 months)" : ""}. Thanks
                for being on Greekstack — manage your card, invoices, or plan anytime.
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

        <CardFooter className="flex flex-wrap items-center gap-3">
          {/* Subscription plans: manage / start. */}
          {isSubscription && stripeConfigured && (
            <>
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
                <Button
                  onClick={() => go("checkout", activePlan)}
                  disabled={submitting !== null}
                >
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

              {/* Trialing-with-no-customer also gets a no-charge reassurance. */}
              {isTrialing && !hasCustomer && (
                <span className="text-xs text-muted-foreground">
                  No charge until your trial ends.
                </span>
              )}
            </>
          )}

          {/* Custom plan: talk to sales is the only action. */}
          {isCustom && (
            <a
              href="/contact#custom"
              className="inline-flex items-center gap-1.5 rounded-lg bg-phisig-red px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Contact your account team <ArrowRight className="h-4 w-4" />
            </a>
          )}

          {/* Switch-plan affordance — always available, never hard-blocks. */}
          <SwitchPlan
            activePlan={activePlan}
            stripeConfigured={stripeConfigured}
            submitting={submitting !== null}
            onSwitch={(p) => {
              if (p === "custom") {
                window.location.href = "/contact#custom";
                return;
              }
              void go("checkout", p);
            }}
          />
        </CardFooter>
      </Card>

      {/* Talk-to-sales line — present on every plan. */}
      <p className="px-1 text-xs text-muted-foreground">
        Need something custom (multi-chapter, council, or HQ rollout)?{" "}
        <a
          href="/contact#custom"
          className="font-medium text-phisig-red underline-offset-2 hover:underline"
        >
          Talk to sales
        </a>
        .
      </p>

      {/* Value prop */}
      <Card className="bg-gradient-to-b from-phisig-red/[0.04] to-transparent border-phisig-red/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-phisig-red" />
            What your plan includes
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

/**
 * Lightweight "Switch plan" control. Renders the OTHER plans the chapter could
 * move to. Subscription plans (monthly/semester) start a fresh Checkout for that
 * plan; dues_percentage and custom route to sales (those aren't self-serve to
 * switch INTO — they're arranged with the team), keeping this purely additive
 * and never able to dark-screen a live chapter.
 */
function SwitchPlan({
  activePlan,
  stripeConfigured,
  submitting,
  onSwitch,
}: {
  activePlan: Plan;
  stripeConfigured: boolean;
  submitting: boolean;
  onSwitch: (plan: Plan) => void;
}) {
  const [open, setOpen] = React.useState(false);

  // The self-serve targets we can switch INTO from here.
  const options: { plan: Plan; label: string; icon: React.ReactNode; selfServe: boolean }[] = [
    {
      plan: "monthly",
      label: "Monthly — $50/mo (first month free)",
      icon: <CreditCard className="h-4 w-4" />,
      selfServe: true,
    },
    {
      plan: "semester",
      label: "Semester — $250 every 6 months",
      icon: <CalendarDays className="h-4 w-4" />,
      selfServe: true,
    },
    {
      plan: "dues_percentage",
      label: "Dues % — 1.5% then 3%, no monthly fee",
      icon: <Percent className="h-4 w-4" />,
      selfServe: false,
    },
    {
      plan: "custom",
      label: "Custom — talk to sales",
      icon: <ShieldCheck className="h-4 w-4" />,
      selfServe: false,
    },
  ];

  const others = options.filter((o) => o.plan !== activePlan);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        disabled={submitting}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Repeat className="h-4 w-4" /> Switch plan
      </Button>
      {open && (
        <div className="absolute left-0 z-10 mt-2 w-72 rounded-xl border bg-popover p-1.5 shadow-lg">
          {others.map((o) => {
            const disabled = o.selfServe && !stripeConfigured;
            return (
              <button
                key={o.plan}
                type="button"
                disabled={disabled || submitting}
                onClick={() => {
                  setOpen(false);
                  onSwitch(o.plan);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-phisig-red">{o.icon}</span>
                <span className="min-w-0 flex-1">{o.label}</span>
                {!o.selfServe && (
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] text-muted-foreground">
            Switching a subscription opens secure Stripe Checkout. Dues % and
            custom plans are set up with our team.
          </p>
        </div>
      )}
    </div>
  );
}

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
