"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Loader2, FileText, AlertCircle } from "lucide-react";

/**
 * Bid-response form — one-click Accept/Decline for the PNM. POSTs to
 * /api/bid/[token]; the server records the response, updates the Rush
 * row's status (ACCEPTED / DECLINED), clears the token (single-use),
 * and writes an audit row. On success we refresh so the page re-renders
 * in "already-responded" mode.
 *
 * Optional reason textarea appears for DECLINE so the chapter can learn
 * what's not working. Not required — declining without a reason is fine.
 *
 * For ACCEPTED, require a digital signature (typed name matching the PNM's name
 * or nickname) and checking the anti-hazing zero-tolerance policy.
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
  const [acceptMode, setAcceptMode] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [signatureName, setSignatureName] = React.useState(pnmName || "");
  const [agreedToWaiver, setAgreedToWaiver] = React.useState(false);

  async function respond(choice: "ACCEPTED" | "DECLINED") {
    if (choice === "ACCEPTED") {
      if (!signatureName.trim()) {
        push({
          title: "Signature required",
          description: "Please type your full name to digitally sign this acceptance.",
          variant: "destructive",
        });
        return;
      }
      if (!agreedToWaiver) {
        push({
          title: "Waiver agreement required",
          description: "You must check the box to agree to the Anti-Hazing Policy.",
          variant: "destructive",
        });
        return;
      }
    }

    setBusy(choice);
    try {
      const res = await fetch(`/api/bid/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          choice, 
          reason: choice === "DECLINED" ? reason : undefined,
          signatureName: choice === "ACCEPTED" ? signatureName.trim() : undefined,
          agreedToHazingWaiver: choice === "ACCEPTED" ? agreedToWaiver : undefined,
        }),
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
          <Label htmlFor="bid-reason" className="mb-1.5 inline-block font-medium">
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
              ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" aria-hidden="true" /> Sending…</>
              : <>Decline bid <XCircle className="h-4 w-4 ml-1.5" aria-hidden="true" /></>}
          </Button>
        </div>
      </div>
    );
  }

  if (acceptMode) {
    return (
      <div className="text-left rounded-2xl border border-border bg-card p-6 space-y-5 max-w-lg mx-auto shadow-sm">
        <div className="flex items-center gap-2 border-b pb-3 text-emerald-600">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-semibold tracking-tight">Bid E-Signature & Anti-Hazing Agreement</h2>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 space-y-2.5 leading-relaxed">
          <p className="font-semibold text-slate-700">ZERO-TOLERANCE ANTI-HAZING WAIVER & AGREEMENT</p>
          <p>
            Our national organization and our chapter strictly prohibit hazing in any form. New-member education is built around community, leadership, and chapter history — never humiliation, intimidation, or harm.
          </p>
          <p>
            By signing below, you certify that you accept this bid of membership, verify that you will not participate in, submit to, or condone hazing of any kind, and acknowledge that hazing violations lead to immediate disciplinary actions and expulsion.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="hazing-waiver"
              checked={agreedToWaiver}
              onCheckedChange={(checked) => setAgreedToWaiver(checked === true)}
              className="mt-1 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
            />
            <Label htmlFor="hazing-waiver" className="text-xs font-normal text-slate-600 leading-normal cursor-pointer select-none">
              I agree to the Zero-Tolerance Anti-Hazing Agreement and accept the terms of this bid of membership.
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sig-name" className="text-xs font-semibold text-slate-700">
              Type full name to sign digitally:
            </Label>
            <Input
              id="sig-name"
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder={pnmName}
              className="border-slate-300 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 font-medium"
            />
            <p className="text-[10px] text-slate-400 italic">
              Entering your name above acts as your legally binding digital signature under the ESIGN Act.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setAcceptMode(false); setAgreedToWaiver(false); }}
            disabled={busy !== null}
            className="text-slate-500"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => respond("ACCEPTED")}
            disabled={busy !== null || !agreedToWaiver || !signatureName.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            {busy === "ACCEPTED" ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Submitting…</>
            ) : (
              "Sign & Accept Bid"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[22rem] grid-cols-1 gap-3 sm:w-fit sm:max-w-none sm:grid-flow-col sm:auto-cols-fr">
      <Button
        type="button"
        size="lg"
        onClick={() => setAcceptMode(true)}
        disabled={busy !== null}
        className="press w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <CheckCircle2 className="h-5 w-5 mr-1.5" aria-hidden="true" /> Accept my bid
      </Button>
      <Button
        type="button"
        size="lg"
        variant="outline"
        onClick={() => setDeclineMode(true)}
        disabled={busy !== null}
        className="press w-full"
      >
        <XCircle className="h-5 w-5 mr-1.5" aria-hidden="true" /> Decline
      </Button>
    </div>
  );
}
