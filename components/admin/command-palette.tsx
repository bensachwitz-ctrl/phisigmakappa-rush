"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard, Users, CalendarDays, Megaphone, Settings, HelpCircle,
  Vote, ScrollText, Sparkles, Rocket, ExternalLink, Search,
  ArrowRight, Command,
  UserPlus, CalendarCheck, ShieldAlert, GraduationCap, CheckSquare,
  HandHeart, ShieldCheck, BookMarked, FileDown, Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Global command palette — opens with ⌘K / Ctrl+K (or "?" shortcut).
 * Power-user navigation; the chapter never needs to know about it for
 * the basics, but the e-board members who use the platform daily will
 * find it indispensable.
 *
 * Commands list is curated (not auto-derived) so the order is deliberate:
 * most-used routes first, infrequent ones last.
 *
 * Filtering is case-insensitive substring match on the command label
 * AND a fuzzy synonym list (so "people" finds Brothers, "stats" finds
 * the dashboard, etc.).
 *
 * Keyboard:
 *   ⌘K / Ctrl+K   open
 *   Esc            close
 *   ↑ ↓            move selection
 *   ↵              execute selected
 */

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  action?: () => void;
  icon: React.ElementType;
  synonyms?: string[];
  group: "Navigate" | "Actions" | "External" | "Help";
  // Filtered out of the command list when the viewer is a non-admin (member)
  // so we don't surface routes that will 403 them.
  adminOnly?: boolean;
};

