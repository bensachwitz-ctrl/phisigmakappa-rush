"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconTenants,
  IconActive,
  IconSuspend,
  IconTrash,
  IconShieldCheck,
  IconSecurity,
  IconCheck,
  IconCheckCircle,
  IconClose,
  IconExternal,
} from "@/components/brand/icons";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { IconChip } from "@/components/ui/icon-chip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// The server-side layout (app/platform/layout.tsx) already redirects any
// non-operator to /platform/login before this renders. This client component
// fetches over the GET API, which independently re-verifies the operator cookie
// (defense in depth). Kept client-side so the suspend/activate/delete actions
// live in one owned file alongside the table.

/* Three tiny local glyphs for the purely-functional cases the bespoke
   Greekstack icon set intentionally doesn't cover (a busy spinner, a refresh
   arrow, a warning). Kept inline + dependency-free so this console drops the
   lucide-react import entirely while staying on the royal-blue/sky/gold brand. */

/** Indeterminate busy spinner — inherits text color, spins via Tailwind. */
function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em]",
        className ?? "h-4 w-4",
      )}
    />
  );
}

/** Refresh — a circular arrow (reload the chapter list). */
function RefreshGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className ?? "h-4 w-4")}
    >
      <path d="M20 11a8 8 0 1 0-1.5 5.4" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}

/** Alert — a warning triangle with a bang (error / destructive notice). */
function AlertGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className ?? "h-4 w-4")}
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

type Tenant = {
  id: string;
  subdomain: string;
  name: string | null;
  school: string | null;
  isActive: boolean;
  createdAt: string;
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function PlatformConsolePage() {
  const router = useRouter();
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // id currently mutating (toggle or delete in flight) → disables that row.
  const [busyId, setBusyId] = React.useState<string | null>(null);
  // Tenant queued for deletion (drives the confirm dialog).
  const [toDelete, setToDelete] = React.useState<Tenant | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/tenants", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/platform/login");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError(j.error || "Failed to load chapters");
        return;
      }
      setTenants(j.tenants || []);
    } catch {
      setError("Failed to load chapters");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(t: Tenant) {
    setBusyId(t.id);
    setError(null);
    try {
      const res = await fetch(`/api/platform/tenants/${t.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError(j.error || "Failed to update chapter");
        return;
      }
      setTenants((prev) => prev.map((x) => (x.id === t.id ? { ...x, isActive: !x.isActive } : x)));
    } catch {
      setError("Failed to update chapter");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const t = toDelete;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/tenants/${t.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError(j.error || "Failed to delete chapter");
        return;
      }
      setTenants((prev) => prev.filter((x) => x.id !== t.id));
      setToDelete(null);
    } catch {
      setError("Failed to delete chapter");
    } finally {
      setDeleting(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/platform/login", { method: "DELETE" });
    } catch {}
    router.push("/platform/login");
    router.refresh();
  }

  const activeCount = tenants.filter((t) => t.isActive).length;
  const suspendedCount = tenants.length - activeCount;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header — platform royal blue, deliberately NOT a chapter's brand color. */}
      <AnimatedBackground variant="aurora-grid" tone="platform" className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconChip icon={IconShieldCheck} tone="platform" size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#2563eb] via-[#0ea5e9] to-[#38bdf8] bg-clip-text text-transparent">
                    Greekstack
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                    Platform Console
                  </Badge>
                </div>
                <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                  Chapter control plane
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage every chapter on the platform — suspend access or remove a chapter entirely.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                {loading ? <Spinner /> : <RefreshGlyph />}
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <IconSecurity className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile icon={IconTenants} label="Total chapters" value={tenants.length} tone="blue" />
            <StatTile icon={IconCheckCircle} label="Active" value={activeCount} tone="emerald" />
            <StatTile icon={IconSuspend} label="Suspended" value={suspendedCount} tone="amber" />
          </div>
        </div>
      </AnimatedBackground>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertGlyph className="mt-0.5 h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Registered chapters
            </h2>
            <span className="text-xs text-slate-400">
              {loading ? "Loading…" : `${tenants.length} total`}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Spinner /> Loading chapters…
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <IconChip icon={IconTenants} tone="muted" size="lg" />
              <div>
                <p className="text-sm font-medium text-slate-700">No chapters yet</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Chapters appear here as soon as they sign up.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Subdomain</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => {
                  const rowBusy = busyId === t.id;
                  return (
                    <TableRow key={t.id} className={cn(rowBusy && "opacity-60")}>
                      <TableCell>
                        <a
                          href={`https://${t.subdomain}.greeklifesystems.vercel.app`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {t.subdomain}
                          <IconExternal className="h-3 w-3 opacity-60" />
                        </a>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {t.name || <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {t.school || <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {t.isActive ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                            <IconCheck className="h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                            <IconClose className="h-3 w-3" /> Suspended
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">{fmtDate(t.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={rowBusy}
                            onClick={() => toggleActive(t)}
                            className={cn(
                              t.isActive
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                            )}
                          >
                            {rowBusy ? (
                              <Spinner />
                            ) : t.isActive ? (
                              <IconSuspend className="h-4 w-4" />
                            ) : (
                              <IconActive className="h-4 w-4" />
                            )}
                            {t.isActive ? "Suspend" : "Activate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={rowBusy}
                            onClick={() => setToDelete(t)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <IconTrash className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Suspended chapters return a "not currently active" page instead of their chapter site.
          Deleting a chapter permanently drops its database schema and cannot be undone.
        </p>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!toDelete} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600 ring-1 ring-red-200">
              <AlertGlyph className="h-5 w-5" />
            </div>
            <DialogTitle>Delete this chapter?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-semibold text-slate-700">
                {toDelete?.name || toDelete?.subdomain}
              </span>{" "}
              <span className="font-mono text-xs">({toDelete?.subdomain})</span> — its entire
              database schema and all member, dues, event, and rush data. This action{" "}
              <span className="font-semibold">cannot be undone</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Spinner /> Deleting…
                </>
              ) : (
                <>
                  <IconTrash className="h-4 w-4" /> Delete permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "blue" | "emerald" | "amber";
}) {
  const toneCls = {
    blue: "from-[#2563eb]/15 to-[#38bdf8]/10 text-[#2563eb] ring-[#2563eb]/20",
    emerald: "from-emerald-500/15 to-emerald-400/10 text-emerald-600 ring-emerald-500/20",
    amber: "from-amber-500/15 to-amber-400/10 text-amber-600 ring-amber-500/20",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-sm">
      <span
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ring-1",
          toneCls,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
    </div>
  );
}
