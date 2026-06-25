"use client";

/**
 * Add Members Wizard — a polished, multi-step modal for adding BROTHERS or
 * ALUMNI to a chapter, one at a time OR in bulk (paste rows / CSV).
 *
 * Flow
 * ────
 *   Step 1  Pick type (Brothers | Alumni) + mode (Add one | Add many)
 *   Step 2  Fill the form (single) OR paste + edit a table (bulk)
 *   Step 3  Review, optionally send portal invites, submit → per-row results
 *
 * It is intentionally self-contained: drop <AddMembersWizard type="brothers" />
 * (or a fully-controlled <AddMembersWizard open onOpenChange ... />) and wire an
 * onAdded callback to splice freshly-created rows into the page list.
 *
 * Premium-feel details: keyboard-driven step nav, reduced-motion-safe
 * transitions, optimistic per-row results, mobile-first layout, 44px touch
 * targets, aria-live progress, focus-visible rings, and a single source of
 * truth for which fields each entity needs.
 *
 * Both bulk POSTs hit the same-origin admin bulk routes:
 *   POST /api/admin/brothers/bulk  → { members:[{row, name, email, ...}], sendInvites }
 *   POST /api/admin/alumni/bulk    → { members:[{row, fullName, graduationYear, ...}] }
 * each returning { ok, results:[{row, status, id?, name?, error?}], summary }.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  Users, GraduationCap, User, UsersRound, ArrowRight, ArrowLeft, Loader2,
  CheckCircle2, AlertTriangle, Trash2, Plus, ClipboardPaste, Mail, MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { IconSpark } from "@/components/brand/icons";
// ── Public types ─────────────────────────────────────────────────────────────

export type MemberType = "brothers" | "alumni";
type Mode = "single" | "bulk";

/** A created row handed back to the parent so it can splice into its list. */
export type CreatedRow = { id: string; name: string };

export interface AddMembersWizardProps {
  /** Which directory we're adding to. If omitted, the wizard lets the user pick. */
  type?: MemberType;
  /** Lock the type picker (Step 1 only offers mode). Defaults to false. */
  lockType?: boolean;
  /** Controlled open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful submit with the rows that were created. */
  onAdded?: (rows: CreatedRow[], meta: { type: MemberType }) => void;
  /** Term overrides so the copy reads "brothers"/"sisters"/"members". */
  memberTermPlural?: string; // default "brothers"
  memberTermSingular?: string; // default "brother"
}

// ── Field definitions (single source of truth) ───────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number";
  required?: boolean;
  half?: boolean; // render in a 2-col row
};

const BROTHER_FIELDS: FieldDef[] = [
  { key: "name", label: "Full name", placeholder: "Mark Laughery", required: true, half: true },
  { key: "position", label: "Position", placeholder: "President / Treasurer / - ", half: true },
  { key: "email", label: "Email", placeholder: "name@email.edu", type: "email", half: true },
  { key: "phone", label: "Phone", placeholder: "(803) 555-0142", type: "tel", half: true },
  { key: "year", label: "Year", placeholder: "Junior", half: true },
  { key: "gradYear", label: "Grad year", placeholder: "2026", half: true },
  { key: "major", label: "Major", placeholder: "Finance", half: true },
  { key: "pledgeClass", label: "Pledge class", placeholder: "Alpha Phi", half: true },
];

const ALUMNI_FIELDS: FieldDef[] = [
  { key: "fullName", label: "Full name", placeholder: "John Doe", required: true, half: true },
  { key: "graduationYear", label: "Grad year", placeholder: "2020", type: "number", required: true, half: true },
  { key: "email", label: "Email", placeholder: "john@example.com", type: "email", half: true },
  { key: "phone", label: "Phone", placeholder: "(555) 555-0199", type: "tel", half: true },
  { key: "city", label: "City", placeholder: "Columbia", half: true },
  { key: "state", label: "State", placeholder: "SC", half: true },
  { key: "employer", label: "Employer", placeholder: "Acme Corp", half: true },
  { key: "jobTitle", label: "Job title", placeholder: "Engineer", half: true },
];

