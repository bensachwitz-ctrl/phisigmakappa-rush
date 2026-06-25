import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { ConfettiPayoff } from "@/components/ui/confetti";

export const dynamic = "force-dynamic";

/**
 * /admin/dues/success — landing page Stripe redirects to after a
 * successful checkout. The Stripe webhook is the source of truth for
 * the DuesPayment.status flip; this page only READS the current state
 * so a brother who returns before the webhook fires sees "processing"
 * rather than a broken UX.
 *
 * We don't trust the session_id alone — the page is purely informative.
 * The brother is already authenticated via cookie; we just look up the
 * DuesPayment row by sessionId for display.
 */
export default async function DuesSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id || "";
  let payment = null;
  if (sessionId) {
    payment = await prisma.duesPayment
      .findUnique({ where: { stripeSessionId: sessionId } })
      .catch(() => null);
  }

  const isPaid = payment?.status === "PAID";
  const isPending = payment?.status === "PENDING";

  return (
    <main className="container py-12 max-w-xl">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          {isPaid ? (
            <>
              <ConfettiPayoff />
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Payment received</h1>
              <p className="text-sm text-muted-foreground">
                Your dues are paid for <span className="font-medium text-foreground">{payment?.year}</span>.
                A receipt is on its way to your inbox.
              </p>
              {payment?.receiptUrl && (
                <p className="text-sm">
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-phisig-red hover:underline inline-flex items-center gap-1"
                  >
                    View Stripe receipt <ArrowRight className="h-3 w-3" />
                  </a>
                </p>
              )}
            </>
          ) : isPending ? (
            <>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 mx-auto">
                <Clock className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Confirming your payment…</h1>
              <p className="text-sm text-muted-foreground">
                Stripe is still finalizing the charge. Refresh this page in a few seconds - your dues status will update automatically.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Thanks!</h1>
              <p className="text-sm text-muted-foreground">
                If you completed the payment, your status will update within a minute. Contact your treasurer if it doesn&apos;t.
              </p>
            </>
          )}
          <div className="pt-2">
            <Link
              href="/admin/brothers"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Back to brother directory <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
