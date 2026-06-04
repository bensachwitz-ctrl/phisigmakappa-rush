"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/image-url";
import { IconDirectory } from "@/components/brand/icons/directory";
import {
  IconMembers,
  IconArrowRight,
} from "@/components/brand/icons";

/**
 * ────────────────────────────────────────────────────────────────────────────
 * MEMBER DIRECTORY — the chapter composite, alive
 * ────────────────────────────────────────────────────────────────────────────
 * A searchable, filterable, beautiful roster built on the existing Brother data
 * (no new tables). Card grid (1→2→3→4 cols) with a compact table toggle,
 * debounced search, position/pledge-class/status filters, sort, a live result
 * count, and a client-side CSV export of the *filtered* set. Blue/gold glass,
 * custom duotone icons, 4-state buttons, focus-visible, reduced-motion-safe.
 */

export type DirectoryRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  role: string;
  status: string;
  major: string | null;
  hometown: string | null;
  gradYear: string | null;
  pledgeClass: string | null;
  headshotUrl: string | null;
  bigBrotherId: string | null;
  bigName: string | null;
};

type SortKey = "name" | "pledgeClass" | "gradYear";
type ViewMode = "grid" | "table";

// Exec / leadership positions get the gold accent treatment on their badge.
// Matched case-insensitively against a substring of the position string so
// "VP of Finance", "Recruitment Chair", "Co-President", etc. all light up.
const EXEC_KEYWORDS = [
  "president",
  "vice",
  "vp",
  "treasurer",
  "secretary",
  "chair",
  "rush",
  "recruit",
  "social",
  "risk",
  "philanthropy",
  "scholarship",
  "membership",
  "exec",
  "officer",
  "director",
  "warden",
  "marshal",
  "historian",
  "sergeant",
];

function isExecPosition(position: string | null): boolean {
  if (!position) return false;
  const p = position.toLowerCase();
  return EXEC_KEYWORDS.some((k) => p.includes(k));
}

