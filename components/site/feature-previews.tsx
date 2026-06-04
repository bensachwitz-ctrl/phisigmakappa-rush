"use client";

import * as React from "react";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * FEATURE PREVIEW MOCKUPS — stylized in-app "screenshots", built from divs.
 * ────────────────────────────────────────────────────────────────────────────
 * Each export is a faux, platform-branded mini screenshot of what a given
 * feature looks like INSIDE the Greekstack app. They are NOT real images — every
 * pixel is a div/span so they stay crisp at any density, theme to the platform
 * palette (royal-blue #2563eb / sky #38bdf8 / gold #f59e0b — never purple), and
 * add no network weight.
 *
 * They are shown inside <FeatureDetailModal> when a feature card is opened, so
 * a buyer can SEE the feature, not just read about it. All decorative; the modal
 * supplies the accessible name/description. Static (no animation of their own)
 * so they never fight the modal's spring entrance or trip reduced-motion.
 *
 * Shared building blocks keep the set visually consistent:
 *   • <Panel>      — the rounded card surface a preview sits on.
 *   • <Bar>        — a labeled progress/stat bar.
 *   • <Avatar>     — a tiny gradient monogram chip.
 *   • Greek glyph monograms stand in for real members (no real chapter data).
 */

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        "rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] " +
        className
      }
    >
      {children}
    </div>
  );
}

function Avatar({ glyph, tone = "blue" }: { glyph: string; tone?: "blue" | "sky" | "gold" | "emerald" }) {
  const tones: Record<string, string> = {
    blue: "from-blue-500/25 to-blue-500/10 text-blue-700 ring-blue-500/25",
    sky: "from-sky-500/25 to-sky-500/10 text-sky-700 ring-sky-500/25",
    gold: "from-amber-400/30 to-amber-400/10 text-amber-700 ring-amber-400/30",
    emerald: "from-emerald-500/25 to-emerald-500/10 text-emerald-700 ring-emerald-500/25",
  };
  return (
    <span
      aria-hidden="true"
      className={
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold ring-1 " +
        tones[tone]
      }
    >
      {glyph}
    </span>
  );
}

function Bar({ pct, tone = "blue" }: { pct: number; tone?: "blue" | "emerald" | "gold" }) {
  const fill: Record<string, string> = {
    blue: "bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500",
    emerald: "bg-gradient-to-r from-emerald-500 to-teal-500",
    gold: "bg-gradient-to-r from-amber-500 to-amber-400",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className={"h-full rounded-full " + fill[tone]} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A tiny window header so every preview reads as "a screen in the app". */
function MiniHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-foreground">{title}</span>
      {badge && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {badge}
        </span>
      )}
    </div>
  );
}

