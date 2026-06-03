"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, ShieldAlert, AlertTriangle, Eye, Loader2, Calendar, User,
  CheckCircle2, FileText, ChevronRight, UserCheck, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

type IncidentAcknowledgment = {
  id: string;
  brother: {
    id: string;
    name: string;
  };
  acknowledgedAt: string;
  notes: string | null;
};

type IncidentReport = {
  id: string;
  receiptCode: string;
  category: string;
  severity: string;
  status: string;
  isAnonymous: boolean;
  subject: string;
  body?: string;
  reportedAt: string;
  occurredAt: string | null;
  resolvedAt: string | null;
  reporterId: string | null;
  reporter?: { id: string; name: string } | null;
  assignedToId?: string | null;
  resolutionNotes?: string | null;
  acknowledgments?: IncidentAcknowledgment[];
};

type Brother = {
  id: string;
  name: string;
};

export function RiskClient({
  initialIncidents,
  brothers,
  canWrite,
}: {
  initialIncidents: IncidentReport[];
  brothers: Brother[];
  canWrite: boolean;
}) {
  const { push } = useToast();
  const [list, setList] = React.useState<IncidentReport[]>(initialIncidents);
  const [query, setQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [severityFilter, setSeverityFilter] = React.useState("ALL");

  // Detail view state
  const [selectedIncident, setSelectedIncident] = React.useState<IncidentReport | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  // Edit triage state
  const [editStatus, setEditStatus] = React.useState("submitted");
  const [editSeverity, setEditSeverity] = React.useState("medium");
  const [editAssignedTo, setEditAssignedTo] = React.useState<string | null>(null);
  const [editResolutionNotes, setEditResolutionNotes] = React.useState("");
  const [savingTriage, setSavingTriage] = React.useState(false);

  // Fetch full details of selected incident (to get body, acknowledgments, resolutionNotes, assignedToId)
  async function viewDetails(incident: IncidentReport) {
    setSelectedIncident(incident);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/incidents/${incident.id}`);
      const json = await res.json();
      if (json.ok && json.incident) {
        setSelectedIncident(json.incident);
        setEditStatus(json.incident.status);
        setEditSeverity(json.incident.severity);
        setEditAssignedTo(json.incident.assignedToId || "UNASSIGNED");
        setEditResolutionNotes(json.incident.resolutionNotes || "");
      } else {
        throw new Error(json.error || "Failed to load incident detail");
      }
    } catch (err: any) {
      push({ title: err.message || "Could not fetch details", variant: "destructive" });
      setSelectedIncident(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Save Triage details
  async function saveTriage() {
    if (!selectedIncident) return;
    setSavingTriage(true);
    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          severity: editSeverity,
          assignedToId: editAssignedTo === "UNASSIGNED" ? null : editAssignedTo,
          resolutionNotes: editResolutionNotes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");

      // Update in main list
      setList(xs => xs.map(x => x.id === selectedIncident.id ? { ...x, ...json.incident } : x));
      push({ title: "Incident triage updated", variant: "success" });
      setSelectedIncident(null);
    } catch (err: any) {
      push({ title: err.message || "Failed to save triage details", variant: "destructive" });
    } finally {
      setSavingTriage(false);
    }
  }

  const filtered = React.useMemo(() => {
    return list.filter((item) => {
      const matchesSearch =
        item.subject.toLowerCase().includes(query.toLowerCase()) ||
        item.receiptCode.toLowerCase().includes(query.toLowerCase());

      const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter.toLowerCase();
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter.toLowerCase();
      const matchesSeverity = severityFilter === "ALL" || item.severity === severityFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus && matchesSeverity;
    });
  }, [list, query, categoryFilter, statusFilter, severityFilter]);

  const stats = React.useMemo(() => {
    const total = list.length;
    const submitted = list.filter(i => i.status === "submitted").length;
    const reviewing = list.filter(i => i.status === "reviewing").length;
    const resolved = list.filter(i => i.status === "resolved").length;
    const critical = list.filter(i => i.severity === "critical" || i.severity === "high").length;
    return { total, submitted, reviewing, resolved, critical };
  }, [list]);

  // Color mappings
  function getSeverityBadge(sev: string) {
    const s = sev.toLowerCase();
    switch (s) {
      case "critical":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white border-none">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none">Medium</Badge>;
      default:
        return <Badge className="bg-secondary text-secondary-foreground">Low</Badge>;
    }
  }

  function getStatusBadge(status: string) {
    const s = status.toLowerCase();
    switch (s) {
      case "resolved":
        return <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Resolved</Badge>;
      case "escalated":
        return <Badge className="bg-red-50 text-red-700 ring-1 ring-red-200">Escalated</Badge>;
      case "reviewing":
        return <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">Reviewing</Badge>;
      default:
        return <Badge className="bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">Submitted</Badge>;
    }
  }

  function getCategoryLabel(cat: string) {
    const c = cat.toLowerCase();
    return c.charAt(0).toUpperCase() + c.slice(1);
  }

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Risk & Safety Incident Desk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Triage anonymous or identified safety and hazing incident reports. Honoring full anonymity.
          </p>
        </div>
        {!canWrite && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only Mode
          </span>
        )}
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border p-3 bg-card">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Total Reports</div>
          <div className="text-2xl font-bold mt-0.5">{stats.total}</div>
        </div>
        <div className="rounded-xl border p-3 bg-card">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Unresolved</div>
          <div className="text-2xl font-bold mt-0.5 text-blue-600">{stats.submitted + stats.reviewing}</div>
        </div>
        <div className="rounded-xl border p-3 bg-card">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Resolved Cases</div>
          <div className="text-2xl font-bold mt-0.5 text-emerald-600">{stats.resolved}</div>
        </div>
        <div className="rounded-xl border p-3 bg-card border-red-200 bg-red-50/20">
          <div className="text-[10px] uppercase text-red-600 font-semibold">High / Critical Alert</div>
          <div className="text-2xl font-bold mt-0.5 text-red-600">{stats.critical}</div>
        </div>
        <div className="rounded-xl border p-3 bg-card">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Anonymity Rate</div>
          <div className="text-2xl font-bold mt-0.5">
            {list.length > 0 ? `${Math.round((list.filter(i => i.isAnonymous).length / list.length) * 100)}%` : "0%"}
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject, receipt code…"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="HAZING">Hazing</SelectItem>
              <SelectItem value="SAFETY">Safety</SelectItem>
              <SelectItem value="FINANCIAL">Financial</SelectItem>
              <SelectItem value="CONDUCT">Conduct</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="REVIEWING">Reviewing</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="ESCALATED">Escalated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Severities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Incident List */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12 bg-muted/20 border-dashed">
          <CardContent>
            <p className="text-sm text-muted-foreground">No incident reports found match the filter parameters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} className="lift border border-border/80 hover:border-phisig-red/20 transition">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-secondary rounded text-foreground">
                      {item.receiptCode}
                    </span>
                    <Badge className="border border-border text-muted-foreground bg-transparent">{getCategoryLabel(item.category)}</Badge>
                    {getSeverityBadge(item.severity)}
                    {getStatusBadge(item.status)}
                    {item.isAnonymous ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-semibold px-1.5 py-0.5 rounded bg-red-50">
                        <Shield className="h-3 w-3" /> Anonymous
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User className="h-3 w-3" /> Identified
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold leading-tight truncate pr-4 mt-1.5">{item.subject}</h3>
                  <p className="text-xs text-muted-foreground">
                    Reported on {new Date(item.reportedAt).toLocaleDateString()} at {new Date(item.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={() => viewDetails(item)} className="shrink-0">
                  <Eye className="h-4 w-4 mr-1.5" /> Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail & Triage Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={(o) => !o && setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Incident Detail</span>
              {selectedIncident && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-secondary rounded">
                  {selectedIncident.receiptCode}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedIncident && (
            <div className="space-y-6 py-2">
              {/* Incident Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-secondary/30 p-4 rounded-xl text-xs">
                <div>
                  <p className="font-semibold text-muted-foreground uppercase">Category</p>
                  <p className="text-sm font-bold mt-0.5">{getCategoryLabel(selectedIncident.category)}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground uppercase">Severity</p>
                  <div className="mt-0.5">{getSeverityBadge(selectedIncident.severity)}</div>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground uppercase">Triage Status</p>
                  <div className="mt-0.5">{getStatusBadge(selectedIncident.status)}</div>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground uppercase">Submitter</p>
                  <p className="text-sm font-bold mt-0.5 text-foreground">
                    {selectedIncident.isAnonymous ? (
                      <span className="text-red-600 inline-flex items-center gap-1 font-semibold">
                        <Shield className="h-3 w-3" /> Anonymous
                      </span>
                    ) : (
                      selectedIncident.reporter?.name || "Identified Member"
                    )}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <p><strong>Reported:</strong> {new Date(selectedIncident.reportedAt).toLocaleString()}</p>
                {selectedIncident.occurredAt && (
                  <p><strong>Occurred:</strong> {new Date(selectedIncident.occurredAt).toLocaleString()}</p>
                )}
              </div>

              {/* Incident Body */}
              <div className="space-y-1.5 border p-4 rounded-xl bg-card">
                <h4 className="font-bold text-base border-b pb-2">{selectedIncident.subject}</h4>
                {loadingDetail ? (
                  <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading report details safely…
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap pt-2">
                    {selectedIncident.body || "No additional report body provided."}
                  </p>
                )}
              </div>

              {/* Acknowledgment Feed */}
              {selectedIncident.acknowledgments && selectedIncident.acknowledgments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Brother Acknowledgments ({selectedIncident.acknowledgments.length})
                  </h4>
                  <div className="border rounded-xl p-3 bg-muted/10 divide-y space-y-2">
                    {selectedIncident.acknowledgments.map((ack) => (
                      <div key={ack.id} className="text-xs pt-2 first:pt-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{ack.brother.name}</span>
                          <span className="text-muted-foreground">{new Date(ack.acknowledgedAt).toLocaleDateString()}</span>
                        </div>
                        {ack.notes && (
                          <p className="text-muted-foreground italic mt-0.5">"{ack.notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Triage Editor - Risk Officer Only */}
              {canWrite && !loadingDetail && (
                <div className="border-t pt-5 space-y-4">
                  <h4 className="font-semibold text-sm text-foreground">Risk Officer Actions & Resolution</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="status">Triage Status</Label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="severity">Severity Assessment</Label>
                      <Select value={editSeverity} onValueChange={setEditSeverity}>
                        <SelectTrigger id="severity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="assigned">Assign Investigator</Label>
                      <Select value={editAssignedTo || "UNASSIGNED"} onValueChange={setEditAssignedTo}>
                        <SelectTrigger id="assigned">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                          {brothers.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="resNotes">Resolution & Audit Notes (Internal Only)</Label>
                    <Textarea
                      id="resNotes"
                      rows={3}
                      value={editResolutionNotes}
                      onChange={(e) => setEditResolutionNotes(e.target.value)}
                      placeholder="Add investigation logs, meeting dates, risk board determinations, and resolution summary."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIncident(null)} disabled={savingTriage}>
              Close
            </Button>
            {canWrite && selectedIncident && !loadingDetail && (
              <Button onClick={saveTriage} disabled={savingTriage} className="bg-phisig-red text-white hover:bg-phisig-red-dark">
                {savingTriage && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
