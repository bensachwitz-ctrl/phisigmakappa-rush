import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Clock, Heart, AlertCircle } from "lucide-react";
import { PublicNav } from "@/components/site/nav";
import { PublicFooter } from "@/components/site/footer";

export const dynamic = "force-dynamic";

export default async function AlumniDonationSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id || "";
  let donation = null;

  if (sessionId) {
    donation = await prisma.alumniDonation
      .findUnique({
        where: { stripeSessionId: sessionId },
        include: { alumni: true },
      })
      .catch(() => null);
  }

  const isPaid = donation?.status === "PAID";
  const isPending = donation?.status === "PENDING";

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-between">
      <PublicNav />

      <div className="container flex-grow flex items-center justify-center px-4 py-16">
        <Card className="max-w-xl w-full border-maroon-100/80 bg-white shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-6">
            {isPaid ? (
              <>
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                  <Heart className="h-8 w-8 fill-current" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-black text-maroon-900 tracking-tight">Thank You, Brother!</h1>
                  <p className="text-sm text-maroon-700 max-w-sm mx-auto">
                    We have successfully received your donation. Your generosity directly funds chapter initiatives and supports undergraduate activities.
                  </p>
                </div>

                <div className="border border-maroon-100 rounded-xl bg-cream-50/50 p-5 text-left space-y-3 max-w-md mx-auto">
                  <div className="flex justify-between text-xs border-b border-maroon-100 pb-2">
                    <span className="text-maroon-600 font-medium">Donor</span>
                    <span className="text-maroon-950 font-bold">{donation?.alumni.fullName}</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-maroon-100 pb-2">
                    <span className="text-maroon-600 font-medium">Campaign</span>
                    <span className="text-maroon-950 font-bold">{donation?.campaign || "General"}</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-maroon-100 pb-2">
                    <span className="text-maroon-600 font-medium">Amount Received</span>
                    <span className="text-maroon-950 font-bold text-sm">
                      ${((donation?.amountCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  {donation?.recordedAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-maroon-600 font-medium">Date</span>
                      <span className="text-maroon-950 font-semibold">
                        {new Date(donation.recordedAt).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-maroon-500">
                  A formal receipt and acknowledgment letter has been sent to your email.
                </p>
              </>
            ) : isPending ? (
              <>
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white mx-auto shadow-lg shadow-amber-500/20">
                  <Clock className="h-8 w-8 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-maroon-900 tracking-tight">Processing Donation...</h1>
                  <p className="text-sm text-maroon-700 max-w-sm mx-auto">
                    Stripe is currently finalizing the payment transaction. Please refresh this page in a few moments, or check your dashboard later.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-maroon-100 text-maroon-700 mx-auto">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-maroon-900 tracking-tight">No Session Found</h1>
                  <p className="text-sm text-maroon-700 max-w-sm mx-auto">
                    We couldn't retrieve the details for this donation session. If you have completed a payment, it will show up on your dashboard profile once settled.
                  </p>
                </div>
              </>
            )}

            <div className="pt-4 border-t border-maroon-50 max-w-md mx-auto">
              <Link
                href="/portal/alumni/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-bold py-3 px-6 rounded-xl transition duration-200 shadow-md shadow-maroon-950/10"
              >
                Return to Alumni Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <PublicFooter />
    </div>
  );
}
