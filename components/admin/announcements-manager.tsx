"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import {
  Megaphone, Plus, Pin, Trash2, Loader2, Edit3, Send,
  Users, MessageSquare, Mail,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | "BROTHERS" | "RUSHES" | "EBOARD" | "ALUMNI";
  pinned: boolean;
  pollId?: string | null;
  createdAt: string;
  author: { id: string; name: string } | null;
};

type Audience = "ALL" | "BROTHERS" | "RUSHES" | "EBOARD" | "ALUMNI";

const initial: { title: string; body: string; audience: Audience; pinned: boolean; pollId: string | null } = {
  title: "",
  body: "",
  audience: "ALL",
  pinned: false,
  pollId: null,
};

export function AnnouncementsManager({ initial: initialAnnouncements }: { initial: Announcement[] }) {
  const { push } = useToast();
  const [list, setList] = React.useState<Announcement[]>(initialAnnouncements);
  const [editing, setEditing] = React.useState<Announcement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [broadcastOpen, setBroadcastOpen] = React.useState(false);
  const [polls, setPolls] = React.useState<{ id: string; question: string }[]>([]);

  React.useEffect(() => {
    fetch("/api/polls")
      .then((r) => r.json())
      .then((data) => setPolls(data.polls || []))
      .catch((err) => console.error("failed to load polls:", err));
  }, []);

  // ---- Confirm dialog (replaces window.confirm) ----
  const [confirmState, setConfirmState] = React.useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = React.useState(false);

  function askConfirm(opts: NonNullable<typeof confirmState>) {
    setConfirmState(opts);
  }

  async function runConfirm() {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(initial);
    setOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({ title: a.title, body: a.body, audience: a.audience, pinned: a.pinned, pollId: a.pollId || null });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      push({ title: "Title and body required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        const res = await fetch("/api/admin/announcements", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error();
        setList((xs) => xs.map((a) => (a.id === editing.id ? { ...a, ...form } : a))
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)));
        push({ title: "Updated", variant: "success" });
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error();
        const a = { ...json.announcement, createdAt: new Date(json.announcement.createdAt).toISOString() };
        setList((xs) => [a, ...xs].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)));
        push({ title: "Posted", variant: "success" });
      }
      setOpen(false);
    } catch {
      push({ title: "Save failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    askConfirm({
      title: "Delete announcement?",
      description: "This announcement will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        const prev = list;
        setList(list.filter((a) => a.id !== id));
        try {
          const res = await fetch("/api/admin/announcements", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id }),
          });
          if (!res.ok) throw new Error();
        } catch {
          setList(prev);
          push({ title: "Delete failed", variant: "destructive" });
        }
      },
    });
  }

  async function togglePin(a: Announcement) {
    const prev = list;
    setList(list.map((x) => (x.id === a.id ? { ...x, pinned: !x.pinned } : x))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)));
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: a.id, pinned: !a.pinned }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setList(prev);
      push({ title: "Update failed", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {list.length === 0 ? "No announcements yet." : `${list.length} announcement${list.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setBroadcastOpen(true)}>
            <Send className="h-4 w-4" /> Broadcast (text/email)
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <Card className="border-phisig-red/20 bg-gradient-to-br from-phisig-red-soft/30 to-white">
          <CardContent className="py-12 px-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-phisig-red text-white shadow-lg shadow-phisig-red/20">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Post your first chapter announcement</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Use this for chapter meeting reminders, philanthropy events, dues deadlines, or anything the brothers need to know. Pin urgent ones.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button onClick={openCreate} size="sm"><Plus className="h-3.5 w-3.5" /> New announcement</Button>
              <Button onClick={() => setBroadcastOpen(true)} variant="outline" size="sm">
                <Send className="h-3.5 w-3.5" /> Broadcast
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((a) => (
            <Card key={a.id} className={cn("overflow-hidden lift", a.pinned && "border-phisig-red/40 bg-phisig-red-soft/20")}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.pinned && (
                        <Badge className="bg-phisig-red text-white">
                          <Pin className="h-3 w-3 mr-1" /> Pinned
                        </Badge>
                      )}
                      <Badge className="bg-secondary text-foreground">
                        <Users className="h-3 w-3 mr-1" /> {a.audience}
                      </Badge>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight">{a.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.body}</p>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {a.author?.name ? `Posted by ${a.author.name} · ` : ""}
                      {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" onClick={() => togglePin(a)} aria-label={a.pinned ? "Unpin announcement" : "Pin announcement"} title={a.pinned ? "Unpin" : "Pin"}>
                      <Pin className={cn("h-4 w-4", a.pinned && "fill-current text-phisig-red")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)} aria-label="Edit announcement" title="Edit">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete announcement" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1 inline-block">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chapter meeting moved to Tuesday" />
            </div>
            <div>
              <Label className="mb-1 inline-block">Body</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={5}
                placeholder="Hey brothers — chapter is moved to Tuesday 7pm at the house. Bring dues if you haven't paid yet."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 inline-block">Audience</Label>
                <Select value={form.audience} onValueChange={(v: any) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Everyone</SelectItem>
                    <SelectItem value="BROTHERS">Brothers only</SelectItem>
                    <SelectItem value="RUSHES">Rushes only</SelectItem>
                    <SelectItem value="EBOARD">E-board only</SelectItem>
                    <SelectItem value="ALUMNI">Alumni only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-end gap-2 text-sm cursor-pointer pb-2">
                <Checkbox checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: !!v })} />
                <span>Pin to top</span>
              </label>
            </div>
            <div>
              <Label className="mb-1 inline-block">Link a poll (optional)</Label>
              <Select value={form.pollId || "none"} onValueChange={(v) => setForm({ ...form, pollId: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No poll linked</SelectItem>
                  {polls.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.question}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />

      {/* ---------- Confirm Dialog (replaces window.confirm) ---------- */}
      <Dialog open={!!confirmState} onOpenChange={(o) => !confirmBusy && !o && setConfirmState(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            <DialogDescription>{confirmState?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmState(null)} disabled={confirmBusy}>
              Cancel
            </Button>
            <Button
              onClick={runConfirm}
              disabled={confirmBusy}
              className={cn(
                confirmState?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              )}
            >
              {confirmBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmState?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BroadcastDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { push } = useToast();
  const [audience, setAudience] = React.useState<"BROTHERS" | "RUSHES" | "ALL">("BROTHERS");
  const [channel, setChannel] = React.useState<"EMAIL" | "SMS" | "BOTH">("EMAIL");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // Confirm dialog (replaces window.confirm) for the broadcast send.
  const [confirmSendOpen, setConfirmSendOpen] = React.useState(false);

  function send() {
    if (!body.trim()) {
      push({ title: "Message body required", variant: "destructive" });
      return;
    }
    setConfirmSendOpen(true);
  }

  async function doSend() {
    setConfirmSendOpen(false);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audience, channel, subject, body }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Send failed");
      push({
        title: json.mockMode ? "Logged (no send creds)" : "Broadcast sent",
        description: `${json.recipients} recipients · ${json.sentEmail} email · ${json.sentSms} sms`,
        variant: "success",
      });
      onOpenChange(false);
      setBody("");
      setSubject("");
    } catch (err: any) {
      push({ title: err.message || "Broadcast failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Broadcast to chapter</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 inline-block">Audience</Label>
              <Select value={audience} onValueChange={(v: any) => setAudience(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BROTHERS">Brothers</SelectItem>
                  <SelectItem value="RUSHES">Active rushes</SelectItem>
                  <SelectItem value="ALL">Everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 inline-block">Channel</Label>
              <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">Text</SelectItem>
                  <SelectItem value="BOTH">Email + Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(channel === "EMAIL" || channel === "BOTH") && (
            <div>
              <Label className="mb-1 inline-block">Subject (email)</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Phi Sig USC — Chapter Update" />
            </div>
          )}
          <div>
            <Label className="mb-1 inline-block">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Reminder: chapter meeting tonight at 7pm. Dues due Friday."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tip: keep texts under 160 chars for one-segment SMS. Email has no limit.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={busy || !body}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Broadcast
          </Button>
        </DialogFooter>

        {/* Confirm send (replaces window.confirm) */}
        <Dialog open={confirmSendOpen} onOpenChange={(o) => !busy && setConfirmSendOpen(o)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Send broadcast?</DialogTitle>
              <DialogDescription>
                Broadcast to {audience.toLowerCase()} via {channel.toLowerCase()}? This will message every recipient in the selected audience.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmSendOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={doSend} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Broadcast
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
