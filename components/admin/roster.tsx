"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Mail,
  MessageSquare,
  Search,
  Loader2,
  ArrowUpDown,
  Phone,
  GraduationCap,
  MapPin,
  Trash2,
  Send,
  X,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Star,
  User,
  Calendar,
  CheckCircle2,
  Download,
  Wand2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  RUSH_STATUSES,
  STATUS_LABELS,
  STATUS_STYLES,
  type RushStatus,
  cn,
} from "@/lib/utils";
import { format } from "date-fns";

type Rush = {
  id: string;
  name: string;
  email: string;
  phone: string;
  hometown: string | null;
  major: string | null;
  year: string | null;
  highSchoolInfo: string | null;
  backgroundInfo: string | null;
  headshotUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  voteSum: number;
  voteCount: number;
  myVote: number | null;
  attendanceCount: number;
};

type SortKey = "createdAt" | "name" | "status" | "voteSum";

const VOTE_OPTIONS = [
  { value: 2, label: "Strong yes", icon: Star, tone: "bg-emerald-600 text-white" },
  { value: 1, label: "Yes", icon: ThumbsUp, tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  { value: 0, label: "Neutral", icon: Minus, tone: "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200" },
  { value: -1, label: "No", icon: ThumbsDown, tone: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
  { value: -2, label: "Strong no", icon: ThumbsDown, tone: "bg-rose-600 text-white" },
] as const;

const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  blank: { subject: "", body: "" },
  invite_private: {
    subject: "You're invited — Formal Dinner",
    body:
      "We'd like to invite you to a private formal dinner with our chapter.\n\nDate: \nLocation: \nDress code: Coat & tie\n\nPlease reply to confirm your attendance.\n\nFraternally,\nPhi Sigma Kappa USC",
  },
  bid_extension: {
    subject: "Bid Extension — Phi Sigma Kappa USC",
    body:
      "After much deliberation, the brothers of Phi Sigma Kappa at USC are formally extending you a bid to join our chapter.\n\nWe're impressed by your character and want you in this brotherhood.\n\nBid night details:\nDate: \nLocation: Phi Sig House\nTime: \n\nReply to this email to accept.\n\nFraternally,\nThe Brothers of Phi Sigma Kappa",
  },
  reminder: {
    subject: "Reminder — upcoming rush event",
    body:
      "Quick reminder about our next rush event.\n\nDate: \nLocation: \nDress code: \n\nLooking forward to seeing you there.\n\nFraternally,\nPhi Sigma Kappa USC",
  },
};

const SMS_TEMPLATES: Record<string, string> = {
  blank: "",
  reminder: "Reminder: rush event tonight at 7 PM at the Phi Sig house, 800 Lincoln. Hope to see you there.",
  invite: "We'd love to have you at our private dinner this Friday. Reply YES to confirm your seat.",
  bid: "Phi Sig USC: we're extending you a bid. Bid night is Thursday 7 PM at the house. Reply YES to accept.",
};

export function Roster({
  initial,
  brotherName,
}: {
  initial: Rush[];
  brotherName: string | null;
}) {
  const { push } = useToast();
  const [rushes, setRushes] = React.useState<Rush[]>(initial);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [emailOpen, setEmailOpen] = React.useState(false);
  const [smsOpen, setSmsOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Rush | null>(null);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = React.useMemo(() => {
    let list = rushes;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.hometown || "").toLowerCase().includes(q) ||
          (r.major || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = (a as any)[sortBy] ?? "";
      const bv = (b as any)[sortBy] ?? "";
      if (av === bv) return 0;
      return av < bv ? -1 * dir : 1 * dir;
    });
    return list;
  }, [rushes, query, statusFilter, sortBy, sortDir]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  function selectAllVisible() {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  async function setStatus(id: string, status: RushStatus) {
    const prev = rushes;
    setRushes((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    if (detail?.id === id) setDetail({ ...detail, status });
    try {
      const res = await fetch("/api/admin/rush", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      push({ title: STATUS_LABELS[status], variant: "success" });
    } catch {
      setRushes(prev);
      push({ title: "Update failed", variant: "destructive" });
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this rush from the database? This cannot be undone.")) return;
    const prev = rushes;
    setRushes((rs) => rs.filter((r) => r.id !== id));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    setDetail(null);
    try {
      const res = await fetch("/api/admin/rush", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRushes(prev);
      push({ title: "Delete failed", variant: "destructive" });
    }
  }

  async function castVote(rushId: string, value: number) {
    const prev = rushes;
    const apply = (r: Rush): Rush => {
      const had = r.myVote != null;
      const newSum = r.voteSum - (r.myVote ?? 0) + value;
      const newCount = had ? r.voteCount : r.voteCount + 1;
      return { ...r, voteSum: newSum, voteCount: newCount, myVote: value };
    };
    setRushes((rs) => rs.map((r) => (r.id === rushId ? apply(r) : r)));
    if (detail?.id === rushId) setDetail(apply(detail));
    try {
      const res = await fetch("/api/admin/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rushId, value }),
      });
      if (!res.ok) throw new Error();
      push({ title: "Vote recorded", variant: "success" });
    } catch {
      setRushes(prev);
      if (detail?.id === rushId) {
        const original = prev.find((r) => r.id === rushId);
        if (original) setDetail(original);
      }
      push({ title: "Vote failed", variant: "destructive" });
    }
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir(key === "voteSum" ? "desc" : "asc"); }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, hometown, major…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RUSH_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button asChild variant="outline" title="Download all rushes as CSV">
            <a href="/api/admin/export" download>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => setSmsOpen(true)}
            disabled={selected.size === 0}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Text</span> {selected.size > 0 && `(${selected.size})`}
          </Button>
          <Button onClick={() => setEmailOpen(true)} disabled={selected.size === 0}>
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span> {selected.size > 0 && `(${selected.size})`}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <StatCard label="Total" value={rushes.length} />
        {RUSH_STATUSES.map((s) => (
          <StatCard
            key={s}
            label={STATUS_LABELS[s]}
            value={rushes.filter((r) => r.status === s).length}
          />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-secondary/50">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={selectAllVisible}
                  aria-label="Select all"
                />
              </TableHead>
              <SortableHead label="Name" active={sortBy === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Background</TableHead>
              <SortableHead label="Vote" active={sortBy === "voteSum"} dir={sortDir} onClick={() => toggleSort("voteSum")} />
              <TableHead className="hidden md:table-cell text-center">
                <Calendar className="h-3.5 w-3.5 inline-block opacity-60" />
              </TableHead>
              <SortableHead label="Status" active={sortBy === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  {rushes.length === 0
                    ? "No rushes yet. Share the rush page to start collecting submissions."
                    : "No matches for your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.id}
                  data-state={selected.has(r.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("[data-stop]")) return;
                    setDetail(r);
                  }}
                >
                  <TableCell className="pl-4" data-stop>
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggle(r.id)}
                      aria-label={`Select ${r.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar rush={r} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground md:hidden truncate">{r.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm">{r.email}</div>
                    <div className="text-xs text-muted-foreground">{r.phone}</div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[260px]">
                    <div className="line-clamp-1">
                      {[r.major, r.year, r.hometown].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell data-stop>
                    <VotePill rush={r} onVote={(v) => castVote(r.id, v)} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center text-xs text-muted-foreground">
                    {r.attendanceCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {r.attendanceCount}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell data-stop>
                    <Select value={r.status} onValueChange={(v) => setStatus(r.id, v as RushStatus)}>
                      <SelectTrigger
                        className={cn(
                          "h-8 w-[140px] border-0 focus:ring-0 focus:ring-offset-0",
                          STATUS_STYLES[r.status as RushStatus]
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RUSH_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell data-stop>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(r.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rushes.length} · Click a row for full profile
      </p>

      <EmailComposer
        open={emailOpen}
        onOpenChange={setEmailOpen}
        rushIds={Array.from(selected)}
        rushes={rushes.filter((r) => selected.has(r.id))}
        onSent={() => { setEmailOpen(false); setSelected(new Set()); }}
      />

      <SmsComposer
        open={smsOpen}
        onOpenChange={setSmsOpen}
        rushIds={Array.from(selected)}
        rushes={rushes.filter((r) => selected.has(r.id))}
        onSent={() => { setSmsOpen(false); setSelected(new Set()); }}
      />

      <RushDetail
        rush={detail}
        onClose={() => setDetail(null)}
        onRemove={remove}
        onSetStatus={setStatus}
        onVote={(v) => detail && castVote(detail.id, v)}
        onNotesSaved={(notes) => {
          if (!detail) return;
          setRushes((rs) => rs.map((r) => (r.id === detail.id ? { ...r, notes } : r)));
          setDetail({ ...detail, notes });
        }}
      />
    </div>
  );
}

/* ---------- Cells ---------- */

function Avatar({ rush, size = 36 }: { rush: Rush; size?: number }) {
  const initials = rush.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (rush.headshotUrl) {
    return (
      <img
        src={rush.headshotUrl}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-1 ring-border shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-phisig-red-soft text-phisig-red flex items-center justify-center text-xs font-semibold shrink-0"
    >
      {initials}
    </div>
  );
}

function VotePill({ rush, onVote }: { rush: Rush; onVote: (v: number) => void }) {
  const tone =
    rush.voteSum > 1
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : rush.voteSum < -1
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
      : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
        {rush.voteSum > 0 ? "+" : ""}
        {rush.voteSum}
        <span className="opacity-60">·</span>
        <span className="opacity-70">{rush.voteCount}</span>
      </span>
      <div className="flex items-center gap-0.5" data-stop>
        <button
          aria-label="Vote yes"
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
            rush.myVote === 1 ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
          )}
          onClick={() => onVote(rush.myVote === 1 ? 0 : 1)}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Vote no"
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
            rush.myVote === -1 ? "bg-rose-600 text-white" : "text-muted-foreground hover:bg-rose-50 hover:text-rose-700"
          )}
          onClick={() => onVote(rush.myVote === -1 ? 0 : -1)}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SortableHead({
  label, active, dir, onClick, className,
}: {
  label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        onClick={onClick}
        className={cn("inline-flex items-center gap-1 hover:text-foreground transition-colors", active && "text-foreground")}
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </TableHead>
  );
}

/* ---------- Detail Dialog ---------- */

type Enrichment = {
  summary?: string;
  bullets?: string[];
  links?: { label: string; url: string }[];
  source?: string;
  searchedAt?: string;
};

function RushDetail({
  rush, onClose, onRemove, onSetStatus, onVote, onNotesSaved,
}: {
  rush: Rush | null;
  onClose: () => void;
  onRemove: (id: string) => void;
  onSetStatus: (id: string, s: RushStatus) => void;
  onVote: (v: number) => void;
  onNotesSaved: (n: string) => void;
}) {
  const [allVotes, setAllVotes] = React.useState<{ value: number; comment: string | null; brother: { name: string } }[]>([]);
  const [enrichment, setEnrichment] = React.useState<Enrichment | null>(null);
  const [quickLinks, setQuickLinks] = React.useState<{ label: string; url: string }[]>([]);
  const [enrichBusy, setEnrichBusy] = React.useState(false);
  const { push } = useToast();

  React.useEffect(() => {
    if (!rush) return;
    fetch(`/api/admin/vote?rushId=${rush.id}`)
      .then((r) => r.json())
      .then((j) => setAllVotes(j.votes || []))
      .catch(() => setAllVotes([]));
    fetch(`/api/admin/enrich?rushId=${rush.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setEnrichment(j.enrichment || null);
          setQuickLinks(j.quickLinks || []);
        }
      })
      .catch(() => {});
  }, [rush?.id]);

  async function runEnrich() {
    if (!rush) return;
    setEnrichBusy(true);
    try {
      const res = await fetch("/api/admin/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rushId: rush.id }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Enrich failed");
      setEnrichment(j.enrichment);
      push({ title: "Researched", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Research failed", variant: "destructive" });
    } finally {
      setEnrichBusy(false);
    }
  }

  if (!rush) return null;

  return (
    <Dialog open={!!rush} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Avatar rush={rush} size={56} />
            <div className="min-w-0">
              <DialogTitle className="truncate">{rush.name}</DialogTitle>
              <DialogDescription>
                Registered {format(new Date(rush.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Info icon={Mail} label="Email" value={rush.email} />
          <Info icon={Phone} label="Phone" value={rush.phone} />
          <Info icon={MapPin} label="Hometown" value={rush.hometown || "—"} />
          <Info icon={GraduationCap} label="Major / year" value={[rush.major, rush.year].filter(Boolean).join(" · ") || "—"} />
        </div>

        {rush.highSchoolInfo && (
          <Section label="High school sports & activities" content={rush.highSchoolInfo} />
        )}
        {rush.backgroundInfo && (
          <Section label="Background notes from rush" content={rush.backgroundInfo} />
        )}

        {/* Voting */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Brotherhood vote</Label>
            <span className="text-xs text-muted-foreground">
              {rush.voteCount} vote{rush.voteCount === 1 ? "" : "s"} · sum {rush.voteSum > 0 ? "+" : ""}{rush.voteSum}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {VOTE_OPTIONS.map((opt) => {
              const active = rush.myVote === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onVote(active ? 0 : opt.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    active ? opt.tone + " ring-2 ring-offset-1 ring-offset-background" : "bg-background text-muted-foreground border border-border hover:bg-secondary"
                  )}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {allVotes.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View all votes ({allVotes.length})
              </summary>
              <ul className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                {allVotes.map((v, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded bg-background">
                    <span className="font-medium text-xs">{v.brother.name}</span>
                    <VoteValuePill value={v.value} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* Status */}
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 inline-block">Pipeline status</Label>
          <div className="flex flex-wrap gap-1.5">
            {RUSH_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => onSetStatus(rush.id, s)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  rush.status === s ? STATUS_STYLES[s] : "bg-background text-muted-foreground border border-border hover:bg-secondary"
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <NotesEditor rush={rush} onSaved={onNotesSaved} />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onRemove(rush.id)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoteValuePill({ value }: { value: number }) {
  const opt = VOTE_OPTIONS.find((o) => o.value === value);
  if (!opt) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", opt.tone)}>
      <opt.icon className="h-3 w-3" /> {opt.label}
    </span>
  );
}

function Section({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <p className="mt-1 text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function Info({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm break-all">{value}</div>
    </div>
  );
}

function NotesEditor({ rush, onSaved }: { rush: Rush; onSaved: (notes: string) => void }) {
  const { push } = useToast();
  const [val, setVal] = React.useState(rush.notes || "");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { setVal(rush.notes || ""); }, [rush.id, rush.notes]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/rush", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: rush.id, notes: val }),
      });
      if (!res.ok) throw new Error();
      onSaved(val);
      push({ title: "Notes saved", variant: "success" });
    } catch {
      push({ title: "Save failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Internal notes (visible to all brothers)
      </Label>
      <Textarea
        className="mt-1"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Met him at the cookout — sharp kid, played football at Spring Valley…"
        rows={3}
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="outline" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save notes
        </Button>
      </div>
    </div>
  );
}

/* ---------- Email composer ---------- */

function EmailComposer({
  open, onOpenChange, rushIds, rushes, onSent,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  rushIds: string[];
  rushes: Rush[];
  onSent: () => void;
}) {
  const { push } = useToast();
  const [template, setTemplate] = React.useState("blank");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      const t = EMAIL_TEMPLATES[template] || EMAIL_TEMPLATES.blank;
      setSubject(t.subject);
      setBody(t.body);
    }
  }, [open, template]);

  async function send() {
    if (!subject.trim() || !body.trim()) {
      push({ title: "Subject and body are required", variant: "destructive" });
      return;
    }
    if (!confirm(`Send email to ${rushIds.length} recipient${rushIds.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rushIds, subject, body }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Send failed");
      push({
        title: json.mode === "mock"
          ? `Logged ${json.sent} (no Resend key)`
          : `Sent to ${json.sent}${json.failed ? ` · ${json.failed} failed` : ""}`,
        variant: "success",
      });
      onSent();
    } catch (err: any) {
      push({ title: err.message || "Send failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose mass email</DialogTitle>
          <DialogDescription>
            Sending to {rushIds.length} recipient{rushIds.length === 1 ? "" : "s"} via Resend.
          </DialogDescription>
        </DialogHeader>

        <RecipientChips rushes={rushes} />

        <div className="grid gap-3">
          <div>
            <Label className="mb-1 inline-block">Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank</SelectItem>
                <SelectItem value="invite_private">Private event invite</SelectItem>
                <SelectItem value="bid_extension">Bid extension</SelectItem>
                <SelectItem value="reminder">Event reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 inline-block">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 inline-block">Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} placeholder="Write your message…" />
            <p className="mt-1 text-xs text-muted-foreground">First name will be prepended automatically. Plain text — newlines preserved.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button onClick={send} disabled={busy || !subject || !body}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to {rushIds.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- SMS composer ---------- */

function SmsComposer({
  open, onOpenChange, rushIds, rushes, onSent,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  rushIds: string[];
  rushes: Rush[];
  onSent: () => void;
}) {
  const { push } = useToast();
  const [template, setTemplate] = React.useState("blank");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setBody(SMS_TEMPLATES[template] || "");
  }, [open, template]);

  const remaining = 320 - body.length;

  async function send() {
    if (!body.trim()) {
      push({ title: "Message is empty", variant: "destructive" });
      return;
    }
    if (!confirm(`Send text to ${rushIds.length} recipient${rushIds.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rushIds, body }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Send failed");
      push({
        title: json.mode === "mock"
          ? `Logged ${json.sent} (Twilio not configured)`
          : `Texted ${json.sent}${json.failed ? ` · ${json.failed} failed` : ""}`,
        variant: "success",
      });
      onSent();
    } catch (err: any) {
      push({ title: err.message || "Send failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Send mass text</DialogTitle>
          <DialogDescription>
            Texting {rushIds.length} recipient{rushIds.length === 1 ? "" : "s"} via Twilio.
          </DialogDescription>
        </DialogHeader>

        <RecipientChips rushes={rushes} field="phone" />

        <div className="grid gap-3">
          <div>
            <Label className="mb-1 inline-block">Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank</SelectItem>
                <SelectItem value="reminder">Event reminder</SelectItem>
                <SelectItem value="invite">Private invite</SelectItem>
                <SelectItem value="bid">Bid extension</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Message</Label>
              <span className={cn("text-xs", remaining < 0 ? "text-destructive" : "text-muted-foreground")}>
                {remaining} chars left
              </span>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Reminder: rush event tonight at 7…"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              First name is prepended automatically. Keep it short — texts above 160 chars may be split into multiple SMS.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={busy || !body}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to {rushIds.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipientChips({
  rushes, field = "name",
}: { rushes: Rush[]; field?: "name" | "phone" }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto">
      {rushes.slice(0, 12).map((r) => (
        <span
          key={r.id}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
        >
          {field === "name" ? r.name : `${r.name} · ${r.phone}`}
        </span>
      ))}
      {rushes.length > 12 && (
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
          +{rushes.length - 12} more
        </span>
      )}
    </div>
  );
}
