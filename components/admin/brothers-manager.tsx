"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  Search, Plus, Trash2, Loader2, Edit3, Phone, Mail, GraduationCap,
  CheckCircle2, Clock, BookOpen, Crown, Users, Send, Copy, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Brother = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  year: string | null;
  major: string | null;
  position: string | null;
  pledgeClass: string | null;
  bio: string | null;
  headshotUrl: string | null;
  duesPaid: boolean;
  serviceHours: number;
  studyHours: number;
  role: string;
};

const empty = {
  name: "", email: "", phone: "", year: "", major: "",
  position: "", pledgeClass: "", bio: "", headshotUrl: "",
  duesPaid: false, serviceHours: 0, studyHours: 0, role: "MEMBER" as "MEMBER" | "ADMIN",
};

export function BrothersManager({
  initial,
  isAdmin = true,
  currentBrotherId = null,
}: {
  initial: Brother[];
  isAdmin?: boolean;
  currentBrotherId?: string | null;
}) {
  const { push } = useToast();
  const [list, setList] = React.useState<Brother[]>(initial);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<Brother | null>(null);
  const [open, setOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [form, setForm] = React.useState(empty);
  const [busy, setBusy] = React.useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(b: Brother) {
    setEditing(b);
    setForm({
      name: b.name,
      email: b.email || "",
      phone: b.phone || "",
      year: b.year || "",
      major: b.major || "",
      position: b.position || "",
      pledgeClass: b.pledgeClass || "",
      bio: b.bio || "",
      headshotUrl: b.headshotUrl || "",
      duesPaid: b.duesPaid,
      serviceHours: b.serviceHours,
      studyHours: b.studyHours,
      role: (b.role as any) || "MEMBER",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      push({ title: "Name required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        const res = await fetch("/api/admin/brothers", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
        setList((xs) => xs.map((x) => (x.id === editing.id ? { ...x, ...json.brother } : x)).sort((a, b) => a.name.localeCompare(b.name)));
        push({ title: "Updated", variant: "success" });
      } else {
        const res = await fetch("/api/admin/brothers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
        setList((xs) => [...xs, json.brother].sort((a, b) => a.name.localeCompare(b.name)));
        push({ title: "Brother added", variant: "success" });
      }
      setOpen(false);
    } catch (err: any) {
      push({ title: err.message || "Save failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this brother from the directory?")) return;
    const prev = list;
    setList(list.filter((b) => b.id !== id));
    try {
      const res = await fetch("/api/admin/brothers", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setList(prev);
      push({ title: "Delete failed", variant: "destructive" });
    }
  }

  async function quickToggleDues(b: Brother) {
    const next = !b.duesPaid;
    setList(list.map((x) => (x.id === b.id ? { ...x, duesPaid: next } : x)));
    try {
      await fetch("/api/admin/brothers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: b.id, duesPaid: next }),
      });
    } catch {
      setList(list);
    }
  }

  const filtered = React.useMemo(() => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.email || "").toLowerCase().includes(q) ||
      (b.major || "").toLowerCase().includes(q) ||
      (b.position || "").toLowerCase().includes(q) ||
      (b.pledgeClass || "").toLowerCase().includes(q)
    );
  }, [list, query]);

  const stats = React.useMemo(() => ({
    total: list.length,
    duesPaid: list.filter((b) => b.duesPaid).length,
    eboard: list.filter((b) => !!b.position).length,
    serviceHours: list.reduce((s, b) => s + (b.serviceHours || 0), 0),
    studyHours: list.reduce((s, b) => s + (b.studyHours || 0), 0),
  }), [list]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Brothers" value={stats.total} icon={Users} />
        <StatCard label="Dues paid" value={`${stats.duesPaid}/${stats.total}`} icon={CheckCircle2} />
        <StatCard label="E-board" value={stats.eboard} icon={Crown} />
        <StatCard label="Service hrs" value={stats.serviceHours} icon={Clock} />
        <StatCard label="Study hrs" value={stats.studyHours} icon={BookOpen} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, major, position, pledge class…"
            className="pl-9"
          />
        </div>
        {isAdmin && (
          <>
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <Send className="h-4 w-4" /> Invite brother
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add brother
            </Button>
          </>
        )}
      </div>

      {isAdmin && <InviteBrotherDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />}

      {isAdmin && <PendingInvites />}

      {filtered.length === 0 ? (
        <Card className="border-phisig-red/20 bg-gradient-to-br from-phisig-red-soft/30 to-white">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {list.length === 0 ? "No brothers yet. Click \"Add brother\" to start the directory." : "No brothers match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((b) => (
            <Card key={b.id} className="lift overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {b.headshotUrl ? (
                    <img src={b.headshotUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-border shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white flex items-center justify-center text-sm font-semibold shrink-0">
                      {b.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold tracking-tight truncate">{b.name}</h3>
                    {b.position && (
                      <p className="text-[10px] uppercase tracking-[0.18em] text-phisig-red font-semibold mt-0.5">
                        {b.position}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {[b.year, b.major].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.duesPaid ? (
                    <Badge className={`bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ${isAdmin ? "cursor-pointer" : ""}`} onClick={isAdmin ? () => quickToggleDues(b) : undefined}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Dues paid
                    </Badge>
                  ) : (
                    <Badge className={`bg-amber-50 text-amber-800 ring-1 ring-amber-200 ${isAdmin ? "cursor-pointer" : ""}`} onClick={isAdmin ? () => quickToggleDues(b) : undefined}>
                      Dues unpaid
                    </Badge>
                  )}
                  {b.pledgeClass && (
                    <Badge className="bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
                      Pledge: {b.pledgeClass}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {b.phone && (
                    <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 truncate hover:text-foreground">
                      <Phone className="h-3 w-3" /> {b.phone}
                    </a>
                  )}
                  {b.email && (
                    <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1.5 truncate hover:text-foreground">
                      <Mail className="h-3 w-3" /> {b.email}
                    </a>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {b.serviceHours}h
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {b.studyHours}h
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {(isAdmin || b.id === currentBrotherId) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)} title={b.id === currentBrotherId && !isAdmin ? "Edit your profile" : "Edit"}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(b.id)} title="Delete (admin only)">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit brother" : "Add brother"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 inline-block">Full name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mark Laughery" />
              </div>
              <div>
                <Label className="mb-1 inline-block">Position</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="President / Treasurer / …" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 inline-block">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="@email.sc.edu" />
              </div>
              <div>
                <Label className="mb-1 inline-block">Phone</Label>
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(803) 555-0142" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 inline-block">Year</Label>
                <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Junior" />
              </div>
              <div>
                <Label className="mb-1 inline-block">Major</Label>
                <Input value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} placeholder="Finance" />
              </div>
              <div>
                <Label className="mb-1 inline-block">Pledge class</Label>
                <Input value={form.pledgeClass} onChange={(e) => setForm({ ...form, pledgeClass: e.target.value })} placeholder="Alpha Phi" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer pt-7">
                <Checkbox checked={form.duesPaid} onCheckedChange={(v) => setForm({ ...form, duesPaid: !!v })} />
                <span>Dues paid</span>
              </label>
              <div>
                <Label className="mb-1 inline-block">Service hrs</Label>
                <Input type="number" min={0} value={form.serviceHours} onChange={(e) => setForm({ ...form, serviceHours: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label className="mb-1 inline-block">Study hrs</Label>
                <Input type="number" min={0} value={form.studyHours} onChange={(e) => setForm({ ...form, studyHours: parseInt(e.target.value || "0", 10) })} />
              </div>
            </div>
            <div>
              <Label className="mb-1 inline-block">Bio (optional)</Label>
              <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short bio — interests, hometown, anything brothers should know." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3 text-phisig-red" /> {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function InviteBrotherDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push } = useToast();
  const [channel, setChannel] = React.useState<"email" | "sms" | "link">("email");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [link, setLink] = React.useState("");

  function reset() {
    setEmail(""); setPhone(""); setName(""); setLink(""); setChannel("email");
  }

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/brother-invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          email: channel === "email" ? email : "",
          phone: channel === "sms" ? phone : "",
          prefillName: name,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Send failed");
      setLink(json.link);

      if (channel === "email") {
        if (json.delivery?.sent) push({ title: `Email sent to ${email}`, variant: "success" });
        else push({ title: "Email API not configured — copy the link", variant: "default" });
      } else if (channel === "sms") {
        if (json.delivery?.sent) push({ title: `Text sent to ${phone}`, variant: "success" });
        else push({ title: "SMS API not configured — copy the link", variant: "default" });
      } else {
        push({ title: "Link generated — copy & share", variant: "success" });
      }
    } catch (err: any) {
      push({ title: err.message || "Send failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    push({ title: "Link copied", variant: "success" });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite a brother</DialogTitle>
        </DialogHeader>

        {!link ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a one-time onboarding link. They'll fill in their year, major, headshot, and contact info — and land in the directory automatically.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {(["email", "sms", "link"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={
                    "rounded-md border px-3 py-2 text-sm transition " +
                    (channel === c
                      ? "bg-phisig-red text-white border-phisig-red"
                      : "border-border bg-card text-muted-foreground hover:text-foreground")
                  }
                >
                  {c === "link" ? "Copy link" : c === "sms" ? "Text" : "Email"}
                </button>
              ))}
            </div>

            <div>
              <Label className="mb-1.5 inline-block">Their name (optional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mark Laughery" />
            </div>

            {channel === "email" && (
              <div>
                <Label className="mb-1.5 inline-block">Email address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="brother@email.sc.edu" />
              </div>
            )}
            {channel === "sms" && (
              <div>
                <Label className="mb-1.5 inline-block">Phone number</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(803) 555-0142" />
                <p className="mt-1 text-xs text-muted-foreground">US numbers only. Standard message rates apply.</p>
              </div>
            )}
            {channel === "link" && (
              <p className="text-xs text-muted-foreground rounded-md bg-secondary p-3">
                We'll generate a one-time link you can paste into iMessage, GroupMe, or anywhere else.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Invite created.</p>
                <p className="text-muted-foreground">Link expires in 30 days. Share it however you want:</p>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono break-all flex-1">{link}</span>
            </div>
            <Button onClick={copyLink} className="w-full">
              <Copy className="h-4 w-4" /> Copy link
            </Button>
          </div>
        )}

        <DialogFooter>
          {!link ? (
            <>
              <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={busy}>Cancel</Button>
              <Button
                onClick={send}
                disabled={busy || (channel === "email" && !email) || (channel === "sms" && !phone)}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {channel === "link" ? "Generate link" : "Send invite"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => { reset(); onClose(); }}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Invite = {
  id: string;
  token: string;
  email: string | null;
  phone: string | null;
  prefillName: string | null;
  invitedBy: string | null;
  status: string;
  brotherId: string | null;
  expiresAt: string;
  createdAt: string;
  completedAt: string | null;
};

/**
 * Pending brother invites with a Revoke action. Lazy-loads on mount and
 * after any user-triggered revoke. Shows email/phone/link channel + sender +
 * relative time + status pill + copy-link button.
 */
function PendingInvites() {
  const { push } = useToast();
  const [invites, setInvites] = React.useState<Invite[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/brother-invites");
      const json = await res.json();
      if (json?.ok && Array.isArray(json.invites)) setInvites(json.invites);
      else setInvites([]);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    if (!confirm("Revoke this invite? The link will stop working immediately.")) return;
    const prev = invites || [];
    setInvites((xs) => (xs || []).map((i) => (i.id === id ? { ...i, status: "REVOKED" } : i)));
    try {
      const res = await fetch("/api/admin/brother-invites", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      push({ title: "Invite revoked", variant: "success" });
    } catch {
      setInvites(prev);
      push({ title: "Revoke failed", variant: "destructive" });
    }
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/onboard/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      push({ title: "Link copied", variant: "success" });
    } catch {
      push({ title: url, description: "Copy manually", variant: "default" });
    }
  }

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-4 px-5 text-xs text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading pending invites…
        </CardContent>
      </Card>
    );
  }

  if (!invites || invites.length === 0) return null;

  const pending = invites.filter((i) => i.status === "PENDING");
  const recent = invites.filter((i) => i.status !== "PENDING").slice(0, 3);

  if (pending.length === 0 && recent.length === 0) return null;

  return (
    <Card className="border-border/60">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-phisig-red">Brother invites</p>
            <p className="text-sm font-medium mt-0.5">
              {pending.length} pending{recent.length > 0 ? ` · ${recent.length} recent` : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
        </div>
        <ul className="divide-y divide-border">
          {[...pending, ...recent].map((iv) => {
            const isExpired = new Date(iv.expiresAt) < new Date();
            const channel = iv.email ? "email" : iv.phone ? "sms" : "link";
            const target = iv.email || iv.phone || "Manual link";
            const created = new Date(iv.createdAt);
            const ageHours = (Date.now() - created.getTime()) / 1000 / 3600;
            const ageLabel =
              ageHours < 1 ? `${Math.round(ageHours * 60)} min ago`
              : ageHours < 24 ? `${Math.round(ageHours)}h ago`
              : `${Math.round(ageHours / 24)}d ago`;
            const statusColor =
              iv.status === "REVOKED" ? "bg-zinc-100 text-zinc-600"
              : iv.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700"
              : isExpired ? "bg-amber-50 text-amber-700"
              : "bg-phisig-red-soft text-phisig-red";
            const statusLabel =
              iv.status === "REVOKED" ? "Revoked"
              : iv.status === "COMPLETED" ? "Completed"
              : isExpired ? "Expired"
              : "Pending";
            return (
              <li key={iv.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] uppercase tracking-wide font-semibold rounded px-1.5 py-0.5", statusColor)}>
                      {statusLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">{channel}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{ageLabel}</span>
                    {iv.invitedBy && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">by {iv.invitedBy}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate mt-0.5">
                    {iv.prefillName || target}
                  </p>
                  {iv.prefillName && target !== iv.prefillName && (
                    <p className="text-xs text-muted-foreground truncate">{target}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {iv.status === "PENDING" && !isExpired && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => copyLink(iv.token)} title="Copy link">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => revoke(iv.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" /> Revoke
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

