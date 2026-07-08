"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ChevronUp, ChevronDown, Save, GripVertical } from "lucide-react";
import {
  RUSH_FIELD_TYPES,
  slugifyFieldKey,
  serializeRushFormConfig,
  type FormFieldConfig,
  type RushFieldType,
} from "@/lib/rush-form-config";

// A row's local editing shape. `optionsText` is the raw newline/comma list the
// admin types for a select; it's split into a clean string[] on save.
interface Row {
  uid: string;
  label: string;
  type: RushFieldType;
  required: boolean;
  placeholder: string;
  optionsText: string;
}

let uidCounter = 0;
const nextUid = () => `row-${uidCounter++}`;

function toRow(f: FormFieldConfig): Row {
  return {
    uid: nextUid(),
    label: f.label,
    type: f.type,
    required: f.required,
    placeholder: f.placeholder || "",
    optionsText: (f.options || []).join("\n"),
  };
}

const TYPE_LABELS: Record<RushFieldType, string> = {
  text: "Short text",
  email: "Email",
  phone: "Phone",
  select: "Dropdown",
  textarea: "Long text",
  checkbox: "Checkbox",
};

/**
 * Convert the editing rows into the canonical, de-duplicated FormFieldConfig[]
 * that gets serialized to `rush.customQuestions`. Keys are slugified from labels
 * and made unique; `order` is the current row index.
 */
function rowsToFields(rows: Row[]): FormFieldConfig[] {
  const used = new Set<string>();
  const out: FormFieldConfig[] = [];
  rows.forEach((r, index) => {
    const label = r.label.trim();
    if (!label) return; // skip blank rows silently
    let key = slugifyFieldKey(label, index);
    // Guarantee uniqueness so two same-named questions don't collide.
    let n = 2;
    while (used.has(key)) key = `${slugifyFieldKey(label, index)}-${n++}`;
    used.add(key);

    const field: FormFieldConfig = {
      key,
      label,
      type: r.type,
      required: r.required,
      order: index,
    };
    if (r.type === "select") {
      field.options = r.optionsText
        .split(/[\n,]/)
        .map((o) => o.trim())
        .filter(Boolean);
    }
    if (r.placeholder.trim()) field.placeholder = r.placeholder.trim();
    out.push(field);
  });
  return out;
}

export function RushFormBuilderClient({ initialFields }: { initialFields: FormFieldConfig[] }) {
  const { push } = useToast();
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>(() => initialFields.map(toRow));
  const [saving, setSaving] = React.useState(false);

  function patch(uid: string, partial: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...partial } : r)));
  }
  function addRow() {
    setRows((rs) => [
      ...rs,
      { uid: nextUid(), label: "", type: "text", required: false, placeholder: "", optionsText: "" },
    ]);
  }
  function removeRow(uid: string) {
    setRows((rs) => rs.filter((r) => r.uid !== uid));
  }
  function move(uid: string, dir: -1 | 1) {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const copy = rs.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    // Light client validation: a select must offer at least one option.
    const badSelect = rows.find(
      (r) => r.label.trim() && r.type === "select" &&
        r.optionsText.split(/[\n,]/).map((o) => o.trim()).filter(Boolean).length === 0,
    );
    if (badSelect) {
      push({
        title: "Dropdown needs options",
        description: `Add at least one option for "${badSelect.label.trim()}".`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const fields = rowsToFields(rows);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { "rush.customQuestions": serializeRushFormConfig(fields) } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      // Re-sync rows to the normalized/saved shape so react keys and order settle.
      setRows(fields.map(toRow));
      push({ title: "Saved", description: "Your rush form questions are live.", variant: "success" });
      router.refresh();
    } catch (err: any) {
      push({ title: "Couldn't save", description: err.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No custom questions yet. Your rush form shows just the built-in fields.
          </p>
          <Button onClick={addRow} className="mt-4">
            <Plus className="h-4 w-4" /> Add your first question
          </Button>
        </div>
      )}

      {rows.map((r, i) => (
        <Card key={r.uid} className="border-border/70">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <GripVertical className="mt-2.5 h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <div className="flex-1 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`${r.uid}-label`} className="mb-1.5 inline-block text-xs">Question</Label>
                    <Input
                      id={`${r.uid}-label`}
                      value={r.label}
                      onChange={(e) => patch(r.uid, { label: e.target.value })}
                      placeholder="e.g. What's your GPA?"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${r.uid}-type`} className="mb-1.5 inline-block text-xs">Answer type</Label>
                    <select
                      id={`${r.uid}-type`}
                      value={r.type}
                      onChange={(e) => patch(r.uid, { type: e.target.value as RushFieldType })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {RUSH_FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {r.type === "select" && (
                  <div>
                    <Label htmlFor={`${r.uid}-options`} className="mb-1.5 inline-block text-xs">
                      Options (one per line)
                    </Label>
                    <textarea
                      id={`${r.uid}-options`}
                      value={r.optionsText}
                      onChange={(e) => patch(r.uid, { optionsText: e.target.value })}
                      rows={3}
                      placeholder={"Option A\nOption B\nOption C"}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}

                {r.type !== "checkbox" && (
                  <div>
                    <Label htmlFor={`${r.uid}-ph`} className="mb-1.5 inline-block text-xs">
                      Placeholder (optional)
                    </Label>
                    <Input
                      id={`${r.uid}-ph`}
                      value={r.placeholder}
                      onChange={(e) => patch(r.uid, { placeholder: e.target.value })}
                      placeholder="Hint text shown inside the field"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={r.required}
                    onChange={(e) => patch(r.uid, { required: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-phisig-red focus:ring-phisig-red"
                  />
                  Required
                </label>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => move(r.uid, -1)}
                  disabled={i === 0}
                  className={cn("rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed")}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(r.uid, 1)}
                  disabled={i === rows.length - 1}
                  className={cn("rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed")}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(r.uid)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between gap-3 pt-2">
        {rows.length > 0 && (
          <Button variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4" /> Add question
          </Button>
        )}
        <Button onClick={save} disabled={saving} className="ml-auto">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
