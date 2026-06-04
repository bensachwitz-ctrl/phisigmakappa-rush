import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import {
  Banknote,
  ArrowLeft,
  ArrowRight,
  Settings,
  Landmark,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /admin/dues — the treasurer's "Dues" hub. A lightweight launcher that ties the
 * three otherwise-scattered dues surfaces together so a treasurer never has to
 * memorize sub-paths:
 *   1. Dues settings   → /admin/settings#dues   (amount, Stripe keys, processing fee)
 *   2. Payouts         → /admin/dues/connect    (Stripe Connect payout account)
 *   3. Member status   → /admin/brothers        (who has paid; members pay there too)
 *
 * Admin-only: everything reachable from here touches money or member records.
 * Mirrors the gate on the sibling /admin/dues/connect page (member cookie →
 * login; non-admin role → dashboard).
 */

const CARDS: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  cta: string;
}[] = [
  {
    icon: Settings,
    title: "Dues settings",
    description:
      "Set the dues amount, add your Stripe keys, and decide how the processing fee is handled before you start collecting.",
    href: "/admin/settings#dues",
    cta: "Configure dues",
  },
  {
    icon: Landmark,
    title: "Payouts (Stripe Connect)",
    description:
      "Connect your chapter's own bank account so dues and donations pay out directly to you instead of the central balance.",
    href: "/admin/dues/connect",
    cta: "Connect payout account",
  },
  {
    icon: Users,
    title: "Member dues status",
    description:
      "Track who has paid and who is outstanding. Brothers pay their dues from this same roster — chase the stragglers from here.",
    href: "/admin/brothers",
    cta: "View member status",
  },
];

export default async function DuesHubPage() {
  if (!isAdminAuthed()) redirect("/admin/login?from=%2Fadmin%2Fdues");
  if (!isAdminRole()) redirect("/admin");

  return (
    <main className="container py-8 max-w-3xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <div className="mb-8 flex items-start gap-4">
        <IconChip icon={Banknote} tone="brand" size="lg" className="hidden sm:inline-flex" />
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-phisig-red">
            <Banknote className="h-3 w-3" /> Treasurer
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dues</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-prose">
            Everything you need to collect dues in one place — configure the
            amount and your Stripe keys, connect a payout account, and keep an
            eye on who has paid.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Card
            key={card.href}
            className="lift flex flex-col transition-all hover:border-phisig-red/40 hover:shadow-md"
          >
            <CardHeader>
              <IconChip icon={card.icon} tone="brand" size="md" className="mb-2" />
              <CardTitle className="text-base">{card.title}</CardTitle>
              <CardDescription className="mt-1">{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild variant="outline" size="sm" className="w-full justify-between">
                <Link href={card.href}>
                  {card.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        New to dues? Start with <span className="font-medium text-foreground">Dues settings</span> to
        set your amount and Stripe keys, then <span className="font-medium text-foreground">connect a
        payout account</span> so money lands in your chapter&apos;s bank.
      </p>
    </main>
  );
}
