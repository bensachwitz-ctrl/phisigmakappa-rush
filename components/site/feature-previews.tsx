"use client";

import * as React from "react";
import { IconCheck } from "@/components/brand/icons";

/**
 * IconTapCue — a tiny bespoke "try this" pointer-tap glyph that prefixes the
 * interactive demo hints, replacing the generic 💡 lightbulb emoji (AI-slop).
 * Single-stroke, inherits currentColor, sits on the brand-blue hint text so the
 * cue reads as one deliberate family with the rest of the icon system.
 */
function IconTapCue({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 11V6a2 2 0 0 1 4 0v5" />
      <path d="M13 11V8.5a1.8 1.8 0 0 1 3.6 0V12" />
      <path d="M16.6 11.5a1.8 1.8 0 0 1 3.4.9v3.1a5 5 0 0 1-5 5h-2.2a4 4 0 0 1-2.9-1.2l-3.6-3.7a1.8 1.8 0 0 1 2.6-2.5L9.6 14" />
    </svg>
  );
}

/** A hint row: the tap cue + interactive instruction, in brand blue. */
function DemoHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-[10px] font-medium italic text-blue-600/90">
      <IconTapCue className="h-3 w-3 shrink-0 not-italic" />
      <span>{children}</span>
    </p>
  );
}

function IconVote({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 12V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v7" />
      <rect x="3" y="12" width="18" height="9" rx="2" />
      <path d="M9 16h6" />
      <path d="M12 9V3" />
    </svg>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        "rounded-2xl border border-border bg-card p-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.15)] backdrop-blur-xl text-left " +
        className
      }
    >
      {children}
    </div>
  );
}

function Avatar({ glyph, tone = "blue" }: { glyph: string; tone?: "blue" | "sky" | "gold" | "emerald" | "maroon" }) {
  const tones: Record<string, string> = {
    blue: "from-blue-500/25 to-blue-500/10 text-blue-700 ring-blue-500/25",
    sky: "from-sky-500/25 to-sky-500/10 text-sky-700 ring-sky-500/25",
    gold: "from-amber-400/30 to-amber-400/10 text-amber-700 ring-amber-400/30",
    emerald: "from-emerald-500/25 to-emerald-500/10 text-emerald-700 ring-emerald-500/25",
    maroon: "from-red-500/25 to-red-500/10 text-red-700 ring-red-500/25",
  };
  return (
    <span
      aria-hidden="true"
      className={
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[11px] font-bold ring-1 " +
        tones[tone]
      }
    >
      {glyph}
    </span>
  );
}

