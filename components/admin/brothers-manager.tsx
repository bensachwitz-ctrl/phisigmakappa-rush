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
  CheckCircle2, Clock, BookOpen, Crown, Users,
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

export function BrothersManager({ initial }: { initial: Brother[] }) {
  const { push } = useToast();
  const [list, setList] = React.useState<Brother[]>(initial);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<Brother | null>(null);
  const [open, setOpen] = React.useState(false);
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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add brother
        </Button>
      </div>

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
                    <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 cursor-pointer" onClick={() => quickToggleDues(b)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Dues paid
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 text-amber-800 ring-1 ring-amber-200 cursor-pointer" onClick={() => quickToggleDues(b)}>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
