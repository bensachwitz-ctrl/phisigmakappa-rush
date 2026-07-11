"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { IconSpark as Sparkles, IconSpinner as Loader2 } from "@/components/brand/icons";

/**
 * DraftWithAI — small, INERT-BY-DEFAULT "Draft with AI" affordance for the
 * announcement / message composer.
 *
 * Honest control: on mount it probes `GET /api/ai/draft` (which reports whether
 * a free provider key is configured WITHOUT leaking it). When AI is NOT
 * configured the trigger is DISABLED with an honest tooltip ("AI drafting
 * unavailable") — never a dead control. When configured, it opens a tiny dialog
 * to collect topic + tone, calls `POST /api/ai/draft`, and hands the generated
 * text to `onDraft` so it populates the existing composer textarea (the officer
 * edits before sending).
 *
 * On-theme: Cinzel display (font-display) + Cormorant body (font-serif), navy
 * #0B1B3A / ivory #F4F1E6 / gold #E8B53A. Reduced-motion safe (spinner is the
 * only motion; honored via motion-reduce).
 */

type DraftType = "announcement" | "rush-message" | "email" | "event-blurb";

const NAVY = "#0B1B3A";
const IVORY = "#F4F1E6";
const GOLD = "#E8B53A";

export function DraftWithAI({
  type = "announcement",
  onDraft,
  disabled,
}: {
  /** Which kind of copy to draft — picks the model bucket + prompt framing. */
  type?: DraftType;
  /** Called with the generated draft text; the composer sets it into the body. */
  onDraft: (text: string) => void;
  /** Caller-level disable (e.g. while the composer is saving). */
  disabled?: boolean;
}) {
  const { push } = useToast();
  // null = still probing; true/false = configured state from the server probe.
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [open, setOpen] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const [tone, setTone] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/ai/draft", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((j) => {
        if (alive) setConfigured(!!j?.configured);
      })
      .catch(() => {
        if (alive) setConfigured(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Hide entirely while probing OR when the server has no key — no dead control.
  // (We render a disabled button with an honest tooltip when not configured so
  // the feature is discoverable but never misleading.)
  const probing = configured === null;
  const notConfigured = configured === false;
  const triggerDisabled = !!disabled || probing || notConfigured;

  async function generate() {
    if (!topic.trim()) {
      push({ title: "Add a topic first", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          topic: topic.trim(),
          tone: tone.trim() || undefined,
          details: details.trim() || undefined,
        }),
      });
      if (res.status === 503) {
        // Key was removed since the probe — degrade honestly.
        setConfigured(false);
        setOpen(false);
        push({ title: "AI drafting unavailable", variant: "destructive" });
        return;
      }
      if (res.status === 429) {
        push({ title: "Too many drafts. Try again shortly", variant: "destructive" });
        return;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !json?.draft) {
        push({ title: "Could not generate a draft", variant: "destructive" });
        return;
      }
      onDraft(json.draft as string);
      setOpen(false);
      push({ title: "Draft added. Edit before posting", variant: "success" });
    } catch {
      push({ title: "Could not generate a draft", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={triggerDisabled}
        onClick={() => setOpen(true)}
        title={notConfigured ? "AI drafting unavailable" : "Draft this with AI"}
        aria-label="Draft with AI"
        className="gap-1.5 border-[color:var(--gs-gold,#E8B53A)]/40 text-[color:var(--gs-navy,#0B1B3A)] hover:bg-[color:var(--gs-gold,#E8B53A)]/10"
      >
        <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD }} />
        Draft with AI
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide" style={{ color: NAVY }}>
              Draft with AI
            </DialogTitle>
            <DialogDescription className="font-serif">
              Give a topic and tone and we&apos;ll draft it. You can edit everything before posting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-1 inline-block">Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Chapter meeting moved to Tuesday 7pm"
                disabled={busy}
                autoFocus
              />
            </div>
            <div>
              <Label className="mb-1 inline-block">Tone (optional)</Label>
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="friendly, hype, formal..."
                disabled={busy}
              />
            </div>
            <div>
              <Label className="mb-1 inline-block">Details to include (optional)</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Bring dues. Pizza after. RSVP in the group chat."
                disabled={busy}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={generate}
              disabled={busy}
              style={{ backgroundColor: NAVY, color: IVORY }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Drafting..." : "Generate draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
