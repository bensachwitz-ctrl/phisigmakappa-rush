"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconChip } from "@/components/ui/icon-chip";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  Vote, Plus, Loader2, ChevronRight, Users2, ListChecks, ShieldCheck,
} from "lucide-react";
import { ElectionStatusBadge, defaultTermCode } from "./status-badge";

export type ElectionRow = {
  id: string;
  title: string;
  termCode: string;
  status: string;
  anonymous: boolean;
  audience: string;
  seatCount: number;
  totalBallots: number;
  opensAt: string | null;
  closesAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ElectionsListClient({ initial }: { initial: ElectionRow[] }) {
  const { push } = useToast();
  const router = useRouter();
  const [elections, setElections] = React.useState<ElectionRow[]>(initial);
  const [createOpen, setCreateOpen] = React.useState(false);

  const handleCreated = React.useCallback((row: ElectionRow) => {
    setElections((prev) => [row, ...prev]);
  }, []);

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconChip icon={Vote} size="lg" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Officer elections</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Run secret-ballot elections for chapter offices. Build the ballot,
                open voting, then seat the winners as officers in one click.
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="press">
            <Plus className="h-4 w-4" />
            New election
          </Button>
        </header>

        {elections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-14 text-center">
            <p className="text-sm font-medium">No elections yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one to set up offices, nominate candidates, and open voting.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {elections.map((e, i) => (
              <li
                key={e.id}
                className="animate-soft-enter"
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
              >
                <Link href={`/admin/elections/${e.id}`} className="block">
                  <Card className="lift overflow-hidden transition-colors hover:border-phisig-red/40">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold tracking-tight">
                            {e.title}
                          </p>
                          <ElectionStatusBadge status={e.status} />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> Term {e.termCode}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ListChecks className="h-3.5 w-3.5" /> {e.seatCount}{" "}
                            {e.seatCount === 1 ? "seat" : "seats"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users2 className="h-3.5 w-3.5" /> {e.totalBallots}{" "}
                            {e.totalBallots === 1 ? "ballot" : "ballots"}
                          </span>
                          {e.anonymous && (
                            <Badge className="bg-secondary text-foreground">Secret ballot</Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateElectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(row) => {
          handleCreated(row);
          // Jump straight into managing the new election (add seats/candidates).
          router.push(`/admin/elections/${row.id}`);
        }}
      />
    </div>
  );
}

function CreateElectionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (row: ElectionRow) => void;
}) {
  const { push } = useToast();
  const [title, setTitle] = React.useState("");
  const [termCode, setTermCode] = React.useState(defaultTermCode());
  const [anonymous, setAnonymous] = React.useState(true);
  const [audience, setAudience] = React.useState<"BROTHERS" | "ALL">("BROTHERS");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setTermCode(defaultTermCode());
      setAnonymous(true);
      setAudience("BROTHERS");
      setSubmitting(false);
    }
  }, [open]);

  const valid = title.trim().length >= 3 && termCode.trim().length >= 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          termCode: termCode.trim(),
          anonymous,
          audience,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok: boolean; election?: ElectionRow; error?: string };
      if (!res.ok || !data.ok || !data.election) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      push({ title: "Election created", variant: "success" });
      onCreated(data.election);
      onOpenChange(false);
    } catch (err) {
      push({
        title: "Could not create election",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New election</DialogTitle>
          <DialogDescription>
            Set the title and term. You&apos;ll add offices and candidates next,
            then open voting when the ballot is ready.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="field-glow space-y-1.5">
            <Label htmlFor="election-title">Title</Label>
            <Input
              id="election-title"
              required
              maxLength={160}
              placeholder="e.g. 2026 Officer Elections"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field-glow space-y-1.5">
            <Label htmlFor="election-term">Term code</Label>
            <Input
              id="election-term"
              required
              maxLength={20}
              placeholder="e.g. 2026-FA"
              value={termCode}
              onChange={(e) => setTermCode(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground/70">
              Applied to officer assignments when you seat the winners.
            </p>
          </div>
          <div className="field-glow space-y-1.5">
            <Label htmlFor="election-audience">Who can vote?</Label>
            <select
              id="election-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as "BROTHERS" | "ALL")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="BROTHERS">Active members only</option>
              <option value="ALL">Everyone (members + alumni)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span>Secret ballot (recommended - never records who voted for whom)</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || submitting} className="press">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>Create election</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
