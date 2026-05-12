"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * Bid-response form — one-click Accept/Decline for the PNM. POSTs to
 * /api/bid/[token]; the server records the response, updates the Rush
 * row's status (ACCEPTED / DECLINED), clears the token (single-use),
 * and writes an audit row. On success we refresh so the page re-renders
 * in "already-responded" mode.
 *
 * Optional reason textarea appears for DECLINE so the chapter can learn
 * what's not working. Not required — declining without a reason is fine.
 */
export function BidResponseForm({
  token, pnmName, rushEmail,
}: {
  token: string;
  pnmName: string;
  rushEmail: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = React.useState<"ACCEPTED" | "DECLINED" | null>(null);
  const [declineMode, setDeclineMode] = React.useState(false);
  const [reason, setReason] = React.useState("");

  async function respond(choice: "ACCEPTED" | "DECLINED") {
    setBusy(choice);
    try {
      const res = await fetch(`/api/bid/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choice, reason: choice === "DECLINED" ? reason : undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        push({
          title: j.error || "Couldn't record your response",
          description: `Email ${rushEmail} and we'll handle it manually.`,
          variant: "destructive",
        });
        return;
      }
      // Server response is authoritative — refresh so the page re-renders
      // in already-responded mode (with the green/zinc check or X).
      router.refresh();
    } catch {
      push({
        title: "Network hiccup",
        description: `Try again, or email ${rushEmail}.`,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  if (declineMode) {
    return (
      <div className="text-left rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <Label htmlFor="bid-reason" className="mb-1.5 inline-block">
            Want to tell us why? (Optional)
          </Label>
          <Textarea
            id="bid-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="No pressure — anything you share helps the chapter improve next cycle."
            rows={3}
            maxLength={1000}
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setDeclineMode(false); setReason(""); }}
            disabled={busy !== null}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => respond("DECLINED")}
            disabled={busy !== null}
          >
            {busy === "DECLINED"
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…</>
              : <>Decline bid <XCircle className="h-4 w-4" aria-hidden="true" /></>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        type="button"
        size="lg"
        onClick={() => respond("ACCEPTED")}
        disabled={busy !== null}
        className="press flex-1 sm:flex-none sm:min-w-[200px] bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {busy === "ACCEPTED"
          ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Accepting…</>
          : <><CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Accept my bid</>}
      </Button>
      <Button
        type="button"
        size="lg"
        variant="outline"
        onClick={() => setDeclineMode(true)}
        disabled={busy !== null}
        className="press flex-1 sm:flex-none sm:min-w-[200px]"
      >
        <XCircle className="h-5 w-5" aria-hidden="true" /> Decline
      </Button>
    </div>
  );
}
