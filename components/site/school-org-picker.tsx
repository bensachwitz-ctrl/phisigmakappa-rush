"use client";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SCHOOL + ORG PICKER  —  two polished, accessible typeahead comboboxes
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Built for the deep-ink Greekstack signup wizard. A chapter picks their SCHOOL
 * and their FRATERNITY/SORORITY; each pick returns the full data object so the
 * wizard can prefill brand colors, the chapter/school name, and the Greek
 * letters.
 *
 * WHAT THE ONBOARD AGENT NEEDS TO KNOW (the wiring contract)
 * ----------------------------------------------------------------------------
 *   import { SchoolPicker, OrgPicker } from "@/components/site/school-org-picker";
 *
 *   <SchoolPicker value={school} onChange={setSchool} />
 *   <OrgPicker type="fraternity" value={org} onChange={setOrg} />
 *
 * onChange fires with EITHER a catalog object OR a custom (manually-entered)
 * object, and with `null` when the field is cleared. Both shapes are discriminated
 * by `custom: boolean` and are 100% serializable.
 *
 *   SchoolSelection (what <SchoolPicker onChange> gives you):
 *     { custom: false, name, short, city, state, colors: [primary, secondary] }
 *     { custom: true,  name, short: "",       colors: [primary, primary] }   // manual
 *
 *   OrgSelection (what <OrgPicker onChange> gives you):
 *     { custom: false, name, short, letters, type, colors: [primary, secondary] }
 *     { custom: true,  name, short: "", letters, type, colors: [primary, primary] }
 *
 * Map straight onto the wizard's existing fields, e.g.:
 *     school → schoolName = s.name · schoolShort = s.short
 *              primaryColor = s.colors[0] (school theme, if desired)
 *     org    → fraternityName = o.name · fraternityShort = o.short
 *              fraternityLetters / greekLettersGlyphs = o.letters
 *              orgType = o.type · primaryColor = o.colors[0] · darkColor = o.colors[1]
 *
 * `colors` is ALWAYS a defined [string, string] (custom picks duplicate the one
 * chosen color into both slots) so the consumer never has to null-check it.
 *
 * ACCESSIBILITY
 *   • WAI-ARIA 1.2 combobox pattern: input has role="combobox", aria-expanded,
 *     aria-controls, aria-autocomplete="list", aria-activedescendant.
 *   • Listbox has role="listbox"; options role="option" + aria-selected.
 *   • Keyboard: ArrowDown/ArrowUp move + open, Enter selects, Escape closes (then
 *     clears on a second press), Home/End jump, Tab closes and commits focus.
 *   • Selection changes announced via an aria-live="polite" status region.
 *   • Matched substrings are visually highlighted (decorative <mark>).
 *
 * MOTION / THEME
 *   • Deep-ink / royal-blue / sky / gold styling to match the wizard's glass UI.
 *   • framer-motion dropdown reveal that fully respects prefers-reduced-motion
 *     (collapses to an instant show via useReducedMotion).
 *   • 44px tap targets, mobile-friendly, scrollable bounded listbox.
 */

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  IconSubdomain,
  IconCheck,
  IconClose,
  IconChevronDown,
  IconBranding,
} from "@/components/brand/icons";
import { searchSchools, type School } from "@/lib/schools";
import { searchOrgs, type GreekOrg, type OrgCategory } from "@/lib/greek-orgs-catalog";
import { cn } from "@/lib/utils";

/* ───────────────────────────── Public output types ────────────────────────── */

/** What `<SchoolPicker onChange>` emits. `null` = field cleared. */
export type SchoolSelection =
  | {
      custom: false;
      name: string;
      short: string;
      city: string;
      state: string;
      colors: [string, string];
    }
  | {
      custom: true;
      name: string;
      short: string; // always "" for custom
      colors: [string, string]; // [picked, picked]
    };