export function CommandPalette({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // Build the command list. Admin-only commands hidden for member view.
  const commands: Cmd[] = React.useMemo(() => {
    const base: Cmd[] = [
      // Navigate
      { id: "nav-rush", group: "Navigate", icon: LayoutDashboard, label: "Rush dashboard", href: "/admin", synonyms: ["pnms", "candidates", "decisions", "stats", "kpi"] },
      { id: "nav-rushees", group: "Navigate", icon: UserPlus, label: "PNMs / Rushees", href: "/admin/rushees", synonyms: ["candidates", "recruits", "potential new members", "pledges", "interest"], adminOnly: true },
      { id: "nav-brothers", group: "Navigate", icon: Users, label: "Brothers", href: "/admin/brothers", synonyms: ["roster", "people", "members", "directory"] },
      { id: "nav-meetings", group: "Navigate", icon: CalendarCheck, label: "Meetings", href: "/admin/meetings", synonyms: ["minutes", "agenda", "attendance", "chapter meeting", "quorum"] },
      { id: "nav-risk", group: "Navigate", icon: ShieldAlert, label: "Risk Desk / Incidents", href: "/admin/risk", synonyms: ["hazing", "incident", "report", "safety"] },
      { id: "nav-academic", group: "Navigate", icon: GraduationCap, label: "Academic", href: "/admin/academic", synonyms: ["gpa", "grades", "study hours", "scholarship"] },
      { id: "nav-chores", group: "Navigate", icon: CheckSquare, label: "Chores / House", href: "/admin/chores", synonyms: ["tasks", "duties", "house", "cleaning", "checklist"] },
      { id: "nav-service", group: "Navigate", icon: HandHeart, label: "Service hours", href: "/admin/service", synonyms: ["philanthropy", "volunteer", "community", "hours"] },
      { id: "nav-polls", group: "Navigate", icon: Vote, label: "Polls", href: "/admin/polls", synonyms: ["vote", "decision"] },
      { id: "nav-events", group: "Navigate", icon: CalendarDays, label: "Events", href: "/admin/events", synonyms: ["calendar", "schedule", "rsvp"], adminOnly: true },
      { id: "nav-news", group: "Navigate", icon: Megaphone, label: "News / Announcements", href: "/admin/announcements", synonyms: ["broadcast", "post", "blast"], adminOnly: true },
      { id: "nav-officers", group: "Navigate", icon: ShieldCheck, label: "Officers / RBAC", href: "/admin/officers", synonyms: ["roles", "permissions", "positions", "eboard", "executive", "rbac", "access"], adminOnly: true },
      { id: "nav-library", group: "Navigate", icon: BookMarked, label: "Library / Documents", href: "/admin/library", synonyms: ["docs", "files", "bylaws", "resources", "documents"] },
      { id: "nav-audit", group: "Navigate", icon: ScrollText, label: "Audit log", href: "/admin/audit", synonyms: ["history", "governance", "trail", "who changed"], adminOnly: true },
      { id: "nav-settings", group: "Navigate", icon: Settings, label: "Site content / settings", href: "/admin/settings", synonyms: ["config", "brand", "colors", "advisor"], adminOnly: true },
      // Actions / quick jumps
      { id: "act-setup", group: "Actions", icon: Rocket, label: "Chapter setup wizard", href: "/admin/setup", synonyms: ["onboard", "rebrand", "configure", "white label", "white-label"], adminOnly: true },
      { id: "act-dues-connect", group: "Actions", icon: Banknote, label: "Payouts / Stripe Connect", href: "/admin/dues/connect", synonyms: ["stripe", "connect", "payouts", "bank", "billing", "money", "dues"], adminOnly: true },
      { id: "act-exports", group: "Actions", icon: FileDown, label: "HQ Exports", href: "/admin/exports", synonyms: ["download", "csv", "report", "headquarters", "nationals", "data"], adminOnly: true },
      { id: "act-export-rushes", group: "Actions", icon: ScrollText, label: "Download PNM roster CSV", href: "/api/admin/export", adminOnly: true },
      { id: "act-export-brothers", group: "Actions", icon: ScrollText, label: "Download Brothers CSV", href: "/api/admin/export/brothers", adminOnly: true },
      { id: "act-digest", group: "Actions", icon: ScrollText, label: "Weekly digest (JSON)", href: "/api/admin/digest", adminOnly: true },
      // External
      { id: "ext-home", group: "External", icon: ExternalLink, label: "View public homepage", href: "/", synonyms: ["site", "live", "public"] },
      { id: "ext-help", group: "Help", icon: HelpCircle, label: "Open admin handbook (Help)", href: "/admin/help", synonyms: ["docs", "how"] },
    ];
    return base.filter((c) => !c.adminOnly || isAdmin);
  }, [isAdmin]);

  // Filter against label + synonyms (case-insensitive substring).
  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((c) => {
      const hay = (c.label + " " + (c.synonyms || []).join(" ") + " " + c.group).toLowerCase();
      return hay.includes(needle);
    });
  }, [commands, q]);

  // Reset selection when results change.
  React.useEffect(() => {
    setActiveIdx(0);
  }, [q, open]);

  // Group results for rendering (preserves order within group).
  const grouped = React.useMemo(() => {
    const groups: Record<string, Cmd[]> = {};
    for (const c of filtered) {
      (groups[c.group] = groups[c.group] || []).push(c);
    }
    return groups;
  }, [filtered]);

  // Flat order matches keyboard navigation order
  const flatIdx = React.useMemo(() => {
    const order: { cmd: Cmd; idx: number }[] = [];
    let i = 0;
    for (const g of Object.keys(grouped)) {
      for (const c of grouped[g]) {
        order.push({ cmd: c, idx: i++ });
      }
    }
    return order;
  }, [grouped]);

  function execute(cmd: Cmd) {
    setOpen(false);
    setQ("");
    if (cmd.action) cmd.action();
    else if (cmd.href) {
      if (cmd.href.startsWith("/api/") || cmd.id === "ext-home") {
        // External / file download — new tab so we don't break the admin context
        window.open(cmd.href, "_blank", "noopener,noreferrer");
      } else {
        router.push(cmd.href);
      }
    }
  }

  // Global ⌘K / Ctrl+K binding + Escape close + arrow navigation
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = filtered[activeIdx];
        if (sel) execute(sel);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIdx]);

  // Autofocus input + scroll active row into view
  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);
  React.useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${activeIdx}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 overflow-hidden" aria-label="Command palette">
        {/* Visually-hidden title for SR users — DialogContent requires a
            DialogTitle for a11y or it throws a console warning. */}
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Jump to a page, find a command, search docs…"
              className="flex-1 bg-transparent outline-none text-sm"
              aria-label="Search commands"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Esc
            </kbd>
          </div>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1" role="listbox">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No commands match "{q}".
            </p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="py-1">
                <p className="px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  {group}
                </p>
                {items.map((c) => {
                  const flat = flatIdx.find((f) => f.cmd.id === c.id);
                  const isActive = flat?.idx === activeIdx;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-cmd-idx={flat?.idx}
                      onMouseEnter={() => setActiveIdx(flat?.idx ?? 0)}
                      onClick={() => execute(c)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                        isActive ? "bg-phisig-red-soft text-foreground" : "hover:bg-secondary"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-phisig-red" : "text-muted-foreground")} aria-hidden="true" />
                      <span className="flex-1 truncate">{c.label}</span>
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-phisig-red shrink-0" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Command className="h-3 w-3" aria-hidden="true" />
            <kbd className="rounded border border-border bg-secondary px-1">↑↓</kbd> to navigate
            <kbd className="rounded border border-border bg-secondary px-1 ml-1.5">↵</kbd> to open
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            tip: try "audit" or "setup"
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Floating launcher button (mobile) — visible in the bottom-right corner
// for users who don't know the ⌘K shortcut.
export function CommandPaletteLauncher({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open command palette (Cmd+K)"
      className="fixed bottom-4 right-4 z-40 flex sm:hidden items-center gap-1.5 rounded-full bg-foreground/90 text-background px-3 py-2 text-xs font-medium shadow-lg hover:bg-foreground transition-colors"
    >
      <Command className="h-3 w-3" aria-hidden="true" />
      <kbd className="text-[10px]">⌘K</kbd>
    </button>
  );
}