// Bulk paste maps the first 3 columns positionally to these keys. The rest of
// the single-form fields aren't part of the quick-paste contract (keeps the
// paste box approachable — "Name, Email, Phone" is what people have on hand).
const BULK_COLUMNS: Record<MemberType, { key: string; label: string }[]> = {
  brothers: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ],
  alumni: [
    { key: "fullName", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "graduationYear", label: "Grad year" },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldsFor(type: MemberType): FieldDef[] {
  return type === "brothers" ? BROTHER_FIELDS : ALUMNI_FIELDS;
}

function emptyForm(type: MemberType): Record<string, string> {
  const f: Record<string, string> = {};
  for (const fd of fieldsFor(type)) f[fd.key] = "";
  return f;
}

/** Split a pasted blob into rows of cells. Accepts tab-, comma-, or
 *  semicolon-separated values; tolerates quoted CSV cells and a header row. */
function parsePaste(text: string, type: MemberType): BulkRow[] {
  const cols = BULK_COLUMNS[type];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const splitLine = (line: string): string[] => {
    // Prefer tab if present (paste from Sheets/Excel), else comma, else semicolon.
    const delim = line.includes("\t") ? "\t" : line.includes(",") ? "," : ";";
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delim && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((c) => c.trim().replace(/^["']|["']$/g, "").trim());
  };

  // Detect + drop a header row (first cell looks like "name"/"full name").
  let startIdx = 0;
  const firstCells = splitLine(lines[0]).map((c) => c.toLowerCase());
  if (firstCells.some((c) => /(^|\b)(name|full name|email|e-mail|phone|grad|year)\b/.test(c))
      && !firstCells.some((c) => EMAIL_RE.test(c))) {
    startIdx = 1;
  }

  const rows: BulkRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.every((c) => !c)) continue;
    const row: BulkRow = { _rid: rows.length };
    cols.forEach((col, ci) => {
      row[col.key] = cells[ci] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

type BulkRow = { _rid: number; [k: string]: string | number };

/** Per-row validation for the bulk table — returns an error string or null. */
function validateBulkRow(row: BulkRow, type: MemberType): string | null {
  const name = String(type === "brothers" ? row.name : row.fullName || "").trim();
  if (name.length < 2) return "Name required";
  const email = String(row.email || "").trim();
  if (email && !EMAIL_RE.test(email)) return "Invalid email";
  if (type === "alumni") {
    const gy = String(row.graduationYear || "").trim();
    if (gy) {
      const n = Number(gy);
      if (!Number.isInteger(n) || n < 1900 || n > 2100) return "Grad year 1900 - 2100";
    }
  }
  return null;
}

type RowResult = { row: number; status: "added" | "duplicate" | "error"; id?: string; name?: string; error?: string };

// ── Component ────────────────────────────────────────────────────────────────

export function AddMembersWizard({
  type: fixedType,
  lockType = false,
  open,
  onOpenChange,
  onAdded,
  memberTermPlural = "brothers",
  memberTermSingular = "brother",
}: AddMembersWizardProps) {
  const { push } = useToast();

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [type, setType] = React.useState<MemberType>(fixedType ?? "brothers");
  const [mode, setMode] = React.useState<Mode>("single");
  const [sendInvites, setSendInvites] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [results, setResults] = React.useState<RowResult[] | null>(null);

  // Single-form state
  const [form, setForm] = React.useState<Record<string, string>>(() => emptyForm(fixedType ?? "brothers"));
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // Bulk state
  const [pasteText, setPasteText] = React.useState("");
  const [bulkRows, setBulkRows] = React.useState<BulkRow[]>([]);

  const term = type === "alumni" ? { sing: "alumnus", plur: "alumni" } : { sing: memberTermSingular, plur: memberTermPlural };
  const reduceMotion = usePrefersReducedMotion();

  // Reset everything when the dialog (re)opens, honoring the fixed type.
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setType(fixedType ?? "brothers");
      setMode("single");
      setSendInvites(false);
      setResults(null);
      setSubmitting(false);
      setForm(emptyForm(fixedType ?? "brothers"));
      setTouched({});
      setPasteText("");
      setBulkRows([]);
    }
  }, [open, fixedType]);

  // When the type changes mid-wizard (only possible when !lockType), reshape
  // the single form so we never carry stale brother fields into alumni.
  React.useEffect(() => {
    setForm(emptyForm(type));
    setTouched({});
    setBulkRows((rows) =>
      rows.map((r, i) => {
        const next: BulkRow = { _rid: i };
        BULK_COLUMNS[type].forEach((c) => { next[c.key] = ""; });
        return next;
      })
    );
  }, [type]);

  const fields = fieldsFor(type);

  // ── Single-form validation ──────────────────────────────────────────────
  function fieldError(fd: FieldDef): string | null {
    const v = (form[fd.key] || "").trim();
    if (fd.required && !v) return `${fd.label} is required`;
    if (fd.key === "email" && v && !EMAIL_RE.test(v)) return "Enter a valid email";
    if (fd.type === "number" && v) {
      const n = Number(v);
      if (!Number.isInteger(n)) return "Enter a whole number";
      if (fd.key === "graduationYear" && (n < 1900 || n > 2100)) return "Year 1900 - 2100";
    }
    return null;
  }
  const singleValid = fields.every((fd) => !fieldError(fd));

  // ── Bulk parse + derived counts ─────────────────────────────────────────
  function ingestPaste() {
    const rows = parsePaste(pasteText, type);
    if (rows.length === 0) {
      push({ title: "Nothing to import", description: "Paste at least one row first.", variant: "destructive" });
      return;
    }
    // Merge with any rows already in the table (append, re-id).
    setBulkRows((prev) => {
      const merged = [...prev, ...rows];
      return merged.map((r, i) => ({ ...r, _rid: i }));
    });
    setPasteText("");
  }

  const bulkValidRows = React.useMemo(
    () => bulkRows.filter((r) => !validateBulkRow(r, type)),
    [bulkRows, type]
  );
  const bulkErrorCount = bulkRows.length - bulkValidRows.length;

  function updateBulkCell(rid: number, key: string, value: string) {
    setBulkRows((rows) => rows.map((r) => (r._rid === rid ? { ...r, [key]: value } : r)));
  }
  function removeBulkRow(rid: number) {
    setBulkRows((rows) => rows.filter((r) => r._rid !== rid).map((r, i) => ({ ...r, _rid: i })));
  }
  function addBlankBulkRow() {
    setBulkRows((rows) => {
      const next: BulkRow = { _rid: rows.length };
      BULK_COLUMNS[type].forEach((c) => { next[c.key] = ""; });
      return [...rows, next];
    });
  }

  // ── Step gating ─────────────────────────────────────────────────────────
  const canAdvanceToReview =
    mode === "single" ? singleValid : bulkValidRows.length > 0;

  function goReview() {
    if (mode === "single") {
      // Surface inline errors if the user tries to advance early.
      setTouched(Object.fromEntries(fields.map((f) => [f.key, true])));
      if (!singleValid) return;
    }
    if (!canAdvanceToReview) return;
    setStep(3);
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function submit() {
    setSubmitting(true);
    setResults(null);
    try {
      const endpoint = type === "brothers" ? "/api/admin/brothers/bulk" : "/api/admin/alumni/bulk";
      const members =
        mode === "single"
          ? [buildSingleMember()]
          : bulkValidRows.map((r) => buildBulkMember(r));

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ members, sendInvites: type === "brothers" ? sendInvites : false }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok || !Array.isArray(json.results)) {
        throw new Error(json.error || "Import failed");
      }

      const rr: RowResult[] = json.results;
      setResults(rr);

      const added = rr.filter((x) => x.status === "added");
      const dupes = rr.filter((x) => x.status === "duplicate").length;
      const errs = rr.filter((x) => x.status === "error").length;

      if (added.length > 0) {
        onAdded?.(
          added.filter((x) => x.id).map((x) => ({ id: x.id!, name: x.name || "Member" })),
          { type }
        );
        const invited = json.summary?.invited || 0;
        push({
          title: `Added ${added.length} ${added.length === 1 ? term.sing : term.plur}`,
          description: [
            dupes ? `${dupes} duplicate${dupes === 1 ? "" : "s"} skipped` : "",
            errs ? `${errs} error${errs === 1 ? "" : "s"}` : "",
            invited ? `${invited} invite${invited === 1 ? "" : "s"} sent` : "",
          ].filter(Boolean).join(" · ") || undefined,
          variant: "success",
        });
      } else if (dupes > 0 && errs === 0) {
        push({ title: "All rows were already in the directory", variant: "default" });
      } else {
        push({ title: "Nothing was added", description: `${errs} error${errs === 1 ? "" : "s"}.`, variant: "destructive" });
      }
    } catch (err: any) {
      push({ title: err?.message || "Import failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function buildSingleMember(): Record<string, any> {
    const m: Record<string, any> = { row: 0 };
    for (const fd of fields) {
      const v = (form[fd.key] || "").trim();
      if (fd.key === "graduationYear") m[fd.key] = v ? Number(v) : undefined;
      else m[fd.key] = v;
    }
    return m;
  }

  function buildBulkMember(r: BulkRow): Record<string, any> {
    const m: Record<string, any> = { row: r._rid };
    BULK_COLUMNS[type].forEach((c) => {
      const v = String(r[c.key] ?? "").trim();
      if (c.key === "graduationYear") m[c.key] = v ? Number(v) : undefined;
      else m[c.key] = v;
    });
    return m;
  }

  // Map results back onto bulk rows for the per-row review table.
  const resultByRow = React.useMemo(() => {
    const map = new Map<number, RowResult>();
    (results || []).forEach((r) => map.set(r.row, r));
    return map;
  }, [results]);

  const submittedCount = mode === "single" ? 1 : bulkValidRows.length;
  const allDone = !!results;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Header / progress */}
        <div className="px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-phisig-red text-white" aria-hidden="true">
                <IconSpark className="h-4 w-4" />
              </span>
              Add {term.plur}
            </DialogTitle>
            <DialogDescription>
              {allDone
                ? "Here's how the import went."
                : step === 1
                ? "Choose who you're adding and how."
                : step === 2
                ? mode === "single"
                  ? `Fill in the ${term.sing}'s details.`
                  : "Paste your rows, then review and fix them inline."
                : "Review and confirm. Nothing is saved until you submit."}
            </DialogDescription>
          </DialogHeader>
          <Stepper step={allDone ? 3 : step} reduceMotion={reduceMotion} />
        </div>

        <div className="px-6 py-5">
          {/* ── DONE: results summary ── */}
          {allDone ? (
            <ResultsView
              results={results!}
              type={type}
              term={term}
              onAddMore={() => {
                // Soft reset back to step 1 for another batch.
                setResults(null);
                setStep(1);
                setMode("single");
                setForm(emptyForm(type));
                setTouched({});
                setPasteText("");
                setBulkRows([]);
                setSendInvites(false);
              }}
              onClose={() => onOpenChange(false)}
            />
          ) : step === 1 ? (
            <StepOne
              type={type}
              setType={setType}
              lockType={lockType || !!fixedType}
              mode={mode}
              setMode={setMode}
              term={term}
            />
          ) : step === 2 ? (
            mode === "single" ? (
              <SingleForm
                fields={fields}
                form={form}
                setForm={setForm}
                touched={touched}
                setTouched={setTouched}
                fieldError={fieldError}
              />
            ) : (
              <BulkForm
                type={type}
                pasteText={pasteText}
                setPasteText={setPasteText}
                ingestPaste={ingestPaste}
                bulkRows={bulkRows}
                updateBulkCell={updateBulkCell}
                removeBulkRow={removeBulkRow}
                addBlankBulkRow={addBlankBulkRow}
                validateBulkRow={(r) => validateBulkRow(r, type)}
                validCount={bulkValidRows.length}
                errorCount={bulkErrorCount}
              />
            )
          ) : (
            <ReviewStep
              type={type}
              term={term}
              mode={mode}
              singleSummary={mode === "single" ? form : null}
              fields={fields}
              bulkValidRows={bulkValidRows}
              bulkColumns={BULK_COLUMNS[type]}
              sendInvites={sendInvites}
              setSendInvites={setSendInvites}
              submittedCount={submittedCount}
            />
          )}
        </div>

        {/* Footer nav */}
        {!allDone && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 sticky bottom-0 bg-card">
            <div className="text-xs text-muted-foreground">
              {step === 2 && mode === "bulk" && bulkRows.length > 0 && (
                <span>
                  <span className="font-semibold text-foreground">{bulkValidRows.length}</span> ready
                  {bulkErrorCount > 0 && <span className="text-amber-700"> · {bulkErrorCount} need fixing</span>}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3)} disabled={submitting}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
              {step === 1 && (
                <Button onClick={() => setStep(2)}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {step === 2 && (
                <Button onClick={goReview} disabled={!canAdvanceToReview}>
                  Review {mode === "bulk" ? `${bulkValidRows.length} ` : ""}<ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {step === 3 && (
                <Button onClick={submit} disabled={submitting || submittedCount === 0}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting
                    ? "Adding…"
                    : `Add ${submittedCount} ${submittedCount === 1 ? term.sing : term.plur}`}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function Stepper({ step, reduceMotion }: { step: 1 | 2 | 3; reduceMotion: boolean }) {
  const labels = ["Type", "Details", "Review"];
  return (
    <div className="mt-4 flex items-center gap-2" aria-label={`Step ${step} of 3`}>
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ring-1",
                  !reduceMotion && "transition-colors",
                  done && "bg-phisig-red text-white ring-phisig-red",
                  active && "bg-phisig-red-soft text-phisig-red ring-phisig-red",
                  !active && !done && "bg-muted text-muted-foreground ring-border"
                )}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={cn("text-xs font-medium hidden sm:inline", active ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <span className={cn("h-px flex-1", done ? "bg-phisig-red" : "bg-border")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepOne({
  type, setType, lockType, mode, setMode, term,
}: {
  type: MemberType;
  setType: (t: MemberType) => void;
  lockType: boolean;
  mode: Mode;
  setMode: (m: Mode) => void;
  term: { sing: string; plur: string };
}) {
  return (
    <div className="space-y-6">
      {!lockType && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Who are you adding?</p>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceCard
              active={type === "brothers"}
              icon={Users}
              title="Brothers"
              sub="Active members"
              onClick={() => setType("brothers")}
            />
            <ChoiceCard
              active={type === "alumni"}
              icon={GraduationCap}
              title="Alumni"
              sub="Graduated members"
              onClick={() => setType("alumni")}
            />
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">How many?</p>
        <div className="grid grid-cols-2 gap-3">
          <ChoiceCard
            active={mode === "single"}
            icon={User}
            title="Add one"
            sub={`A single ${term.sing}`}
            onClick={() => setMode("single")}
          />
          <ChoiceCard
            active={mode === "bulk"}
            icon={UsersRound}
            title="Add many"
            sub="Paste a list"
            onClick={() => setMode("bulk")}
          />
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  active, icon: Icon, title, sub, onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition lift",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/40",
        active
          ? "border-phisig-red bg-phisig-red-soft/40 shadow-sm"
          : "border-border bg-card hover:border-phisig-red/40"
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          active ? "bg-phisig-red text-white" : "bg-muted text-muted-foreground group-hover:text-phisig-red"
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {active && (
        <span className="absolute top-3 right-3 text-phisig-red">
          <CheckCircle2 className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}

function SingleForm({
  fields, form, setForm, touched, setTouched, fieldError,
}: {
  fields: FieldDef[];
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  touched: Record<string, boolean>;
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  fieldError: (fd: FieldDef) => string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((fd) => {
        const err = touched[fd.key] ? fieldError(fd) : null;
        return (
          <div key={fd.key} className={fd.half ? "" : "col-span-2"}>
            <Label htmlFor={`single-${fd.key}`} className="mb-1 inline-block">
              {fd.label} {fd.required && <span className="text-phisig-red">*</span>}
            </Label>
            <Input
              id={`single-${fd.key}`}
              type={fd.type === "number" ? "text" : fd.type || "text"}
              inputMode={fd.type === "number" ? "numeric" : undefined}
              value={form[fd.key] || ""}
              onChange={(e) => setForm((f) => ({ ...f, [fd.key]: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, [fd.key]: true }))}
              placeholder={fd.placeholder}
              aria-invalid={!!err}
              aria-describedby={err ? `single-${fd.key}-err` : undefined}
              className={err ? "border-destructive focus-visible:ring-destructive/30" : undefined}
            />
            {err && (
              <p id={`single-${fd.key}-err`} className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {err}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BulkForm({
  type, pasteText, setPasteText, ingestPaste, bulkRows, updateBulkCell,
  removeBulkRow, addBlankBulkRow, validateBulkRow, validCount, errorCount,
}: {
  type: MemberType;
  pasteText: string;
  setPasteText: (s: string) => void;
  ingestPaste: () => void;
  bulkRows: BulkRow[];
  updateBulkCell: (rid: number, key: string, value: string) => void;
  removeBulkRow: (rid: number) => void;
  addBlankBulkRow: () => void;
  validateBulkRow: (r: BulkRow) => string | null;
  validCount: number;
  errorCount: number;
}) {
  const cols = BULK_COLUMNS[type];
  const example =
    type === "brothers"
      ? "Mark Laughery, mark@email.edu, (803) 555-0142\nJane Smith, jane@email.edu, (803) 555-0188"
      : "John Doe, john@example.com, (555) 555-0199, 2018\nJane Smith, jane@example.com, (555) 555-0123, 2015";

  return (
    <div className="space-y-4">
      {/* Paste box */}
      <div>
        <Label htmlFor="bulk-paste" className="mb-1 inline-block">
          Paste rows - one per line ({cols.map((c) => c.label).join(", ")})
        </Label>
        <Textarea
          id="bulk-paste"
          rows={4}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={example}
          className="font-mono text-xs"
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter ingests, matching the primary action.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); ingestPaste(); }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Tabs, commas, or CSV all work. A header row is detected and skipped.
          </p>
          <Button size="sm" variant="outline" onClick={ingestPaste} disabled={!pasteText.trim()}>
            <ClipboardPaste className="h-3.5 w-3.5" /> Add to table
          </Button>
        </div>
      </div>

      {/* Editable table */}
      {bulkRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-8 px-4 text-center">
          <UsersRound className="h-6 w-6 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Paste a list above to build your import table.</p>
          <button type="button" onClick={addBlankBulkRow} className="mt-2 text-xs text-phisig-red font-medium hover:underline">
            or add a row manually
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 border-b border-border">
            <div className="flex items-center gap-2 text-xs">
              <Badge tone="ok">{validCount} ready</Badge>
              {errorCount > 0 && <Badge tone="warn">{errorCount} to fix</Badge>}
            </div>
            <Button size="sm" variant="ghost" onClick={addBlankBulkRow} className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> Row
            </Button>
          </div>
          <div className="max-h-[40vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-[1]">
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-8 px-2 py-2" />
                  {cols.map((c) => (
                    <th key={c.key} className="px-2 py-2 font-semibold">{c.label}</th>
                  ))}
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((r) => {
                  const err = validateBulkRow(r);
                  return (
                    <tr key={r._rid} className={cn("border-t border-border align-top", err && "bg-amber-50/40")}>
                      <td className="px-2 py-1.5 text-center">
                        {err ? (
                          <span title={err}><MinusCircle className="h-3.5 w-3.5 text-amber-600 inline" /></span>
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                        )}
                      </td>
                      {cols.map((c, ci) => (
                        <td key={c.key} className="px-1.5 py-1.5">
                          <input
                            value={String(r[c.key] ?? "")}
                            onChange={(e) => updateBulkCell(r._rid, c.key, e.target.value)}
                            placeholder={c.label}
                            aria-label={`${c.label} for row ${r._rid + 1}`}
                            className={cn(
                              "w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none",
                              "focus:ring-2 focus:ring-phisig-red/30",
                              err && ci === 0 ? "border-amber-300" : "border-border"
                            )}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeBulkRow(r._rid)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove row ${r._rid + 1}`}
                          title="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({
  type, term, mode, singleSummary, fields, bulkValidRows, bulkColumns,
  sendInvites, setSendInvites, submittedCount,
}: {
  type: MemberType;
  term: { sing: string; plur: string };
  mode: Mode;
  singleSummary: Record<string, string> | null;
  fields: FieldDef[];
  bulkValidRows: BulkRow[];
  bulkColumns: { key: string; label: string }[];
  sendInvites: boolean;
  setSendInvites: (b: boolean) => void;
  submittedCount: number;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm">
          You're about to add{" "}
          <span className="font-semibold text-foreground">
            {submittedCount} {submittedCount === 1 ? term.sing : term.plur}
          </span>{" "}
          to the directory.
        </p>
      </div>

      {/* Single summary */}
      {mode === "single" && singleSummary && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border p-4">
          {fields
            .filter((f) => (singleSummary[f.key] || "").trim())
            .map((f) => (
              <div key={f.key} className={f.half ? "" : "col-span-2"}>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                <dd className="text-sm font-medium truncate">{singleSummary[f.key]}</dd>
              </div>
            ))}
        </dl>
      )}

      {/* Bulk preview (first 8) */}
      {mode === "bulk" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[34vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  {bulkColumns.map((c) => (
                    <th key={c.key} className="px-3 py-2 font-semibold">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulkValidRows.slice(0, 50).map((r) => (
                  <tr key={r._rid} className="border-t border-border">
                    {bulkColumns.map((c) => (
                      <td key={c.key} className="px-3 py-1.5 truncate max-w-[180px]">
                        {String(r[c.key] ?? "") || <span className="text-muted-foreground">-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bulkValidRows.length > 50 && (
            <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
              + {bulkValidRows.length - 50} more
            </p>
          )}
        </div>
      )}

      {/* Invite opt-in — brothers only (they get portal logins). */}
      {type === "brothers" && (
        <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:border-phisig-red/40 transition">
          <Checkbox checked={sendInvites} onCheckedChange={(v) => setSendInvites(!!v)} className="mt-0.5" />
          <span className="text-sm">
            <span className="font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-phisig-red" /> Send a portal invite to everyone with an email
            </span>
            <span className="text-xs text-muted-foreground">
              Each one gets a one-time link to set their password and finish their profile. People without an email are added silently.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

function ResultsView({
  results, type, term, onAddMore, onClose,
}: {
  results: RowResult[];
  type: MemberType;
  term: { sing: string; plur: string };
  onAddMore: () => void;
  onClose: () => void;
}) {
  const added = results.filter((r) => r.status === "added");
  const dupes = results.filter((r) => r.status === "duplicate");
  const errs = results.filter((r) => r.status === "error");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <ResultStat label="Added" value={added.length} tone="ok" />
        <ResultStat label="Duplicates" value={dupes.length} tone="muted" />
        <ResultStat label="Errors" value={errs.length} tone={errs.length ? "warn" : "muted"} />
      </div>

      {(dupes.length > 0 || errs.length > 0) && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[34vh] overflow-y-auto divide-y divide-border">
            {[...errs, ...dupes].map((r, i) => (
              <div key={`${r.row}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.name || `Row ${r.row + 1}`}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.error || (r.status === "duplicate" ? "Already in directory" : "Could not add")}</p>
                </div>
                <Badge tone={r.status === "duplicate" ? "muted" : "warn"}>
                  {r.status === "duplicate" ? "Duplicate" : "Error"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {added.length > 0 && errs.length === 0 && dupes.length === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-900">
            All {added.length} {added.length === 1 ? term.sing : term.plur} added cleanly.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onAddMore}>
          <Plus className="h-4 w-4" /> Add more
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "muted" }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-center",
        tone === "ok" && "border-emerald-200 bg-emerald-50",
        tone === "warn" && "border-amber-200 bg-amber-50",
        tone === "muted" && "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "text-2xl font-semibold",
          tone === "ok" && "text-emerald-700",
          tone === "warn" && "text-amber-700"
        )}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

/** Tiny inline badge (kept local so the wizard has zero coupling beyond the
 *  shared primitives the rest of the admin uses). */
function Badge({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
        tone === "ok" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
        tone === "warn" && "bg-amber-50 text-amber-800 ring-amber-200",
        tone === "muted" && "bg-muted text-muted-foreground ring-border"
      )}
    >
      {children}
    </span>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduce;
}
