"use client";

// RusheeDetail — full PNM profile (rush-cycle feature 1, detail page).
//
// Renders three columns on lg+ screens:
//   1. Identity card (photo + bio + contact + quick actions)
//   2. Attendance timeline (every rush event the PNM showed up to)
//   3. Impressions feed (running list of brother notes) — appendable inline
//
// "Quick actions" panel composes the existing PATCH endpoint:
//   • Send bid → POST /api/admin/rushees/[id]/bid
//   • Mark dropped → PATCH status=DROPPED
//   • Convert to pledge → PATCH convertToPledge=true (also creates Brother)
//   • Add impression → opens the impression form
//
// Optimistic UI: every action updates local state immediately, reverts on
// server error + shows a destructive toast. Same pattern as
// brothers-manager.tsx and events-manager.tsx.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/image-url";
import { IconArrowLeft as ArrowLeft, IconSend as Send, IconUserCheck as UserCheck, IconUserX as UserX, IconMessage as MessageSquarePlus, IconSpinner as Loader2, IconCalendar as Calendar, IconMail as Mail, IconPhone as Phone, IconPin as MapPin, IconCopy as Copy, IconRefresh as RefreshCw, IconFileText as FileText } from "@/components/brand/icons";
import { format } from "date-fns";

import { IconSpark } from "@/components/brand/icons";
export type RusheeDetailData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  year: string | null;
  major: string | null;
  hometown: string | null;
  highSchoolInfo: string | null;
  backgroundInfo: string | null;
  headshotUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  bidToken: string | null;
  bidTokenExpiresAt: string | null;
  bidRespondedAt: string | null;
  bidResponseChoice: string | null;
  bidWaiverUrl: string | null;
  votes: {
    id: string;
    value: number;
    comment: string | null;
    createdAt: string;
    brother: { name: string };
  }[];
  attendances: {
    id: string;
    attended: boolean;
    createdAt: string;
    event: { id: string; name: string; startsAt: string; category: string };
  }[];
  impressions: {
    id: string;
    authorName: string;
    tone: string;
    note: string | null;
    createdAt: string;
  }[];
};