// Friendly, color-coded status pill. Unknown statuses fall back to neutral.
function statusStyle(status: string): { label: string; className: string } {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "ACTIVE":
      return { label: "Active", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
    case "INITIATE":
      return { label: "Initiate", className: "bg-sky-50 text-sky-700 ring-sky-200" };
    case "PLEDGE":
      return { label: "Pledge", className: "bg-blue-50 text-blue-700 ring-blue-200" };
    case "PROSPECT":
      return { label: "Prospect", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" };
    case "ALUMNUS":
    case "ALUMNI":
      return { label: "Alumni", className: "bg-amber-50 text-amber-800 ring-amber-200" };
    case "INACTIVE":
      return { label: "Inactive", className: "bg-zinc-100 text-zinc-600 ring-zinc-200" };
    case "EXPELLED":
      return { label: "Expelled", className: "bg-rose-50 text-rose-700 ring-rose-200" };
    default:
      return {
        label: status ? status.charAt(0) + status.slice(1).toLowerCase() : "—",
        className: "bg-zinc-100 text-zinc-600 ring-zinc-200",
      };
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// CSV cell escaping — wrap in quotes when the value contains a comma, quote, or
// newline; double internal quotes. Prefix a leading =,+,-,@ with a single quote
// to neutralize spreadsheet formula injection.
function csvCell(value: string | null | undefined): string {
  let v = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  if (/[",\n\r]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

export function DirectoryManager({ initial }: { initial: DirectoryRow[] }) {
  const reduce = useReducedMotion();

  const [list] = React.useState<DirectoryRow[]>(initial);
  const [rawQuery, setRawQuery] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [position, setPosition] = React.useState<string>("");
  const [pledgeClass, setPledgeClass] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");
  const [sort, setSort] = React.useState<SortKey>("name");
  const [view, setView] = React.useState<ViewMode>("grid");

  // Debounce the search box (180ms) so filtering a 100+ roster stays smooth.
  React.useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Distinct filter options derived from the data (sorted, blanks dropped).
  const positionOptions = React.useMemo(
    () => uniqueSorted(list.map((b) => b.position)),
    [list]
  );
  const pledgeOptions = React.useMemo(
    () => uniqueSorted(list.map((b) => b.pledgeClass)),
    [list]
  );
  const statusOptions = React.useMemo(
    () => uniqueSorted(list.map((b) => b.status)),
    [list]
  );

  const filtered = React.useMemo(() => {
    let out = list.filter((b) => {
      if (position && b.position !== position) return false;
      if (pledgeClass && b.pledgeClass !== pledgeClass) return false;
      if (status && (b.status || "").toUpperCase() !== status.toUpperCase()) return false;
      if (query) {
        const hay = [b.name, b.major, b.hometown, b.position, b.pledgeClass, b.gradYear, b.bigName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    out = [...out].sort((a, b) => {
      if (sort === "pledgeClass") {
        return (
          collate(a.pledgeClass, b.pledgeClass) || a.name.localeCompare(b.name)
        );
      }
      if (sort === "gradYear") {
        // Most-recent grad year first; blanks sink to the bottom.
        return collateNumDesc(a.gradYear, b.gradYear) || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    return out;
  }, [list, position, pledgeClass, status, query, sort]);

  const hasActiveFilters = !!(query || position || pledgeClass || status);

  function clearFilters() {
    setRawQuery("");
    setQuery("");
    setPosition("");
    setPledgeClass("");
    setStatus("");
    setSort("name");
  }

  function exportCsv() {
    const header = [
      "name",
      "email",
      "phone",
      "position",
      "major",
      "hometown",
      "gradYear",
      "pledgeClass",
      "big",
    ];
    const lines = [header.join(",")];
    for (const b of filtered) {
      lines.push(
        [
          csvCell(b.name),
          csvCell(b.email),
          csvCell(b.phone),
          csvCell(b.position),
          csvCell(b.major),
          csvCell(b.hometown),
          csvCell(b.gradYear),
          csvCell(b.pledgeClass),
          csvCell(b.bigName),
        ].join(",")
      );
    }
    // Prepend a BOM so Excel reads UTF-8 (accented names) correctly.
    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `member-directory-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Defer revoke so Safari/iOS finishes the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-5">
      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="gs-glass rounded-2xl border border-border/60 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <SearchGlyph />
            </span>
            <Input
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Search name, major, hometown, position…"
              aria-label="Search members"
              className="pl-9"
            />
            {rawQuery && (
              <button
                type="button"
                onClick={() => setRawQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red"
              >
                <XGlyph />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div
            className="inline-flex rounded-xl bg-muted p-1 border border-border self-start lg:self-auto"
            role="tablist"
            aria-label="Layout"
          >
            <ToggleButton active={view === "grid"} onClick={() => setView("grid")}>
              <GridGlyph /> Cards
            </ToggleButton>
            <ToggleButton active={view === "table"} onClick={() => setView("table")}>
              <RowsGlyph /> Table
            </ToggleButton>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterSelect
            label="Position"
            value={position}
            onChange={setPosition}
            options={positionOptions}
            allLabel="All positions"
          />
          <FilterSelect
            label="Pledge class"
            value={pledgeClass}
            onChange={setPledgeClass}
            options={pledgeOptions}
            allLabel="All pledge classes"
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={statusOptions}
            allLabel="All statuses"
            renderOption={(o) => statusStyle(o).label}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(v) => setSort((v as SortKey) || "name")}
            options={["name", "pledgeClass", "gradYear"]}
            renderOption={(o) =>
              o === "name" ? "Name (A–Z)" : o === "pledgeClass" ? "Pledge class" : "Grad year"
            }
            allowEmpty={false}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red rounded px-1"
            >
              Clear all
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "member" : "members"}
              {hasActiveFilters && (
                <span className="text-muted-foreground/70">
                  {" "}
                  of {list.length}
                </span>
              )}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="gap-1.5"
            >
              <DownloadGlyph /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState everEmpty={list.length === 0} onClear={clearFilters} />
      ) : view === "grid" ? (
        <CardGrid rows={filtered} reduce={!!reduce} />
      ) : (
        <RosterTable rows={filtered} />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Card grid
 * ────────────────────────────────────────────────────────────────────────── */

function CardGrid({ rows, reduce }: { rows: DirectoryRow[]; reduce: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map((b, i) => (
        <motion.div
          key={b.id}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={
            reduce
              ? undefined
              : {
                  duration: 0.4,
                  // Stagger only the first paint-load; cap the delay so a large
                  // roster never feels sluggish.
                  delay: Math.min(i * 0.03, 0.4),
                  ease: [0.16, 1, 0.3, 1],
                }
          }
        >
          <MemberCard b={b} />
        </motion.div>
      ))}
    </div>
  );
}

function MemberCard({ b }: { b: DirectoryRow }) {
  const exec = isExecPosition(b.position);
  const st = statusStyle(b.status);
  const meta = [b.major, b.hometown].filter(Boolean).join(" · ");

  return (
    <div className="group relative h-full rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 gs-card-glow hover:-translate-y-1 hover:border-phisig-red/40">
      <div className="flex items-start gap-3.5">
        <Avatar name={b.name} src={b.headshotUrl} exec={exec} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight truncate">{b.name}</h3>
          {b.position ? (
            <p
              className={cn(
                "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1",
                exec
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-phisig-red/10 text-phisig-red ring-phisig-red/20"
              )}
            >
              {exec && <CrownGlyph />}
              <span className="truncate max-w-[12rem]">{b.position}</span>
            </p>
          ) : (
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
              Member
            </p>
          )}
        </div>
      </div>

      {meta && (
        <p className="mt-3 text-sm text-muted-foreground truncate">{meta}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
            st.className
          )}
        >
          {st.label}
        </span>
        {b.pledgeClass && (
          <span className="inline-flex items-center rounded-full bg-phisig-red/10 px-2 py-0.5 text-[10px] font-semibold text-phisig-red ring-1 ring-phisig-red/20">
            {b.pledgeClass}
          </span>
        )}
        {b.gradYear && (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
            <CapGlyph /> {b.gradYear}
          </span>
        )}
      </div>

      {b.bigName && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <LinkGlyph />
          Big: <span className="font-medium text-foreground">{b.bigName}</span>
        </p>
      )}

      {/* Contact actions — pinned to the card bottom for a clean grid baseline. */}
      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
        {b.email ? (
          <ContactAction href={`mailto:${b.email}`} label={`Email ${b.name}`} title={b.email}>
            <MailGlyph /> Email
          </ContactAction>
        ) : null}
        {b.phone ? (
          <ContactAction href={`tel:${b.phone}`} label={`Call ${b.name}`} title={b.phone}>
            <PhoneGlyph /> Call
          </ContactAction>
        ) : null}
        {!b.email && !b.phone && (
          <span className="text-xs text-muted-foreground/60">No contact on file</span>
        )}
      </div>
    </div>
  );
}

function Avatar({ name, src, exec }: { name: string; src: string | null; exec: boolean }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarSrc(src, 112)}
        alt=""
        className={cn(
          "h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-offset-2 ring-offset-card",
          exec ? "ring-[color:var(--gs-gold)]" : "ring-phisig-red/55"
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "h-14 w-14 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ring-2 ring-offset-2 ring-offset-card",
        "bg-gradient-to-br from-phisig-red to-phisig-red-dark",
        exec ? "ring-[color:var(--gs-gold)]" : "ring-white/40"
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

function ContactAction({
  href,
  label,
  title,
  children,
}: {
  href: string;
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-all hover:border-phisig-red/50 hover:bg-secondary hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red focus-visible:ring-offset-1"
    >
      {children}
    </a>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Compact table
 * ────────────────────────────────────────────────────────────────────────── */

function RosterTable({ rows }: { rows: DirectoryRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Member</th>
            <th className="px-4 py-3 font-semibold hidden md:table-cell">Position</th>
            <th className="px-4 py-3 font-semibold hidden lg:table-cell">Major</th>
            <th className="px-4 py-3 font-semibold hidden lg:table-cell">Hometown</th>
            <th className="px-4 py-3 font-semibold hidden sm:table-cell">Pledge</th>
            <th className="px-4 py-3 font-semibold hidden sm:table-cell">Grad</th>
            <th className="px-4 py-3 font-semibold hidden xl:table-cell">Big</th>
            <th className="px-4 py-3 font-semibold text-right">Contact</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const exec = isExecPosition(b.position);
            const st = statusStyle(b.status);
            return (
              <tr
                key={b.id}
                className="border-b border-border/60 last:border-0 transition-colors hover:bg-secondary/40"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarSm name={b.name} src={b.headshotUrl} exec={exec} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.name}</div>
                      <span
                        className={cn(
                          "mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1",
                          st.className
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {b.position ? (
                    <span className={cn("inline-flex items-center gap-1", exec && "text-amber-700 font-medium")}>
                      {exec && <CrownGlyph />}
                      {b.position}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{b.major || "—"}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{b.hometown || "—"}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{b.pledgeClass || "—"}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground tabular-nums">{b.gradYear || "—"}</td>
                <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">{b.bigName || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {b.email && (
                      <a
                        href={`mailto:${b.email}`}
                        aria-label={`Email ${b.name}`}
                        title={b.email}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:text-phisig-red hover:border-phisig-red/40 hover:bg-secondary active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red"
                      >
                        <MailGlyph />
                      </a>
                    )}
                    {b.phone && (
                      <a
                        href={`tel:${b.phone}`}
                        aria-label={`Call ${b.name}`}
                        title={b.phone}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:text-phisig-red hover:border-phisig-red/40 hover:bg-secondary active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red"
                      >
                        <PhoneGlyph />
                      </a>
                    )}
                    {!b.email && !b.phone && <span className="text-xs text-muted-foreground/50">—</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AvatarSm({ name, src, exec }: { name: string; src: string | null; exec: boolean }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarSrc(src, 72)}
        alt=""
        className={cn(
          "h-9 w-9 rounded-full object-cover shrink-0 ring-1",
          exec ? "ring-[color:var(--gs-gold)]" : "ring-border"
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white",
        "bg-gradient-to-br from-phisig-red to-phisig-red-dark"
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Empty state
 * ────────────────────────────────────────────────────────────────────────── */

function EmptyState({ everEmpty, onClear }: { everEmpty: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 px-6 text-center">
      <span
        className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-phisig-red to-phisig-red-dark text-white shadow-lg shadow-phisig-red/30"
        aria-hidden="true"
      >
        {everEmpty ? <IconMembers className="h-7 w-7" accent="rgba(255,255,255,0.85)" /> : <IconDirectory className="h-7 w-7" accent="rgba(255,255,255,0.85)" />}
      </span>
      {everEmpty ? (
        <>
          <h3 className="mt-4 text-base font-semibold tracking-tight">The directory is empty.</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
            Once brothers are added to the roster, the chapter composite shows up here — searchable,
            filterable, and ready to export.
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-4 text-base font-semibold tracking-tight">No members match.</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
            Try a different search or loosen the filters.
          </p>
          <Button variant="outline" size="sm" onClick={onClear} className="mt-4">
            Clear filters <IconArrowRight className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Controls — primitives
 * ────────────────────────────────────────────────────────────────────────── */

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
  renderOption,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel?: string;
  renderOption?: (o: string) => string;
  allowEmpty?: boolean;
}) {
  // Native <select> styled to the design system — zero extra deps, fully
  // keyboard + screen-reader accessible, and reliable inside the admin shell.
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          "h-9 appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-xs font-medium text-foreground cursor-pointer transition-colors hover:border-phisig-red/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red focus-visible:ring-offset-1",
          value && "border-phisig-red/45 text-phisig-red"
        )}
      >
        {allowEmpty && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        <ChevronGlyph />
      </span>
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

function uniqueSorted(values: (string | null)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const t = (v || "").trim();
    if (t) set.add(t);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function collate(a: string | null, b: string | null): number {
  // Blanks always sort last.
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function collateNumDesc(a: string | null, b: string | null): number {
  const na = a ? parseInt(a, 10) : NaN;
  const nb = b ? parseInt(b, 10) : NaN;
  const aOk = !Number.isNaN(na);
  const bOk = !Number.isNaN(nb);
  if (!aOk && !bOk) return 0;
  if (!aOk) return 1;
  if (!bOk) return -1;
  return nb - na;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Inline glyphs — small interface marks tuned to the duotone icon language
 * (currentColor primary + a soft sky accent). Kept local so the directory is
 * self-contained and never edits the shared icon barrel.
 * ────────────────────────────────────────────────────────────────────────── */

function g(className?: string) {
  return cn("h-3.5 w-3.5 shrink-0", className);
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="var(--brand-primary, #C8102E)" fillOpacity={0.14} />
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={g()} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="var(--brand-primary, #C8102E)" fillOpacity={0.14} stroke="none" />
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M4 7.5l8 5.5 8-5.5" />
    </svg>
  );
}

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={g()} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2Z" fill="var(--brand-primary, #C8102E)" fillOpacity={0.14} />
      <path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function CrownGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13L4 8Z" fill="var(--gs-gold, #f59e0b)" fillOpacity={0.25} />
      <path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13L4 8Z" />
    </svg>
  );
}

function CapGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5l9 4-9 4-9-4 9-4Z" />
      <path d="M6 10.5V14c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-3.5" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-phisig-red" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 14.5l5-5" />
      <path d="M8 11l-1.5 1.5a3 3 0 0 0 4.2 4.2L12 15.5" />
      <path d="M16 13l1.5-1.5a3 3 0 0 0-4.2-4.2L12 8.5" />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v9m0 0l-3.5-3.5M12 13l3.5-3.5" />
      <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function GridGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function RowsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
