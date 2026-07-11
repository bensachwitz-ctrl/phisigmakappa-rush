"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { IconPlus as Plus, IconTrash as Trash2, IconChevronUp as ChevronUp, IconChevronDown as ChevronDown, IconSave as Save, IconGripVertical as GripVertical } from "@/components/brand/icons";
import {
  RUSH_FIELD_TYPES,
  serializeRushFormConfig,
  type FormFieldConfig,
  type RushFieldType,
} from "@/lib/rush-form-config";
// Item 5 — this Form.io-style builder is a THIN shell over the pure, unit-tested
// mutation helpers (lib/rush-form-builder.ts). Every add / remove / reorder (drag
// + keyboard) / update / required-toggle goes through those helpers, so the UI and
// the tested logic share ONE source of truth: `order` stays contiguous, keys stay
// unique, and a label edit never rekeys (which would orphan collected PNM answers).
import {
  addField,
  removeField,
  reorderFields,
  moveField,
  updateField,
  toggleRequired,
} from "@/lib/rush-form-builder";

const TYPE_LABELS: Record<RushFieldType, string> = {
  text: "Short text",
  email: "Email",
  phone: "Phone",
  select: "Dropdown",
  textarea: "Long text",
  checkbox: "Checkbox",
};

/** Options draft (raw textarea text, keyed by field.key) seeded from a field list. */
function seedDrafts(fields: FormFieldConfig[]): Record<string, string> {
  const d: Record<string, string> = {};
  for (const f of fields) if (f.type === "select") d[f.key] = (f.options || []).join("\n");
  return d;
}

/** Split a raw options textarea into the clean string[] updateField expects. */
function parseOptions(text: string): string[] {
  return text.split(/[\n,]/).map((o) => o.trim()).filter(Boolean);
}

