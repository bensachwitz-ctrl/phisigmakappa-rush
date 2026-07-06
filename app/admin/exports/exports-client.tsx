"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import { useToast } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Download, FileSpreadsheet, RotateCw, Play, Database,
  CheckCircle2, XCircle, Clock, AlertTriangle, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ExportRun = {
  id: string;
  exportType: string;
  termCode: string;
  status: string; // pending | generating | complete | failed
  fileUrl: string | null;
  rowCount: number | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

// Mirror HQ_EXPORT_TYPES from lib/hq-exports.ts.
const EXPORT_TYPES = [
  { value: "membership", label: "Membership Roster", desc: "Every active/initiate/pledge brother." },
  { value: "academic", label: "Academic Standing", desc: "Academic standing & study hours per member." },
  { value: "financial", label: "Financial Summary", desc: "Dues assessed / paid / outstanding." },
  { value: "philanthropy", label: "Philanthropy Hours", desc: "Approved service-hour totals." },
  { value: "annual_report", label: "Annual Chapter Report", desc: "One-page HTML summary." },
] as const;

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EXPORT_TYPES.map((t) => [t.value, t.label])
);

function defaultTermCode(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const term = month <= 4 ? "spring" : month <= 7 ? "summer" : "fall";
  return `${now.getFullYear()}-${term}`;
}

export function ExportsClient({
  initialRuns,
  canWrite,
}: {
  initialRuns: ExportRun[];
  canWrite: boolean;
}) {
  const { push } = useToast();
  const [runs, setRuns] = React.useState<ExportRun[]>(initialRuns);
  const [exportType, setExportType] = React.useState<string>("membership");
  const [termCode, setTermCode] = React.useState<string>(defaultTermCode());
  const [running, setRunning] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/exports");
      const json = await res.json();
      if (json.ok && Array.isArray(json.runs)) {
        setRuns(
          json.runs.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt).toISOString(),
            completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
          }))
        );
      }
    } catch {
      push({ title: "Failed to refresh run history", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }, [push]);

  async function runExport() {
    if (!canWrite) return;
    if (!termCode.trim()) {
      push({ title: "Enter a term code (e.g. 2026-spring)", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/admin/exports/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ exportType, termCode: termCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Export failed");
      const completed: ExportRun = {
        ...json.run,
        createdAt: new Date(json.run.createdAt).toISOString(),
        completedAt: json.run.completedAt ? new Date(json.run.completedAt).toISOString() : null,
      };
      setRuns((xs) => [completed, ...xs.filter((x) => x.id !== completed.id)]);
      push({
        title: "Export complete",
        description: `${TYPE_LABELS[exportType]} · ${completed.rowCount ?? 0} rows`,
        variant: "success",
      });
    } catch (err: any) {
      push({ title: err.message || "Export failed", variant: "destructive" });
      // Surface the failed run row if the server recorded one.
      refresh();
    } finally {
      setRunning(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "complete":
        return <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Complete</Badge>;
      case "failed":
        return <Badge className="bg-red-50 text-red-700 ring-1 ring-red-200">Failed</Badge>;
      case "generating":
        return <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">Generating</Badge>;
      default:
        return <Badge className="bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">Pending</Badge>;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "generating":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  }

  const selectedType = EXPORT_TYPES.find((t) => t.value === exportType);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <IconChip icon={FileSpreadsheet} tone="brand" size="lg" className="hidden sm:inline-flex" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">HQ Exports</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate national headquarters reports - membership, academic, financial, philanthropy, and the annual chapter report.
            </p>
          </div>
        </div>
        {!canWrite && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Read-only Mode
          </span>
        )}
      </div>

      {/* Run Export panel */}
      {canWrite && (
        <Card className="border-border/80">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <IconChip icon={FileSpreadsheet} tone="brand" size="md" />
              <div>
                <h2 className="text-base font-semibold leading-none">Run a New Export</h2>
                <p className="text-xs text-muted-foreground mt-1">Reports generate immediately and are saved to the run history below.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="exportType">Export Type</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger id="exportType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="termCode">Term Code</Label>
                <Input
                  id="termCode"
                  value={termCode}
                  onChange={(e) => setTermCode(e.target.value)}
                  placeholder="2026-spring"
                  maxLength={32}
                />
              </div>
              <Button onClick={runExport} disabled={running} className="gs-sheen bg-phisig-red text-white hover:bg-phisig-red-dark">
                {running ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
                Run Export
              </Button>
            </div>

            {selectedType && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> {selectedType.desc}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" /> Run History
        </h2>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          <span className="ml-1.5 hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* History list */}
      {runs.length === 0 ? (
        <Card className="text-center py-12 border-dashed bg-gradient-to-b from-muted/30 to-transparent">
          <CardContent className="space-y-4">
            <div className="relative mx-auto w-fit">
              <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-2xl bg-[hsl(var(--primary)/0.18)] blur-2xl" />
              <IconChip icon={FileSpreadsheet} tone="brand" size="lg" className="mx-auto" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold">No Exports Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {canWrite
                  ? "Run your first HQ export above. Each run is recorded here with a download link."
                  : "No HQ exports have been generated yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((r) => (
            <Card key={r.id} className="border border-border/80">
              <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="shrink-0 mt-0.5">{getStatusIcon(r.status)}</div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold leading-tight">
                        {TYPE_LABELS[r.exportType] || r.exportType}
                      </h3>
                      <Badge className="font-mono border border-border text-muted-foreground bg-transparent">{r.termCode}</Badge>
                      {getStatusBadge(r.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>Started {new Date(r.createdAt).toLocaleString()}</span>
                      {r.rowCount != null && <span>{r.rowCount} rows</span>}
                      {r.completedAt && <span>Finished {new Date(r.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                    {r.status === "failed" && r.errorMessage && (
                      <p className="text-xs text-red-600 italic mt-1 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {r.errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                {r.status === "complete" && r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noreferrer noopener" className="shrink-0">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1.5" /> Download
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