const TONE_TONE: Record<string, { label: string; cls: string; dot: string }> = {
  positive: { label: "positive", cls: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  neutral:  { label: "neutral",  cls: "bg-zinc-50 text-zinc-900 ring-1 ring-zinc-200",         dot: "bg-zinc-400" },
  concern:  { label: "concern",  cls: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",       dot: "bg-amber-500" },
};

function statusBadge(status: string) {
  switch (status) {
    case "BID_EXTENDED":
      return <Badge className="bg-amber-100 text-amber-900 ring-1 ring-amber-200">Bid sent</Badge>;
    case "ACCEPTED":
      return <Badge className="bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200">Accepted</Badge>;
    case "DECLINED":
      return <Badge className="bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200">Declined</Badge>;
    case "DROPPED":
      return <Badge className="bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 line-through">Dropped</Badge>;
    default:
      return <Badge className="bg-sky-50 text-sky-900 ring-1 ring-sky-200">Active</Badge>;
  }
}

export function RusheeDetail({
  initial, siteUrl,
}: {
  initial: RusheeDetailData;
  siteUrl: string;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [rush, setRush] = React.useState<RusheeDetailData>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  // Confirm dialog (replaces window.confirm) for the "mark dropped" action.
  const [confirmDropOpen, setConfirmDropOpen] = React.useState(false);

  // ── Mutations ────────────────────────────────────────────────────────────
  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label);
    try {
      const res = await fetch(`/api/admin/rushees/${rush.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Update failed");
      setRush((r) => ({ ...r, ...json.rush, createdAt: r.createdAt }));
      push({ title: "Saved", variant: "success" });
      router.refresh();
    } catch (err: any) {
      push({ title: err.message || "Update failed", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function sendBid(regenerate = false) {
    setBusy("bid");
    try {
      const res = await fetch(`/api/admin/rushees/${rush.id}/bid`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Send failed");
      setRush((r) => ({
        ...r,
        status: "BID_EXTENDED",
        bidToken: json.rush.bidToken,
        bidTokenExpiresAt: json.rush.bidTokenExpiresAt,
        bidRespondedAt: json.rush.bidRespondedAt,
        bidResponseChoice: json.rush.bidResponseChoice,
      }));
      push({ title: regenerate ? "New bid issued" : "Bid sent", variant: "success" });
      router.refresh();
    } catch (err: any) {
      push({ title: err.message || "Send failed", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const bidUrl = rush.bidToken ? `${siteUrl}/bid/${rush.bidToken}` : null;

  function copyBidLink() {
    if (!bidUrl) return;
    void navigator.clipboard.writeText(bidUrl).then(
      () => push({ title: "Bid link copied", variant: "success" }),
      () => push({ title: "Copy failed", variant: "destructive" }),
    );
  }

  function addImpression(tone: "positive" | "neutral" | "concern", note: string) {
    const optimistic = {
      id: `tmp-${Date.now()}`,
      authorName: "you",
      tone,
      note: note.trim() || null,
      createdAt: new Date().toISOString(),
    };
    setRush((r) => ({ ...r, impressions: [optimistic, ...r.impressions] }));
    void (async () => {
      try {
        const res = await fetch(`/api/admin/rushees/${rush.id}/impressions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tone, note }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error || "Save failed");
        setRush((r) => ({
          ...r,
          impressions: [
            { ...json.impression, note: json.impression.note ?? null },
            ...r.impressions.filter((i) => i.id !== optimistic.id),
          ],
        }));
        push({ title: "Impression saved", variant: "success" });
      } catch (err: any) {
        setRush((r) => ({
          ...r,
          impressions: r.impressions.filter((i) => i.id !== optimistic.id),
        }));
        push({ title: err.message || "Save failed", variant: "destructive" });
      }
    })();
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <Link
          href="/admin/rushees"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to PNM dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* ── Left column: identity + quick actions ─────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col items-center text-center">
                <PnmAvatar headshotUrl={rush.headshotUrl} name={rush.name} />
                <h2 className="mt-3 text-xl font-semibold tracking-tight">{rush.name}</h2>
                <div className="mt-1">{statusBadge(rush.status)}</div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <ContactRow icon={Mail} label="Email" value={rush.email} />
                <ContactRow icon={Phone} label="Phone" value={rush.phone} href={`tel:${rush.phone}`} />
                {rush.year && <ContactRow icon={Calendar} label="Year" value={rush.year} />}
                {rush.major && <ContactRow icon={IconSpark} label="Major" value={rush.major} />}
                {rush.hometown && <ContactRow icon={MapPin} label="Hometown" value={rush.hometown} />}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardContent className="p-5 space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Quick actions</p>
              <Button
                onClick={() => sendBid(false)}
                disabled={busy !== null || rush.status === "ACCEPTED"}
                className="w-full"
              >
                {busy === "bid" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {rush.status === "BID_EXTENDED" ? "Re-send bid" : "Send bid"}
              </Button>
              {rush.bidToken && (
                <div className="rounded-md border border-border bg-background p-2.5 text-xs space-y-1.5">
                  <p className="text-muted-foreground">
                    Bid link expires {rush.bidTokenExpiresAt ? format(new Date(rush.bidTokenExpiresAt), "MMM d") : "-"}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={copyBidLink} className="flex-1">
                      <Copy className="h-3 w-3" /> Copy link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendBid(true)}
                      disabled={busy !== null}
                      title="Regenerate token"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {rush.bidRespondedAt && (
                <div className="space-y-1">
                  <p className="text-xs">
                    Response:{" "}
                    <span className={cn(
                      "font-medium",
                      rush.bidResponseChoice === "ACCEPTED" ? "text-emerald-700" : "text-zinc-500"
                    )}>
                      {rush.bidResponseChoice === "ACCEPTED" ? "Accepted" : "Declined"}
                    </span>
                    {" "}{format(new Date(rush.bidRespondedAt), "MMM d, h:mm a")}
                  </p>
                  {rush.bidWaiverUrl && (
                    <a
                      href={rush.bidWaiverUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-950 underline mt-1"
                    >
                      <FileText className="h-3 w-3" /> View Signed Hazing Waiver &amp; Bid
                    </a>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => patch({ convertToPledge: true }, "convert")}
                disabled={busy !== null || rush.status !== "ACCEPTED"}
                className="w-full"
                title={rush.status !== "ACCEPTED" ? "Available after PNM accepts bid" : ""}
              >
                {busy === "convert" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Convert to pledge
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmDropOpen(true)}
                disabled={busy !== null || rush.status === "DROPPED"}
                className="w-full text-muted-foreground hover:text-destructive"
              >
                {busy === "drop" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                Mark dropped
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: impressions + attendance ────────────────────── */}
        <div className="space-y-4">
          <ImpressionPanel
            impressions={rush.impressions}
            onAdd={addImpression}
          />

          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Rush events attended ({rush.attendances.length})
              </p>
              {rush.attendances.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events attended yet. PNMs show up here automatically as they check in.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rush.attendances
                    .slice()
                    .sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt))
                    .map((a) => (
                    <li key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                      <div className="shrink-0 mt-0.5 h-2 w-2 rounded-full bg-brand-red" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{a.event.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(a.event.startsAt), "EEE MMM d, h:mm a")}
                          {a.event.category && a.event.category !== "OTHER" && (
                            <> · {a.event.category.toLowerCase()}</>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {rush.notes && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Notes</p>
                <p className="whitespace-pre-wrap text-sm">{rush.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ---------- Confirm Dialog (replaces window.confirm) ---------- */}
      <Dialog open={confirmDropOpen} onOpenChange={(o) => busy === null && setConfirmDropOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark PNM as dropped?</DialogTitle>
            <DialogDescription>
              This will set {rush.name}&apos;s status to Dropped. You can change it again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDropOpen(false)} disabled={busy !== null}>
              Cancel
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy !== null}
              onClick={() => {
                setConfirmDropOpen(false);
                void patch({ status: "DROPPED" }, "drop");
              }}
            >
              {busy === "drop" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
              Mark dropped
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PnmAvatar({ headshotUrl, name }: { headshotUrl: string | null; name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
  if (headshotUrl) {
    return (
      <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-brand-red/40 bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc(headshotUrl, 192)} alt={`${name} headshot`} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-red text-white text-2xl font-semibold ring-2 ring-brand-red-dark"
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

function ContactRow({
  icon: Icon, label, value, href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </span>
  );
  if (href) return <a href={href} className="block hover:underline">{content}</a>;
  return <div>{content}</div>;
}

function ImpressionPanel({
  impressions,
  onAdd,
}: {
  impressions: RusheeDetailData["impressions"];
  onAdd: (tone: "positive" | "neutral" | "concern", note: string) => void;
}) {
  const [tone, setTone] = React.useState<"positive" | "neutral" | "concern">("positive");
  const [note, setNote] = React.useState("");

  function submit() {
    onAdd(tone, note);
    setNote("");
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Impressions ({impressions.length})
          </p>
        </div>

        {/* Add form */}
        <div className="rounded-lg border border-border bg-background p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["positive", "neutral", "concern"] as const).map((t) => {
              const tt = TONE_TONE[t];
              const active = tone === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ring-1",
                    active ? tt.cls : "bg-secondary text-muted-foreground ring-transparent hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  <span className={cn("h-2 w-2 rounded-full", tt.dot)} />
                  {tt.label}
                </button>
              );
            })}
          </div>
          <div>
            <Label htmlFor="impression-note" className="sr-only">Impression note</Label>
            <Textarea
              id="impression-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="One line - what's the vibe?"
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={submit}>
              <MessageSquarePlus className="h-3.5 w-3.5" /> Add impression
            </Button>
          </div>
        </div>

        {/* History */}
        <ul className="mt-4 space-y-2">
          {impressions.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              No impressions yet - be the first to leave one after a rush event.
            </li>
          ) : (
            impressions.map((i) => {
              const tt = TONE_TONE[i.tone] || TONE_TONE.neutral;
              return (
                <li key={i.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold", tt.cls)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", tt.dot)} />
                      {tt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {i.authorName} · {format(new Date(i.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  {i.note && <p className="mt-2 text-sm whitespace-pre-wrap">{i.note}</p>}
                </li>
              );
            })
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
