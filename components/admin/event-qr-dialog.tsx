"use client";

/**
 * EventQrDialog — admin-facing "Show QR" surface for a rush event.
 *
 * On open it calls /api/admin/events/{id}/qr which lazily mints the event's
 * checkInCode and returns the public check-in URL. We render that URL as a QR
 * code (via the `qrcode` lib, client-side → data-URL) plus the human-readable
 * link and code, so the rush chair can project it, print it, or text it. PNMs
 * scan it → /check-in/{code} → check in or join the pipeline.
 */

import * as React from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, QrCode as QrIcon, Users, ExternalLink } from "lucide-react";

type QrInfo = { code: string; url: string; checkInCount: number };

export function EventQrDialog({
  eventId,
  eventName,
  open,
  onOpenChange,
}: {
  eventId: string;
  eventName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [info, setInfo] = React.useState<QrInfo | null>(null);
  const [dataUrl, setDataUrl] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setInfo(null);
      setDataUrl("");
      setError(null);
      setCopied(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/events/${eventId}/qr`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Could not load the QR.");
        if (cancelled) return;
        const png = await QRCode.toDataURL(data.url, {
          width: 480,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        if (cancelled) return;
        setInfo({ code: data.code, url: data.url, checkInCount: data.checkInCount });
        setDataUrl(png);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Could not load the QR.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  async function copyLink() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked; the link is visible to copy manually */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrIcon className="h-4 w-4 text-phisig-red" /> Rush check-in QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            PNMs scan this at <span className="font-medium text-foreground">{eventName}</span> to
            check in — returning faces by phone, new ones fill a quick form and
            drop into your pipeline.
          </p>

          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              {error}
            </p>
          )}

          {info && dataUrl && !loading && (
            <>
              <div className="mx-auto w-fit rounded-2xl border bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dataUrl} alt={`Check-in QR for ${eventName}`} width={240} height={240} className="h-60 w-60" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border bg-secondary/10 px-3 py-2 text-left">
                  <code className="flex-1 truncate text-xs text-muted-foreground">{info.url}</code>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Copy check-in link"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Code: <span className="font-mono font-semibold tracking-wider text-foreground">{info.code}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {info.checkInCount} checked in
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <a href={info.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Preview
                  </a>
                </Button>
                <Button onClick={copyLink} size="sm" className="flex-1">
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EventQrDialog;
