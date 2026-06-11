import React from "react";
import {
  Users, UserPlus, Trash2, KeyRound, DollarSign, TrendingUp, Vote, Wallet,
  Gift, Palette, QrCode, Megaphone, Pin, ShieldCheck, ArrowRight, ChevronRight,
} from "lucide-react";
import { brandSecondary } from "../mock-data";
import type { DemoContext } from "../context";

const fmt = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * ExecSurface — the Officer/Admin experience (feature 3).
 *
 * When viewRole === "exec", the bottom nav becomes officer tools and this
 * surface renders the admin content per tab:
 *   roster    → manage members (add/remove/reset), live counts
 *   dues      → dues collection management (collected vs outstanding, batch)
 *   rush      → recruitment pipeline stats + bid management
 *   announce  → post announcement + officer broadcast tools
 *   settings  → officer console: elections, treasury, giving, branding, QR
 *
 * Reuses the existing live dashboardData + handlers — every action mutates real
 * local state so the officer view is genuinely interactive, not a static mock.
 */
export function renderExec(ctx: DemoContext, tab: "roster" | "dues" | "rush" | "announce" | "settings") {
  const {
    dashboardData, selectedBrand, setShowAddMemberModal, handleRemoveMobileMember,
    handleSendMobileResetLink, setSpotlight, setShowPostAnnModal, showToast,
  } = ctx;
  const primary = selectedBrand.primaryColor;
  const second = brandSecondary(selectedBrand);
  const d = dashboardData;
  if (!d) return null;

  const SectionHead = ({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) => (
    <div className="mb-2 flex items-center gap-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
        style={{ background: `linear-gradient(140deg, ${primary}, ${second})` }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-[15px] font-extrabold leading-tight text-slate-900">{title}</h3>
        <p className="text-[11px] text-slate-500 leading-tight">{sub}</p>
      </div>
    </div>
  );

  // ── ROSTER MANAGEMENT ─────────────────────────────────────────────────────
  if (tab === "roster") {
    const actives = d.roster?.actives || [];
    const alumni = d.roster?.alumni || [];
    return (
      <div className="space-y-3 text-left">
        <SectionHead icon={Users} title="Roster" sub="Manage your chapter's members" />

        <div className="grid grid-cols-2 gap-3">
          <Stat primary={primary} label="Active members" value={actives.length} />
          <Stat primary={primary} label="Alumni" value={alumni.length} />
        </div>

        <button
          onClick={() => setShowAddMemberModal(true)}
          className="press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-bold text-white shadow-lg transition active:scale-[0.99]"
          style={{ background: `linear-gradient(135deg, ${primary}, ${second})` }}
        >
          <UserPlus className="h-4 w-4" /> Add member
        </button>

        <div className="gs-glass rounded-2xl p-1.5">
          <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Actives</div>
          <div className="space-y-1.5">
            {actives.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-slate-900">{b.name}</p>
                  <p className="truncate text-[12px] text-slate-500">{b.position || b.major || "Member"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleSendMobileResetLink(b.email, b.name)}
                    className="press flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:text-slate-800"
                    aria-label={`Send reset link to ${b.name}`}
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveMobileMember(b.id, b.name, "actives")}
                    className="press flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                    aria-label={`Remove ${b.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── DUES MANAGEMENT ───────────────────────────────────────────────────────
  if (tab === "dues") {
    const t = d.treasury || {};
    const collected = t.duesCollectedCents || 0;
    const outstanding = t.duesOutstandingCents || 0;
    const total = collected + outstanding;
    const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
    return (
      <div className="space-y-3 text-left">
        <SectionHead icon={DollarSign} title="Dues management" sub="Track collection across the chapter" />

        <div
          className="relative overflow-hidden rounded-2xl border p-4 text-white shadow-lg"
          style={{ background: `linear-gradient(140deg, ${primary}, ${second})`, borderColor: primary }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Collected this term</span>
          <p className="mt-0.5 text-[28px] font-extrabold leading-none">{fmt(collected)}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] font-semibold text-white/90">
            <span>{pct}% collected</span>
            <span>{fmt(outstanding)} outstanding</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat primary={primary} label="Chapter balance" value={fmt(t.balanceCents || 0)} />
          <Stat primary={primary} label="Members behind" value={Math.max(1, Math.round(outstanding / 45000))} />
        </div>

        <button
          onClick={() => { setSpotlight("treasury"); }}
          className="press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-[14px] font-bold text-slate-800 shadow-sm transition hover:border-slate-300"
        >
          <Wallet className="h-4 w-4" /> Open treasury & budgets <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => showToast("Dues reminders sent to all unpaid members.", "success")}
          className="press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-bold text-white shadow-lg transition active:scale-[0.99]"
          style={{ background: `linear-gradient(135deg, ${primary}, ${second})` }}
        >
          <TrendingUp className="h-4 w-4" /> Send dues reminders
        </button>
      </div>
    );
  }

  // ── RUSH / RECRUITMENT PIPELINE ───────────────────────────────────────────
  if (tab === "rush") {
    const pnms = d.pnms || [];
    const bids = pnms.filter((p: any) => p.status === "BID_EXTENDED").length;
    const active = pnms.filter((p: any) => p.status === "ACTIVE").length;
    return (
      <div className="space-y-3 text-left">
        <SectionHead icon={TrendingUp} title="Recruitment pipeline" sub="Manage rush from one board" />

        <div className="grid grid-cols-3 gap-2.5">
          <Stat primary={primary} label="In pipeline" value={pnms.length} />
          <Stat primary={primary} label="Bids out" value={bids} />
          <Stat primary={primary} label="Active" value={active} />
        </div>

        <button
          onClick={() => setSpotlight("qr")}
          className="press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-bold text-white shadow-lg transition active:scale-[0.99]"
          style={{ background: `linear-gradient(135deg, ${primary}, ${second})` }}
        >
          <QrCode className="h-4 w-4" /> Open QR check-in
        </button>

        <div className="gs-glass rounded-2xl p-1.5">
          <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Top prospects</div>
          <div className="space-y-1.5">
            {pnms.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-slate-900">{p.name}</p>
                  <p className="truncate text-[12px] text-slate-500">{p.major} · {p.year}</p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={
                    p.status === "BID_EXTENDED"
                      ? { backgroundColor: primary + "16", color: primary }
                      : { backgroundColor: "#f1f5f9", color: "#64748b" }
                  }
                >
                  {p.status === "BID_EXTENDED" ? "Bid sent" : `${p.votesCount || 0} votes`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
  if (tab === "announce") {
    const anns = d.announcements || [];
    return (
      <div className="space-y-3 text-left">
        <SectionHead icon={Megaphone} title="Announcements" sub="Broadcast to the whole chapter" />

        <button
          onClick={() => setShowPostAnnModal(true)}
          className="press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-bold text-white shadow-lg transition active:scale-[0.99]"
          style={{ background: `linear-gradient(135deg, ${primary}, ${second})` }}
        >
          <Megaphone className="h-4 w-4" /> Post announcement
        </button>

        <div className="space-y-2">
          {anns.map((a: any) => (
            <div key={a.id} className="gs-glass rounded-2xl p-3.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[14px] font-bold leading-snug text-slate-900">{a.title}</h4>
                {a.pinned && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ backgroundColor: primary + "14", color: primary }}>
                    <Pin className="h-3 w-3" /> Pinned
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-600">{a.body}</p>
              <p className="mt-2 text-[11px] font-semibold text-slate-400">{a.authorName} · {a.authorRole}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SETTINGS / OFFICER CONSOLE ────────────────────────────────────────────
  const tools: { id: "elections" | "treasury" | "giving" | "theme" | "qr"; icon: any; label: string; sub: string }[] = [
    { id: "elections", icon: Vote, label: "Officer elections", sub: "Run secret-ballot voting" },
    { id: "treasury", icon: Wallet, label: "Treasury & budgets", sub: "Balance, budget, ledger" },
    { id: "giving", icon: Gift, label: "Alumni giving", sub: "Branded donation campaigns" },
    { id: "qr", icon: QrCode, label: "Rush QR check-in", sub: "Build the PNM list live" },
    { id: "theme", icon: Palette, label: "White-label branding", sub: "Your letters & colors" },
  ];
  return (
    <div className="space-y-3 text-left">
      <SectionHead icon={ShieldCheck} title="Exec console" sub="Role-scoped admin tools" />
      <div className="space-y-2">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setSpotlight(t.id)}
            className="press group flex w-full min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: `linear-gradient(140deg, ${primary}, ${second})` }}
              >
                <t.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-bold text-slate-900">{t.label}</span>
                <span className="block truncate text-[12px] text-slate-500">{t.sub}</span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ primary, label, value }: { primary: string; label: string; value: React.ReactNode }) {
  return (
    <div className="gs-glass rounded-2xl p-3">
      <p className="text-[24px] font-extrabold leading-none" style={{ color: primary }}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