export function RushFormBuilderClient({ initialFields }: { initialFields: FormFieldConfig[] }) {
  const { push } = useToast();
  const router = useRouter();
  const [fields, setFields] = React.useState<FormFieldConfig[]>(initialFields);
  const [optionDrafts, setOptionDrafts] = React.useState<Record<string, string>>(() =>
    seedDrafts(initialFields),
  );
  const [saving, setSaving] = React.useState(false);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);

  // ── Mutations — each delegates to a tested pure helper ─────────────────────
  const handleAdd = () => setFields((f) => addField(f, { label: "New question" }));
  const handleRemove = (key: string) =>
    setFields((f) => {
      const next = removeField(f, key);
      setOptionDrafts((d) => {
        const { [key]: _drop, ...rest } = d;
        return rest;
      });
      return next;
    });
  const handleMove = (key: string, dir: "up" | "down") =>
    setFields((f) => moveField(f, key, dir));
  const handleLabel = (key: string, label: string) =>
    setFields((f) => updateField(f, key, { label }));
  const handleRequired = (key: string) => setFields((f) => toggleRequired(f, key));
  const handlePlaceholder = (key: string, placeholder: string) =>
    setFields((f) => updateField(f, key, { placeholder }));

  const handleType = (key: string, type: RushFieldType) =>
    setFields((f) => {
      const next = updateField(f, key, { type });
      // Seed the options draft from whatever updateField resolved (it auto-seeds
      // defaults when switching TO select, and drops them when switching away).
      const resolved = next.find((x) => x.key === key);
      setOptionDrafts((d) =>
        type === "select"
          ? { ...d, [key]: (resolved?.options || []).join("\n") }
          : (() => {
              const { [key]: _drop, ...rest } = d;
              return rest;
            })(),
      );
      return next;
    });

  const handleOptions = (key: string, text: string) => {
    setOptionDrafts((d) => ({ ...d, [key]: text })); // preserve raw typing
    setFields((f) => updateField(f, key, { options: parseOptions(text) }));
  };

  // ── Drag-and-drop reorder (Form.io-style). Keyboard up/down stays the
  //    accessible + touch fallback; both route through the tested helpers. ────
  const onDrop = (target: number) => {
    if (dragIndex !== null && dragIndex !== target) {
      setFields((f) => reorderFields(f, dragIndex, target));
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  async function save() {
    const badSelect = fields.find(
      (f) => f.type === "select" && (!f.options || f.options.length === 0),
    );
    if (badSelect) {
      push({
        title: "Dropdown needs options",
        description: `Add at least one option for "${badSelect.label}".`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: { "rush.customQuestions": serializeRushFormConfig(fields) },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      push({ title: "Saved", description: "Your rush form questions are live.", variant: "success" });
      router.refresh();
    } catch (err: any) {
      push({ title: "Couldn't save", description: err.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* ── Builder column ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {fields.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No custom questions yet. Your rush form shows just the built-in fields.
            </p>
            <Button onClick={handleAdd} className="mt-4">
              <Plus className="h-4 w-4" /> Add your first question
            </Button>
          </div>
        )}

        {fields.map((f, i) => (
          <Card
            key={f.key}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dropIndex !== i) setDropIndex(i);
            }}
            onDrop={() => onDrop(i)}
            onDragEnd={() => {
              setDragIndex(null);
              setDropIndex(null);
            }}
            className={cn(
              "border-border/70 transition-colors",
              dragIndex === i && "opacity-60",
              dropIndex === i && dragIndex !== i && "border-phisig-red ring-1 ring-phisig-red/30",
            )}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 flex h-8 w-6 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                  aria-hidden="true"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <div className="flex-1 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`${f.key}-label`} className="mb-1.5 inline-block text-xs">Question</Label>
                      <Input
                        id={`${f.key}-label`}
                        value={f.label}
                        onChange={(e) => handleLabel(f.key, e.target.value)}
                        placeholder="e.g. What's your GPA?"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${f.key}-type`} className="mb-1.5 inline-block text-xs">Answer type</Label>
                      <select
                        id={`${f.key}-type`}
                        value={f.type}
                        onChange={(e) => handleType(f.key, e.target.value as RushFieldType)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {RUSH_FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {f.type === "select" && (
                    <div>
                      <Label htmlFor={`${f.key}-options`} className="mb-1.5 inline-block text-xs">
                        Options (one per line)
                      </Label>
                      <textarea
                        id={`${f.key}-options`}
                        value={optionDrafts[f.key] ?? (f.options || []).join("\n")}
                        onChange={(e) => handleOptions(f.key, e.target.value)}
                        rows={3}
                        placeholder={"Option A\nOption B\nOption C"}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  )}

                  {f.type !== "checkbox" && (
                    <div>
                      <Label htmlFor={`${f.key}-ph`} className="mb-1.5 inline-block text-xs">
                        Placeholder (optional)
                      </Label>
                      <Input
                        id={`${f.key}-ph`}
                        value={f.placeholder || ""}
                        onChange={(e) => handlePlaceholder(f.key, e.target.value)}
                        placeholder="Hint text shown inside the field"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={() => handleRequired(f.key)}
                      className="h-4 w-4 rounded border-border text-phisig-red focus:ring-phisig-red"
                    />
                    Required
                  </label>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(f.key, "up")}
                    disabled={i === 0}
                    className="min-h-[44px] min-w-[44px] rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed sm:min-h-0 sm:min-w-0"
                    aria-label={`Move ${f.label} up`}
                  >
                    <ChevronUp className="mx-auto h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(f.key, "down")}
                    disabled={i === fields.length - 1}
                    className="min-h-[44px] min-w-[44px] rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed sm:min-h-0 sm:min-w-0"
                    aria-label={`Move ${f.label} down`}
                  >
                    <ChevronDown className="mx-auto h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(f.key)}
                    className="min-h-[44px] min-w-[44px] rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:min-h-0 sm:min-w-0"
                    aria-label={`Remove ${f.label}`}
                  >
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex items-center justify-between gap-3 pt-2">
          {fields.length > 0 && (
            <Button variant="outline" onClick={handleAdd}>
              <Plus className="h-4 w-4" /> Add question
            </Button>
          )}
          <Button onClick={save} disabled={saving} className="ml-auto">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* ── Live preview column — the custom questions as PNMs will see them ──── */}
      <div className="lg:sticky lg:top-6 self-start">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Live preview
        </div>
        <FormPreview fields={fields} />
      </div>
    </div>
  );
}

/**
 * A non-interactive render of the custom questions exactly as they'll appear on
 * the public rush form. Updates live as the builder mutates `fields`, so an admin
 * sees the outcome of every add / reorder / type change without saving.
 */
function FormPreview({ fields }: { fields: FormFieldConfig[] }) {
  if (fields.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-secondary/20 p-5 text-sm text-muted-foreground">
        Add a question to see it here.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <label className="block text-sm font-medium">
            {f.label || "Untitled question"}
            {f.required && <span className="ml-0.5 text-phisig-red" aria-hidden="true">*</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea
              disabled
              rows={2}
              placeholder={f.placeholder || ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm opacity-80"
            />
          ) : f.type === "select" ? (
            <select disabled className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm opacity-80">
              {(f.options && f.options.length > 0 ? f.options : ["—"]).map((o, idx) => (
                <option key={`${o}-${idx}`}>{o}</option>
              ))}
            </select>
          ) : f.type === "checkbox" ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" disabled className="h-4 w-4 rounded border-border" />
              {f.placeholder || f.label}
            </label>
          ) : (
            <input
              disabled
              type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
              placeholder={f.placeholder || ""}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm opacity-80"
            />
          )}
        </div>
      ))}
    </div>
  );
}