/** What `<OrgPicker onChange>` emits. `null` = field cleared. */
export type OrgSelection =
  | {
      custom: false;
      name: string;
      short: string;
      letters: string;
      type: OrgCategory;
      colors: [string, string];
    }
  | {
      custom: true;
      name: string;
      short: string; // always "" for custom
      letters: string;
      type: OrgCategory;
      colors: [string, string]; // [picked, picked]
    };

/* ───────────────────────────── Shared sub-components ───────────────────────── */

/** Two color dots side by side — the swatch preview of a [primary, secondary] pair. */
function Swatches({ colors, className }: { colors: [string, string]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden="true">
      {colors.map((c, i) => (
        <span
          key={i}
          className="h-3 w-3 rounded-full ring-1 ring-white/25 shadow-sm"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

/**
 * Render `text` with every case-insensitive occurrence of `query` wrapped in a
 * highlighted <mark>. Decorative only (the full label is still the accessible
 * name of the option). Defensive: escapes the query for the RegExp.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-[3px] bg-sky-400/25 px-0.5 text-sky-100 [text-decoration:none]"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/** A tiny, accessible hex color picker used by the "enter manually" escape hatch. */
function MiniColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-slate-300">
        {label}
      </label>
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded-md border border-white/10 bg-white/5 p-0.5 shadow-sm"
        aria-label={`${label} color`}
      />
      <span className="font-mono text-[11px] uppercase text-slate-400">{value}</span>
    </div>
  );
}

/* ─────────────────────────────── Core combobox ────────────────────────────── */

/**
 * Generic, fully-accessible typeahead combobox. The two public pickers below are
 * thin wrappers that supply the search fn + how to render an option + how to map
 * a chosen item / custom entry to their output shape.
 *
 * Owns ONLY the open/query/highlight UI state; the selected value is controlled
 * by the parent (so the wizard remains the single source of truth).
 */
function Combobox<T>({
  idBase,
  label,
  placeholder,
  emptyHint,
  items,
  query,
  onQueryChange,
  selectedLabel,
  getKey,
  renderOption,
  onSelect,
  onClear,
  customPanel,
  reduce,
}: {
  idBase: string;
  label: string;
  placeholder: string;
  emptyHint: string;
  items: T[];
  query: string;
  onQueryChange: (q: string) => void;
  /** When a value is committed, the read-only text shown in the input. */
  selectedLabel: string | null;
  getKey: (item: T, index: number) => string;
  renderOption: (item: T, query: string, active: boolean) => React.ReactNode;
  onSelect: (item: T) => void;
  onClear: () => void;
  /** The "Can't find it?" manual-entry panel (rendered under the list). */
  customPanel: React.ReactNode;
  reduce: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const listId = `${idBase}-listbox`;
  const labelId = `${idBase}-label`;
  const statusId = `${idBase}-status`;
  const optionId = (i: number) => `${idBase}-opt-${i}`;

  // Clamp the active option whenever the result set shrinks/grows.
  React.useEffect(() => {
    setActiveIndex((i) => Math.min(Math.max(i, 0), Math.max(items.length - 1, 0)));
  }, [items.length]);

  // Keep the active option scrolled into view inside the bounded list.
  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(activeIndex))}`);
    el?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open]);

  // Close on outside click / focus leaving the whole widget.
  React.useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("touchstart", onDocPointer);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("touchstart", onDocPointer);
    };
  }, [open]);

  function commit(item: T) {
    onSelect(item);
    setOpen(false);
    // Return focus to the input so keyboard users keep context.
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (items.length) setActiveIndex((i) => (i + 1) % items.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (items.length) setActiveIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case "Home":
        if (open && items.length) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (open && items.length) {
          e.preventDefault();
          setActiveIndex(items.length - 1);
        }
        break;
      case "Enter":
        if (open && items[activeIndex]) {
          e.preventDefault();
          commit(items[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else if (query || selectedLabel) {
          // Second Escape (list already closed) clears the field.
          onClear();
          onQueryChange("");
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  const showList = open;

  return (
    <div ref={rootRef} className="relative">
      <label
        id={labelId}
        htmlFor={`${idBase}-input`}
        className="mb-1.5 block text-sm font-semibold text-slate-200"
      >
        {label}
      </label>

      <div
        className={cn(
          "relative flex items-center rounded-lg border bg-white/5 transition-colors",
          open ? "border-sky-400/60 ring-2 ring-sky-400/30" : "border-white/10"
        )}
      >
        <IconSubdomain
          className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={`${idBase}-input`}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-labelledby={labelId}
          aria-activedescendant={open && items[activeIndex] ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          // Show the committed label until the user starts typing again.
          value={query}
          placeholder={selectedLabel ? selectedLabel : placeholder}
          onChange={(e) => {
            onQueryChange(e.target.value);
            if (!open) setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-11 min-h-[44px] w-full rounded-lg bg-transparent pl-9 pr-16 text-sm text-white outline-none placeholder:text-slate-500",
            // When a value is committed but the query is empty, the placeholder is
            // the chosen label — show it in a confident near-white instead of the
            // muted placeholder grey.
            selectedLabel && !query && "placeholder:font-semibold placeholder:text-slate-200"
          )}
        />

        {/* Clear button — only when there's something to clear. */}
        {(query || selectedLabel) && (
          <button
            type="button"
            onClick={() => {
              onClear();
              onQueryChange("");
              setOpen(true);
              inputRef.current?.focus();
            }}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute right-9 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Disclosure toggle. */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-white"
        >
          <IconChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {/* aria-live region announces the committed selection to screen readers. */}
      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {selectedLabel ? `${selectedLabel} selected.` : ""}
      </span>

      <AnimatePresence>
        {showList && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.985 }}
            transition={reduce ? { duration: 0 } : { duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full z-30 mt-2 origin-top overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-blue-950/40 ring-1 ring-white/5 backdrop-blur-xl"
          >
            <ul
              id={listId}
              ref={listRef}
              role="listbox"
              aria-labelledby={labelId}
              className="max-h-72 overflow-y-auto py-1.5 [scrollbar-width:thin]"
            >
              {items.length === 0 ? (
                <li
                  role="option"
                  aria-selected={false}
                  aria-disabled="true"
                  className="px-3 py-6 text-center text-sm text-slate-400"
                >
                  {emptyHint}
                </li>
              ) : (
                items.map((item, i) => {
                  const active = i === activeIndex;
                  return (
                    <li
                      key={getKey(item, i)}
                      id={optionId(i)}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIndex(i)}
                      // onMouseDown (not onClick) so the input's blur doesn't close
                      // the list before the selection is registered.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        commit(item);
                      }}
                      className={cn(
                        "mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                        active ? "bg-sky-500/15 text-white" : "text-slate-200 hover:bg-white/5"
                      )}
                    >
                      {renderOption(item, query, active)}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Manual-entry escape hatch lives under the list, always reachable. */}
            <div className="border-t border-white/10 bg-white/[0.02] p-2.5">{customPanel}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── "Can't find it?" manual panel ─────────────────────── */

/**
 * Shared manual-entry panel: a collapsed "Can't find it? Enter manually" button
 * that expands to a name field + a color picker, and an "Add" action. Used by
 * both pickers; the parent supplies the extra fields (e.g. Greek letters for the
 * org picker) via `extraFields` and the commit handler via `onAdd`.
 */
function ManualPanel({
  idBase,
  open,
  onOpenChange,
  name,
  onNameChange,
  namePlaceholder,
  color,
  onColorChange,
  extraFields,
  canAdd,
  onAdd,
}: {
  idBase: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  onNameChange: (v: string) => void;
  namePlaceholder: string;
  color: string;
  onColorChange: (v: string) => void;
  extraFields?: React.ReactNode;
  canAdd: boolean;
  onAdd: () => void;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onMouseDown={(e) => {
          // Keep the list open and prevent input blur so the panel expands in place.
          e.preventDefault();
          onOpenChange(true);
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-sky-200 transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
      >
        <IconBranding className="h-4 w-4 text-sky-300" aria-hidden="true" />
        Can&apos;t find it? Enter manually
      </button>
    );
  }

  return (
    <div className="space-y-2.5" onMouseDown={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
          Enter manually
        </p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cancel manual entry"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <IconClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        id={`${idBase}-manual-name`}
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={namePlaceholder}
        aria-label="Custom name"
        className="h-10 min-h-[40px] w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
      />

      {extraFields}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <MiniColorField
          id={`${idBase}-manual-color`}
          label="Color"
          value={color}
          onChange={onColorChange}
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
            canAdd
              ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-sm hover:brightness-110"
              : "cursor-not-allowed bg-white/5 text-slate-500"
          )}
        >
          <IconCheck className="h-3.5 w-3.5" /> Use this
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════ SchoolPicker ═══════════════════════════════ */

export function SchoolPicker({
  value,
  onChange,
  label = "School / University",
  placeholder = "Search schools, cities, or states…",
  limit = 8,
}: {
  value: SchoolSelection | null;
  onChange: (school: SchoolSelection | null) => void;
  label?: string;
  placeholder?: string;
  limit?: number;
}) {
  const reduce = useReducedMotion() ?? false;
  const [query, setQuery] = React.useState("");
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualName, setManualName] = React.useState("");
  const [manualColor, setManualColor] = React.useState("#2563eb");

  const items = React.useMemo(() => searchSchools(query, limit), [query, limit]);

  const selectedLabel = value
    ? value.custom
      ? value.name
      : `${value.name}${value.short && value.short !== value.name ? ` · ${value.short}` : ""}`
    : null;

  function selectSchool(s: School) {
    onChange({
      custom: false,
      name: s.name,
      short: s.short,
      city: s.city,
      state: s.state,
      colors: s.colors,
    });
    setQuery("");
  }

  function addManual() {
    const name = manualName.trim();
    if (!name) return;
    onChange({ custom: true, name, short: "", colors: [manualColor, manualColor] });
    setQuery("");
    setManualOpen(false);
    setManualName("");
  }

  return (
    <Combobox<School>
      idBase="school-picker"
      label={label}
      placeholder={placeholder}
      emptyHint={`No schools match “${query.trim()}”. Use “Enter manually” below.`}
      items={items}
      query={query}
      onQueryChange={setQuery}
      selectedLabel={selectedLabel}
      reduce={reduce}
      getKey={(s) => s.name}
      onSelect={selectSchool}
      onClear={() => onChange(null)}
      renderOption={(s, q, active) => (
        <>
          {/* Crest-like monogram tinted by the school's own colors. */}
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white shadow-md ring-1 ring-white/15"
            style={{ background: `linear-gradient(150deg, ${s.colors[0]}, ${s.colors[1]})` }}
            aria-hidden="true"
          >
            {initials(s.short)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              <Highlight text={s.name} query={q} />
            </span>
            <span className={cn("block truncate text-xs", active ? "text-sky-200/80" : "text-slate-400")}>
              {s.city}, {s.state}
            </span>
          </span>
          <Swatches colors={s.colors} />
        </>
      )}
      customPanel={
        <ManualPanel
          idBase="school-picker"
          open={manualOpen}
          onOpenChange={setManualOpen}
          name={manualName}
          onNameChange={setManualName}
          namePlaceholder="Your school name"
          color={manualColor}
          onColorChange={setManualColor}
          canAdd={manualName.trim().length > 0}
          onAdd={addManual}
        />
      }
    />
  );
}

/* ═════════════════════════════════ OrgPicker ═════════════════════════════════ */

export function OrgPicker({
  type,
  value,
  onChange,
  label,
  placeholder = "Search organizations, letters, or nicknames…",
  limit = 8,
}: {
  /** Filters the catalog to one council. Omit to search all orgs. */
  type?: OrgCategory;
  value: OrgSelection | null;
  onChange: (org: OrgSelection | null) => void;
  label?: string;
  placeholder?: string;
  limit?: number;
}) {
  const reduce = useReducedMotion() ?? false;
  const [query, setQuery] = React.useState("");
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualName, setManualName] = React.useState("");
  const [manualLetters, setManualLetters] = React.useState("");
  const [manualColor, setManualColor] = React.useState("#2563eb");

  const items = React.useMemo(() => searchOrgs(query, type, limit), [query, type, limit]);

  // Default label follows the active filter so the field reads naturally.
  const resolvedLabel =
    label ?? (type === "sorority" ? "Sorority" : type === "fraternity" ? "Fraternity" : "Fraternity / Sorority");

  const selectedLabel = value
    ? value.custom
      ? `${value.name}${value.letters ? ` · ${value.letters}` : ""}`
      : `${value.name}${value.letters ? ` · ${value.letters}` : ""}`
    : null;

  function selectOrg(o: GreekOrg) {
    onChange({
      custom: false,
      name: o.name,
      short: o.short,
      letters: o.letters,
      type: o.type,
      // Catalog colors are optional; fall back to the platform blue pair.
      colors: o.colors ?? ["#2563eb", "#1d4ed8"],
    });
    setQuery("");
  }

  function addManual() {
    const name = manualName.trim();
    if (!name) return;
    onChange({
      custom: true,
      name,
      short: "",
      letters: manualLetters.trim(),
      // Inherit the active filter when set; default to fraternity otherwise.
      type: type ?? "fraternity",
      colors: [manualColor, manualColor],
    });
    setQuery("");
    setManualOpen(false);
    setManualName("");
    setManualLetters("");
  }

  return (
    <Combobox<GreekOrg>
      idBase="org-picker"
      label={resolvedLabel}
      placeholder={placeholder}
      emptyHint={`No organizations match “${query.trim()}”. Use “Enter manually” below.`}
      items={items}
      query={query}
      onQueryChange={setQuery}
      selectedLabel={selectedLabel}
      reduce={reduce}
      getKey={(o) => o.name}
      onSelect={selectOrg}
      onClear={() => onChange(null)}
      renderOption={(o, q, active) => {
        const colors = o.colors ?? ["#2563eb", "#1d4ed8"];
        return (
          <>
            {/* Glyph badge driven by the org's own palette. */}
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-black tracking-tight text-white shadow-md ring-1 ring-white/15"
              style={{ background: `linear-gradient(150deg, ${colors[0]}, ${colors[1]})` }}
              aria-hidden="true"
            >
              {o.letters}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                <Highlight text={o.name} query={q} />
              </span>
              <span className={cn("block truncate text-xs", active ? "text-sky-200/80" : "text-slate-400")}>
                {o.short}
                {" · "}
                <span className="capitalize">{o.type}</span>
                {o.nphc ? " · NPHC" : ""}
              </span>
            </span>
            <Swatches colors={colors} />
          </>
        );
      }}
      customPanel={
        <ManualPanel
          idBase="org-picker"
          open={manualOpen}
          onOpenChange={setManualOpen}
          name={manualName}
          onNameChange={setManualName}
          namePlaceholder="Your organization name"
          color={manualColor}
          onColorChange={setManualColor}
          extraFields={
            <input
              type="text"
              value={manualLetters}
              onChange={(e) => setManualLetters(e.target.value)}
              placeholder="Greek letters (e.g. ΦΣΚ) - optional"
              aria-label="Custom Greek letters"
              className="h-10 min-h-[40px] w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            />
          }
          canAdd={manualName.trim().length > 0}
          onAdd={addManual}
        />
      }
    />
  );
}

/* ─────────────────────────────────── utils ────────────────────────────────── */

/** First 1–2 alphabetic initials from a short school name, for the crest badge. */
function initials(short: string): string {
  const words = short.replace(/[^A-Za-z& ]/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