/* ── Recruitment pipeline — a Kanban rush funnel ───────────────────────────── */
export function PreviewRecruitment() {
  const cols: { name: string; tone: "blue" | "sky" | "gold" | "emerald"; cards: string[] }[] = [
    { name: "Interested", tone: "sky", cards: ["ΑΒ", "ΓΔ", "ΕΖ"] },
    { name: "Voting", tone: "blue", cards: ["ΗΘ", "ΙΚ"] },
    { name: "Bid", tone: "gold", cards: ["ΛΜ"] },
  ];
  return (
    <Panel>
      <MiniHeader title="Rush pipeline" badge="Live cycle" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {cols.map((c) => (
          <div key={c.name} className="rounded-lg border border-border bg-secondary/30 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {c.name}
              </span>
              <span className="rounded bg-card px-1 text-[10px] font-bold text-foreground">
                {c.cards.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {c.cards.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-1"
                >
                  <Avatar glyph={g} tone={c.tone} />
                  <span className="h-1.5 flex-1 rounded-full bg-secondary" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground">Conversion</span>
          <span>62 of 184 PNMs</span>
        </div>
        <Bar pct={62} />
      </div>
    </Panel>
  );
}

/* ── Automated dues — a Stripe-powered dues ledger ─────────────────────────── */
export function PreviewDues() {
  const rows = [
    { g: "ΑΒ", name: "Member", status: "Paid", tone: "emerald" as const },
    { g: "ΓΔ", name: "Member", status: "Paid", tone: "emerald" as const },
    { g: "ΕΖ", name: "Member", status: "Plan", tone: "gold" as const },
    { g: "ΗΘ", name: "Member", status: "Due", tone: "blue" as const },
  ];
  const statusCls: Record<string, string> = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    gold: "border-amber-400/30 bg-amber-400/10 text-amber-700",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  };
  return (
    <Panel>
      <MiniHeader title="Dues & billing" badge="92% collected" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Collected</span>
          <span className="mt-0.5 block text-lg font-bold text-emerald-600">$18.4k</span>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Outstanding</span>
          <span className="mt-0.5 block text-lg font-bold text-foreground">$1.6k</span>
        </div>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
          >
            <Avatar glyph={r.g} tone={r.tone === "gold" ? "gold" : r.tone === "blue" ? "blue" : "emerald"} />
            <span className="h-1.5 flex-1 rounded-full bg-secondary" />
            <span
              className={
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold " + statusCls[r.tone]
              }
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Events & calendar — a week strip with RSVP ────────────────────────────── */
export function PreviewEvents() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const events = [
    { day: "Chapter meeting", tone: "blue" as const, rsvp: "48 going" },
    { day: "Philanthropy 5K", tone: "gold" as const, rsvp: "31 going" },
    { day: "Formal", tone: "sky" as const, rsvp: "62 going" },
  ];
  const dot: Record<string, string> = {
    blue: "bg-blue-500",
    gold: "bg-amber-400",
    sky: "bg-sky-400",
  };
  return (
    <Panel>
      <MiniHeader title="This week" badge="Synced" />
      <div className="mt-3 grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div
            key={i}
            className={
              "flex flex-col items-center gap-1 rounded-md border py-1.5 " +
              (i === 2
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-border bg-secondary/30")
            }
          >
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">{d}</span>
            <span className={"text-[11px] font-bold " + (i === 2 ? "text-blue-700" : "text-foreground")}>
              {10 + i}
            </span>
            {(i === 2 || i === 4 || i === 5) && (
              <span className={"h-1 w-1 rounded-full " + (i === 2 ? "bg-blue-500" : "bg-amber-400")} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2.5 space-y-1.5">
        {events.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5"
          >
            <span className={"h-2 w-2 shrink-0 rounded-full " + dot[e.tone]} />
            <span className="flex-1 text-[11px] font-medium text-foreground">{e.day}</span>
            <span className="text-[10px] text-muted-foreground">{e.rsvp}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── Officer RBAC — a role/permission matrix ───────────────────────────────── */
export function PreviewRoles() {
  const roles = ["President", "Treasurer", "Recruitment", "Risk"];
  // grid of which module each role can access
  const matrix = [
    [true, true, true, true],
    [false, true, false, false],
    [true, false, true, false],
    [true, true, false, true],
  ];
  const modules = ["Roster", "Dues", "Rush", "Reports"];
  return (
    <Panel>
      <MiniHeader title="Roles & access" badge="4 officers" />
      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1.2fr_repeat(4,1fr)] bg-secondary/50">
          <span className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            Role
          </span>
          {modules.map((m) => (
            <span
              key={m}
              className="px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-muted-foreground"
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
            <span className="px-2 py-1.5 text-[10px] font-medium text-foreground">{r}</span>
            {matrix[ri].map((on, ci) => (
              <span key={ci} className="flex justify-center py-1.5">
                {on ? (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500/15 ring-1 ring-blue-500/30">
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="h-px w-2.5 rounded-full bg-border" />
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
  return (
    <Panel>
      <MiniHeader title="Brand kit" badge="Live preview" />
      <div className="mt-3 grid grid-cols-[1fr_1.1fr] gap-2.5">
        {/* the editor side */}
        <div className="space-y-2">
          <div>
            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Letters
            </span>
            <div className="flex h-7 items-center rounded-md border border-border bg-secondary/30 px-2 text-[11px] font-bold text-blue-700">
              Beta Theta Pi
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Colors
            </span>
            <div className="flex gap-1.5">
              {["#1e40af", "#2563eb", "#38bdf8", "#f59e0b"].map((c) => (
                <span
                  key={c}
                  className="h-5 w-5 rounded-md ring-1 ring-black/10"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        {/* the re-skinned result */}
        <div className="overflow-hidden rounded-lg border border-border">
          <div
            className="flex items-center gap-1.5 px-2.5 py-2"
            style={{ background: "linear-gradient(120deg,#1e40af,#1e40afcc)" }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-[9px] font-bold text-white ring-1 ring-white/30">
              ΒΘΠ
            </span>
            <span className="text-[10px] font-bold text-white">Your chapter</span>
          </div>
          <div className="space-y-1.5 p-2.5">
            <div className="flex gap-1">
              {["Rush", "Dues"].map((t) => (
                <span
                  key={t}
                  className="rounded border px-1.5 py-0.5 text-[9px] font-medium"
                  style={{ color: "#1e40af", borderColor: "#1e40af33", backgroundColor: "#1e40af0d" }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full" style={{ width: "70%", backgroundColor: "#1e40af" }} />
            </div>
            <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full opacity-60" style={{ width: "60%", backgroundColor: "#1e40af" }} />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── Chapter chat — a live message thread (replacement feature) ────────────── */
export function PreviewChat() {
  const msgs = [
    { g: "ΑΒ", tone: "blue" as const, side: "l", w: "w-32" },
    { g: "ΓΔ", tone: "gold" as const, side: "l", w: "w-24" },
    { g: "me", tone: "sky" as const, side: "r", w: "w-28" },
    { g: "ΕΖ", tone: "emerald" as const, side: "l", w: "w-20" },
  ];
  return (
    <Panel>
      <MiniHeader title="#announcements" badge="6 online" />
      <div className="mt-3 space-y-2">
        {msgs.map((m, i) =>
          m.side === "l" ? (
            <div key={i} className="flex items-end gap-1.5">
              <Avatar glyph={m.g} tone={m.tone} />
              <div className={"rounded-2xl rounded-bl-sm border border-border bg-secondary/40 px-2.5 py-1.5 " + m.w}>
                <span className="block h-1.5 w-full rounded-full bg-border" />
                <span className="mt-1 block h-1.5 w-2/3 rounded-full bg-border" />
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-end justify-end gap-1.5">
              <div className={"rounded-2xl rounded-br-sm bg-gradient-to-br from-blue-600 to-sky-500 px-2.5 py-1.5 " + m.w}>
                <span className="block h-1.5 w-full rounded-full bg-white/50" />
                <span className="mt-1 block h-1.5 w-1/2 rounded-full bg-white/40" />
              </div>
            </div>
          )
        )}
      </div>
      {/* composer */}
      <div className="mt-2.5 flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1.5">
        <span className="h-1.5 flex-1 rounded-full bg-border" />
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500">
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h14M12 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Panel>
  );
}

/* ── Alumni & donations — directory + giving total ─────────────────────────── */
export function PreviewAlumni() {
  const people = [
    { g: "ΑΒ", tone: "blue" as const, year: "'18" },
    { g: "ΓΔ", tone: "sky" as const, year: "'15" },
    { g: "ΕΖ", tone: "gold" as const, year: "'09" },
  ];
  return (
    <Panel>
      <MiniHeader title="Alumni network" badge="312 alumni" />
      <div className="mt-3 rounded-lg border border-amber-400/25 bg-gradient-to-br from-amber-400/10 to-amber-400/[0.03] p-2.5">
        <span className="block text-[10px] uppercase tracking-wide text-amber-700">Annual giving</span>
        <div className="mt-0.5 flex items-end gap-2">
          <span className="text-lg font-bold text-foreground">$42,180</span>
          <span className="mb-0.5 text-[10px] font-semibold text-emerald-600">+18%</span>
        </div>
        <div className="mt-1.5">
          <Bar pct={74} tone="gold" />
        </div>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {people.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
          >
            <Avatar glyph={p.g} tone={p.tone} />
            <div className="flex-1 space-y-1">
              <span className="block h-1.5 w-20 rounded-full bg-secondary" />
              <span className="block h-1 w-12 rounded-full bg-secondary/70" />
            </div>
            <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Class of {p.year}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