function Bar({ pct, tone = "blue" }: { pct: number; tone?: "blue" | "emerald" | "gold" | "maroon" }) {
  const fill: Record<string, string> = {
    blue: "bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500",
    emerald: "bg-gradient-to-r from-emerald-500 to-teal-500",
    gold: "bg-gradient-to-r from-amber-500 to-amber-400",
    maroon: "bg-gradient-to-r from-red-600 to-red-500",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className={"h-full rounded-full transition-all duration-500 " + fill[tone]} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MiniHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
      <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
        {title}
      </span>
      {badge && (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ── Recruitment pipeline — a Kanban rush funnel ───────────────────────────── */
export function PreviewRecruitment() {
  const [cards, setCards] = React.useState([
    { id: 1, name: "ΑΒ", stage: "Interested", tone: "sky" as const },
    { id: 2, name: "ΓΔ", stage: "Interested", tone: "sky" as const },
    { id: 3, name: "ΕΖ", stage: "Voting", tone: "blue" as const },
    { id: 4, name: "ΗΘ", stage: "Voting", tone: "blue" as const },
    { id: 5, name: "ΙΚ", stage: "Bid", tone: "gold" as const },
  ]);

  const handleCardClick = (id: number) => {
    setCards(prev => prev.map(c => {
      if (c.id !== id) return c;
      const stages = ["Interested", "Voting", "Bid"];
      const nextIdx = (stages.indexOf(c.stage) + 1) % stages.length;
      const nextStage = stages[nextIdx];
      const nextTone = nextStage === "Interested" ? "sky" : nextStage === "Voting" ? "blue" : "gold";
      return { ...c, stage: nextStage, tone: nextTone };
    }));
  };

  const cols = [
    { name: "Interested", tone: "sky" as const, stage: "Interested" },
    { name: "Voting", tone: "blue" as const, stage: "Voting" },
    { name: "Bid", tone: "gold" as const, stage: "Bid" },
  ];

  const totalBidCount = cards.filter(c => c.stage === "Bid").length;
  const pct = Math.round((totalBidCount / cards.length) * 100);

  return (
    <Panel className="ring-1 ring-blue-500/10">
      <MiniHeader title="Rush Pipeline" badge="Funnel Simulator" />
      <DemoHint>Tap any PNM avatar card to advance them through the stages.</DemoHint>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col) => (
          <div key={col.name} className="rounded-lg border border-border bg-secondary/30 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {col.name}
              </span>
              <span className="rounded bg-secondary px-1 text-[9px] font-black text-foreground">
                {cards.filter(c => c.stage === col.stage).length}
              </span>
            </div>
            <div className="space-y-1.5 min-h-[100px]">
              {cards.filter(c => c.stage === col.stage).map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className="w-full flex items-center gap-1.5 rounded-lg border border-border/80 bg-card p-1.5 hover:border-blue-400 hover:scale-[1.02] active:scale-[0.98] transition shadow-sm text-left"
                >
                  <Avatar glyph={card.name} tone={card.tone} />
                  <span className="h-1.5 flex-1 rounded-full bg-secondary/80" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-bold text-foreground">Bid Conversion Rate</span>
          <span className="font-mono">{pct}% ({totalBidCount} of {cards.length})</span>
        </div>
        <Bar pct={pct} />
      </div>
    </Panel>
  );
}

/* ── Online dues — a Stripe-powered dues ledger ────────────────────────────── */
export function PreviewDues() {
  const [duesPaid, setDuesPaid] = React.useState<Record<number, string>>({
    0: "Paid",
    1: "Paid",
    2: "Due",
    3: "Due",
  });
  const [collected, setCollected] = React.useState(18.4);
  const [outstanding, setOutstanding] = React.useState(1.6);

  const handlePay = (index: number) => {
    if (duesPaid[index] === "Due") {
      setDuesPaid(prev => ({ ...prev, [index]: "Paid" }));
      setCollected(prev => Number((prev + 0.4).toFixed(1)));
      setOutstanding(prev => Number((prev - 0.4).toFixed(1)));
    } else if (duesPaid[index] === "Paid") {
      setDuesPaid(prev => ({ ...prev, [index]: "Due" }));
      setCollected(prev => Number((prev - 0.4).toFixed(1)));
      setOutstanding(prev => Number((prev + 0.4).toFixed(1)));
    }
  };

  const rows = [
    { id: 0, g: "ΑΒ", name: "Alex Mercer", status: duesPaid[0], tone: duesPaid[0] === "Paid" ? "emerald" as const : "blue" as const },
    { id: 1, g: "ΓΔ", name: "John Doe", status: duesPaid[1], tone: duesPaid[1] === "Paid" ? "emerald" as const : "blue" as const },
    { id: 2, g: "ΕΖ", name: "Sam Smith", status: duesPaid[2], tone: duesPaid[2] === "Paid" ? "emerald" as const : "blue" as const },
    { id: 3, g: "ΗΘ", name: "Jack Jones", status: duesPaid[3], tone: duesPaid[3] === "Paid" ? "emerald" as const : "blue" as const },
  ];

  const statusCls: Record<string, string> = {
    Paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20",
    Due: "border-blue-500/20 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20",
  };

  const pct = Math.round((collected / (collected + outstanding)) * 100);

  return (
    <Panel className="ring-1 ring-emerald-500/10">
      <MiniHeader title="Dues Collection" badge={`${pct}% Collected`} />
      <DemoHint>Click a "Due" status tag to mark that member paid and watch the ledger update.</DemoHint>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl border border-border bg-secondary/30 p-2.5">
          <span className="block text-[9px] uppercase font-bold text-muted-foreground">Collected</span>
          <span className="mt-0.5 block text-lg font-black text-emerald-600">${collected.toFixed(1)}k</span>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-2.5">
          <span className="block text-[9px] uppercase font-bold text-muted-foreground">Outstanding</span>
          <span className="mt-0.5 block text-lg font-black text-foreground">${outstanding.toFixed(1)}k</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm"
          >
            <Avatar glyph={r.g} tone={r.tone === "emerald" ? "emerald" : "blue"} />
            <span className="text-[11px] font-bold text-foreground flex-1">{r.name}</span>
            <button
              onClick={() => handlePay(r.id)}
              className={
                "rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 " + statusCls[r.status]
              }
            >
              {r.status}
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Events & calendar — a week strip with RSVP ────────────────────────────── */
export function PreviewEvents() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const [rsvps, setRsvps] = React.useState<Record<number, { count: number; user: boolean }>>({
    0: { count: 48, user: false },
    1: { count: 31, user: false },
    2: { count: 62, user: false },
  });

  const toggleRsvp = (idx: number) => {
    setRsvps(prev => {
      const current = prev[idx];
      const user = !current.user;
      const count = user ? current.count + 1 : current.count - 1;
      return { ...prev, [idx]: { count, user } };
    });
  };

  const events = [
    { id: 0, day: "Chapter Meeting", tone: "blue" as const, rsvp: rsvps[0] },
    { id: 1, day: "Philanthropy 5K Run", tone: "gold" as const, rsvp: rsvps[1] },
    { id: 2, day: "Annual Formal Mixer", tone: "sky" as const, rsvp: rsvps[2] },
  ];

  const dot: Record<string, string> = {
    blue: "bg-blue-500",
    gold: "bg-amber-400",
    sky: "bg-sky-400",
  };

  return (
    <Panel className="ring-1 ring-blue-500/10">
      <MiniHeader title="Weekly Chapter Schedule" badge="Sync Active" />
      <DemoHint>Toggle RSVP status on events to simulate active member headcounts.</DemoHint>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div
            key={i}
            className={
              "flex flex-col items-center gap-1 rounded-lg border py-1.5 " +
              (i === 2
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-border bg-secondary/30")
            }
          >
            <span className="text-[8px] font-bold uppercase text-muted-foreground">{d}</span>
            <span className={"text-[11px] font-black " + (i === 2 ? "text-blue-700" : "text-foreground")}>
              {10 + i}
            </span>
            {(i === 2 || i === 4 || i === 5) && (
              <span className={"h-1 w-1 rounded-full " + (i === 2 ? "bg-blue-500" : "bg-amber-400")} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {events.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm"
          >
            <span className={"h-2 w-2 shrink-0 rounded-full " + dot[e.tone]} />
            <span className="flex-1 text-[11px] font-bold text-foreground">{e.day}</span>
            <button
              onClick={() => toggleRsvp(e.id)}
              className={`text-[9px] font-bold uppercase tracking-wider py-1 px-2.5 rounded-lg transition-all duration-200 active:scale-95 border ${
                e.rsvp.user
                  ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-700"
                  : "bg-secondary hover:bg-border border-border/80 text-muted-foreground"
              }`}
            >
              {e.rsvp.user ? "✓ RSVP'd" : "RSVP"}
            </button>
            <span className="text-[10px] text-muted-foreground font-mono font-semibold ml-1">
              ({e.rsvp.count} going)
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Officer RBAC — a role/permission matrix ───────────────────────────────── */
export function PreviewRoles() {
  const roles = ["President", "Treasurer", "Recruitment", "Risk"];
  const matrix = [
    [true, true, true, true],
    [false, true, false, false],
    [true, false, true, false],
    [true, true, false, true],
  ];
  const modules = ["Roster", "Dues", "Rush", "Reports"];
  return (
    <Panel className="ring-1 ring-blue-500/10">
      <MiniHeader title="Role Access Controls" badge="RBAC Active" />
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[1.2fr_repeat(4,1fr)] bg-secondary/50">
          <span className="px-2 py-1.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            Role
          </span>
          {modules.map((m) => (
            <span
              key={m}
              className="px-1 py-1.5 text-center text-[8px] font-bold uppercase tracking-wide text-muted-foreground"
            >
              {m}
            </span>
          ))}
        </div>
        {roles.map((r, ri) => (
          <div
            key={r}
            className={
              "grid grid-cols-[1.2fr_repeat(4,1fr)] items-center " +
              (ri % 2 ? "bg-card" : "bg-secondary/20")
            }
          >
            <span className="px-2 py-1.5 text-[10px] font-bold text-foreground">{r}</span>
            {matrix[ri].map((on, ci) => (
              <span key={ci} className="flex justify-center py-1.5">
                {on ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/15 ring-1 ring-blue-500/30">
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="h-px w-2 rounded-full bg-border" />
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── White-label branding — a theme editor with live swatch ────────────────── */
export function PreviewWhiteLabel() {
  const [letters, setLetters] = React.useState("ΦΣΚ");
  const [primaryColor, setPrimaryColor] = React.useState("#800020");
  const swatches = ["#800020", "#1e40af", "#b45309", "#065f46"];

  return (
    <Panel className="ring-1 ring-blue-500/10">
      <MiniHeader title="White-Label Branding" badge="Theme Editor" />
      <DemoHint>Try customization: select color swatches or type customized Greek letters below.</DemoHint>
      <div className="grid grid-cols-[1fr_1.1fr] gap-3">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Greek Letters
            </label>
            <input
              type="text"
              value={letters}
              onChange={(e) => setLetters(e.target.value.toUpperCase().slice(0, 4))}
              className="w-full h-8 px-2 text-xs font-bold text-foreground bg-secondary/50 border border-border rounded-lg focus:outline-none focus:border-blue-500 focus:bg-card transition"
              maxLength={4}
              placeholder="e.g. TKE"
            />
          </div>
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Branded Colors
            </label>
            <div className="flex gap-1.5 mt-0.5">
              {swatches.map((hex) => (
                <button
                  key={hex}
                  onClick={() => setPrimaryColor(hex)}
                  className={`h-6 w-6 rounded-lg ring-1 transition-all duration-200 ${
                    primaryColor === hex ? "scale-110 ring-blue-500 shadow-md" : "ring-border/80 hover:scale-105"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Live Re-skinned Card results */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div
            className="flex items-center gap-1.5 px-3 py-2.5 transition-colors duration-300"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="flex h-5 w-7 items-center justify-center rounded-md bg-white/20 text-[9px] font-black text-white ring-1 ring-white/30 tracking-wider">
              {letters || "GK"}
            </span>
            <span className="text-[10px] font-bold text-white leading-none">Your Chapter</span>
          </div>
          <div className="space-y-2 p-3">
            <div className="flex gap-1">
              {["Rush", "Dues", "Elections"].map((t) => (
                <span
                  key={t}
                  className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide transition-colors duration-300"
                  style={{ 
                    color: primaryColor, 
                    borderColor: `${primaryColor}22`, 
                    backgroundColor: `${primaryColor}12`,
                    borderWidth: "1px"
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: "75%", backgroundColor: primaryColor }} />
            </div>
            <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full transition-all duration-300 opacity-60" style={{ width: "60%", backgroundColor: primaryColor }} />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── Chapter announcements — an officer broadcast feed (replacement feature) ── */
export function PreviewAnnouncements() {
  const [votes, setVotes] = React.useState<Record<string, number>>({
    "Option A": 18,
    "Option B": 12,
  });
  const [myVote, setMyVote] = React.useState<string | null>(null);

  const voteOption = (opt: string) => {
    setVotes(prev => {
      const next = { ...prev };
      if (myVote === opt) {
        next[opt] = prev[opt] - 1;
        setMyVote(null);
      } else {
        if (myVote) next[myVote] = prev[myVote] - 1;
        next[opt] = prev[opt] + 1;
        setMyVote(opt);
      }
      return next;
    });
  };

  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0);

  return (
    <Panel className="ring-1 ring-blue-500/10">
      <MiniHeader title="Chapter Announcements" badge="Interactive Feed" />
      <DemoHint>Test inline surveys directly inside notices in the timelines.</DemoHint>
      
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-3 text-left">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">
                Pinned Announcement
              </span>
              <h4 className="font-extrabold text-foreground text-xs leading-snug">E-Board Officer Elections 2026</h4>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            The polls are officially open for active chapter elections. Please vote for the proposed semester budget layout below.
          </p>

          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border space-y-2">
            <p className="text-[10px] font-bold text-foreground flex items-center gap-1">
              <IconVote className="w-3.5 h-3.5 text-blue-600" />
              Do you approve the Fall budget layout?
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { key: "Option A", label: "Yes, Approve Budget" },
                { key: "Option B", label: "No, Needs Edits" },
              ].map((o) => {
                const count = votes[o.key];
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isSelected = myVote === o.key;

                return (
                  <button
                    key={o.key}
                    onClick={() => voteOption(o.key)}
                    className={`w-full text-left p-2 rounded-lg border text-[10px] transition flex flex-col relative overflow-hidden justify-center min-h-[32px] ${
                      isSelected
                        ? "border-blue-600 bg-blue-500/5 font-bold"
                        : "border-border/80 hover:border-blue-400 bg-card"
                    }`}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 ${
                        isSelected ? "bg-blue-500/10" : "bg-secondary/20"
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>

                    <div className="flex justify-between items-center z-10 w-full px-1">
                      <span className="flex items-center gap-1">
                        {isSelected && <IconCheck className="w-3.5 h-3.5 text-blue-600" />}
                        {o.label}
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {pct}% ({count})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-[8px] text-muted-foreground font-semibold uppercase flex justify-between px-1">
              <span>{totalVotes} votes cast</span>
              <span>Anonymous Poll</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── Alumni & donations — directory + giving total ─────────────────────────── */
export function PreviewAlumni() {
  const [pledgeCount, setPledgeCount] = React.useState(42.1);
  const [isDonated, setIsDonated] = React.useState(false);

  const handleDonate = () => {
    if (!isDonated) {
      setPledgeCount(prev => Number((prev + 0.1).toFixed(1)));
      setIsDonated(true);
    } else {
      setPledgeCount(prev => Number((prev - 0.1).toFixed(1)));
      setIsDonated(false);
    }
  };

  const people = [
    { g: "ΑΒ", name: "David Miller", tone: "blue" as const, year: "'18" },
    { g: "ΓΔ", name: "Chris Evans", tone: "sky" as const, year: "'15" },
    { g: "ΕΖ", name: "Bob Peterson", tone: "gold" as const, year: "'09" },
  ];

  return (
    <Panel className="ring-1 ring-amber-500/10">
      <MiniHeader title="Alumni Relations" badge="Directory Active" />
      <DemoHint>Click the "Donate" action to simulate an online alumni giving micro-transaction.</DemoHint>
      
      <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-400/10 to-amber-400/[0.02] p-3 mb-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="block text-[8px] font-bold uppercase tracking-wider text-amber-700">Annual Giving Campaign</span>
            <div className="mt-0.5 flex items-end gap-1.5">
              <span className="text-lg font-black text-foreground">${pledgeCount.toFixed(1)}k</span>
              <span className="mb-0.5 text-[10px] font-bold text-emerald-600">+18% vs last year</span>
            </div>
          </div>
          <button
            onClick={handleDonate}
            className={`text-[9px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all duration-200 active:scale-95 border ${
              isDonated
                ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-700 animate-pulse"
                : "bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 border-amber-500/20 text-maroon-950 shadow-sm font-extrabold"
            }`}
          >
            {isDonated ? "✓ Contributed" : "Donate $100"}
          </button>
        </div>
        <div className="mt-2.5">
          <Bar pct={74} tone="gold" />
        </div>
      </div>

      <div className="space-y-1.5">
        {people.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm"
          >
            <Avatar glyph={p.g} tone={p.tone} />
            <div className="flex-1 space-y-1">
              <span className="block text-xs font-bold text-foreground leading-none">{p.name}</span>
              <span className="block text-[8px] font-medium text-muted-foreground leading-none">Class of {p.year}</span>
            </div>
            <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Alumni
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Members & roster — one searchable directory, actives + alumni views ──── */
export function PreviewRoster() {
  const [tab, setTab] = React.useState<"actives" | "alumni">("actives");

  // Mirrors the in-app Directory surface's mock chapter (same people as the
  // live demo's roster, so the preview and the demo tell one story).
  const actives = [
    { g: "ΑΜ", name: "Alex Mercer", tone: "blue" as const, meta: "Senior · Computer Science", tag: "Good standing" },
    { g: "ΤΣ", name: "Jack Sullivan", tone: "sky" as const, meta: "Junior · Finance", tag: "Good standing" },
    { g: "ΕΠ", name: "Ethan Park", tone: "emerald" as const, meta: "Sophomore · Marketing", tag: "New member" },
  ];
  const alumni = [
    { g: "ΜΒ", name: "Marcus Brody", tone: "gold" as const, meta: "Class of '14 · Google", tag: "Alumni" },
    { g: "ΔΒ", name: "Daniel Vance", tone: "maroon" as const, meta: "Class of '11 · Goldman Sachs", tag: "Alumni" },
  ];
  const people = tab === "actives" ? actives : alumni;

  return (
    <Panel>
      <MiniHeader title="Chapter Roster" badge={tab === "actives" ? "32 actives" : "118 alumni"} />
      <DemoHint>Switch between the Actives and Alumni views - one directory for the whole chapter.</DemoHint>

      {/* Directory switcher — mirrors the in-app roster tabs */}
      <div className="mb-3 flex rounded-xl border border-border bg-secondary/40 p-1">
        {(["actives", "alumni"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
              tab === t
                ? "border border-border bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "actives" ? "Actives" : "Alumni"}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {people.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm"
          >
            <Avatar glyph={p.g} tone={p.tone} />
            <div className="flex-1 space-y-1">
              <span className="block text-xs font-bold text-foreground leading-none">{p.name}</span>
              <span className="block text-[8px] font-medium text-muted-foreground leading-none">{p.meta}</span>
            </div>
            <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {p.tag}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Treasury & budgets — line items + live expense logging ───────────────── */
export function PreviewTreasury() {
  const [budget, setBudget] = React.useState([
    { id: 0, category: "Recruitment", allocated: 2000, spent: 1200, tone: "blue" as const },
    { id: 1, category: "Social Events", allocated: 5000, spent: 3800, tone: "emerald" as const },
    { id: 2, category: "Philanthropy", allocated: 1500, spent: 300, tone: "gold" as const },
  ]);
  const [ledger, setLedger] = React.useState([
    { id: 0, desc: "Paintball deposit", amount: 450, type: "Expense", cat: "Social Events" },
    { id: 1, desc: "Rush shirts order", amount: 850, type: "Expense", cat: "Recruitment" },
    { id: 2, desc: "Dues deposit", amount: 1200, type: "Income", cat: "Dues" },
  ]);

  const handleLogExpense = () => {
    setBudget(prev => prev.map(item => {
      if (item.category === "Social Events") {
        return { ...item, spent: item.spent + 200 };
      }
      return item;
    }));
    setLedger(prev => [
      {
        id: Date.now(),
        desc: "Chapter catering",
        amount: 200,
        type: "Expense",
        cat: "Social Events",
      },
      ...prev,
    ]);
  };

  const totalAllocated = budget.reduce((sum, item) => sum + item.allocated, 0);
  const totalSpent = budget.reduce((sum, item) => sum + item.spent, 0);

  return (
    <Panel className="ring-1 ring-blue-500/10">
      <MiniHeader title="Treasury Control" badge="Budget Ledger" />
      <DemoHint>Tap "+ Expense" to simulate a dynamic social billing invoice.</DemoHint>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl border border-border bg-secondary/30 p-2.5">
          <span className="block text-[9px] uppercase font-bold text-muted-foreground">Semester Budget</span>
          <span className="mt-0.5 block text-base font-black text-foreground">${totalAllocated.toLocaleString()}</span>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-2.5 flex justify-between items-center">
          <div>
            <span className="block text-[9px] uppercase font-bold text-muted-foreground">Total Spent</span>
            <span className="mt-0.5 block text-base font-black text-amber-600">${totalSpent.toLocaleString()}</span>
          </div>
          <button
            onClick={handleLogExpense}
            className="text-[9px] font-extrabold uppercase tracking-wider py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition active:scale-95 shadow-sm"
          >
            + Expense
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {budget.map((b) => {
          const pct = Math.round((b.spent / b.allocated) * 100);
          return (
            <div key={b.id} className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-foreground">{b.category}</span>
                <span className="text-muted-foreground font-mono">
                  ${b.spent} / ${b.allocated} ({pct}%)
                </span>
              </div>
              <Bar pct={pct} tone={b.tone} />
            </div>
          );
        })}
      </div>

      <div className="mt-3.5 border-t border-border pt-3">
        <span className="block text-[9px] uppercase font-bold text-muted-foreground mb-1.5">Live Chapter Ledger</span>
        <div className="space-y-1 max-h-[85px] overflow-y-auto pr-0.5">
          {ledger.map((l) => (
            <div key={l.id} className="flex justify-between items-center text-[10px] bg-secondary/20 rounded-md p-1.5 border border-border/40">
              <div className="flex flex-col">
                <span className="font-bold text-foreground">{l.desc}</span>
                <span className="text-[8px] text-muted-foreground">{l.cat}</span>
              </div>
              <span className={`font-mono font-bold ${l.type === "Income" ? "text-emerald-600" : "text-amber-600"}`}>
                {l.type === "Income" ? "+" : "-"}${l.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

