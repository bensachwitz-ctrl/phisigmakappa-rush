"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Save, RefreshCw, Flame, Trophy, Heart,
  GraduationCap, UserPlus, Instagram, CalendarDays, CalendarRange, Quote,
  Users, Crown, HelpCircle, MapPin, Rocket, ShieldCheck, ChevronUp, ChevronDown,
  LayoutGrid, Palette, Check, Sparkles, GripVertical,
} from "lucide-react";
// Import the PURE template data (orders/meta/resolver) — NOT template-config,
// which also pulls in the hero .tsx components. This client only needs the meta
// + the id resolver.
import {
  TEMPLATE_META,
  resolveTemplateId,
} from "@/components/site/templates/template-orders";
import type { TemplateId } from "@/components/site/templates/types";
import { EditableLivePreview } from "@/components/onboard/editable-live-preview";
// Item 4 — the preset picker chooses a whole visual SYSTEM (preset = base template
// x component set x icon family x motion) with per-axis overrides. All are pure
// data (lib/site-generator/*) so the picker, live preview, and public renderer
// resolve them identically via resolveSiteConfig.
import {
  TEMPLATE_PRESETS,
  resolveTemplatePreset,
  type TemplatePreset,
} from "@/lib/site-generator/template-presets";
import {
  COMPONENT_SETS,
  COMPONENT_SET_IDS,
  type ComponentSetId,
} from "@/lib/site-generator/component-sets";
import {
  ICON_FAMILIES,
  ICON_FAMILY_IDS,
  type IconFamilyId,
} from "@/lib/site-generator/icon-families";
import { SiteIcon } from "@/components/site/site-icon";

interface SectionConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  showKey?: string;
  visible: boolean;
}

const SECTION_METADATA: Record<string, { name: string; description: string; icon: React.ComponentType<any>; showKey?: string }> = {
  hero: { name: "Hero Header", description: "Branded interactive header with animated background and registration CTA.", icon: Flame },
  stats: { name: "Stats Strip", description: "Quick metrics overlay showing member count, GPA, and founding year.", icon: Trophy, showKey: "show.statsStrip" },
  highlights: { name: "Highlights Banner", description: "A simple visual row showcasing key chapter features/achievements.", icon: Heart, showKey: "show.highlightsBanner" },
  values: { name: "Core Values", description: "The three cardinal pillars: Brotherhood/Membership, Scholarship, and Character.", icon: GraduationCap, showKey: "show.values" },
  register: { name: "Registration Form", description: "The public interest collection form (fields and TCPA consent).", icon: UserPlus },
  instagram: { name: "Instagram Feed", description: "Interactive photo grid loading posts dynamically from feed.json.", icon: Instagram, showKey: "show.instagramFeed" },
  timeline: { name: "Recruitment Timeline", description: "Step-by-step description of how recruitment weeks work.", icon: CalendarDays, showKey: "show.timeline" },
  schedule: { name: "Event Schedule", description: "Chronological calendar listing open recruitment dates.", icon: CalendarRange },
  testimonial: { name: "Testimonial & About Story", description: "Member quote coupled with the chapter's history narrative.", icon: Quote, showKey: "show.testimonial" },
  spotlight: { name: "Brother Spotlight", description: "Featured member card highlight (photo and custom bio).", icon: Users, showKey: "show.spotlight" },
  eboard: { name: "Executive Board", description: "Displays list of elected officers (President, VP, etc.).", icon: Crown, showKey: "show.eboard" },
  about: { name: "About the Chapter", description: "More detailed narrative text about the chapter's founding and principles.", icon: ShieldCheck },
  faq: { name: "FAQ Accordion", description: "Interactive answers to common rush questions.", icon: HelpCircle, showKey: "show.faq" },
  where: { name: "Where to Find Us", description: "Chapter physical address, advisor contact info, and Google Maps embed.", icon: MapPin, showKey: "show.whereWeLive" },
  cta: { name: "Final Call-To-Action", description: "Concluding bottom block encouraging PNMs to sign up.", icon: Rocket }
};

// Mirrors TEMPLATE_ORDER.classic in template-config.ts (the legacy default
// order). Used as the section-list fallback + the "reset to defaults" target so
// the customizer's Layout tab stays independent of which template is staged.
const DEFAULT_ORDER = [
  "hero", "stats", "highlights", "values", "register",
  "instagram", "timeline", "schedule", "testimonial",
  "spotlight", "eboard", "about", "faq", "where", "cta"
];

// Platform royal-blue + gold preset (the Greek Stack identity defaults).
const GS_PRIMARY = "#2563eb";
const GS_SECONDARY = "#f59e0b";

type TabId = "presets" | "templates" | "brand" | "layout" | "tweak";

/* ── 44px swatch + hex input (lifted from onboard/editable-live-preview.tsx) ── */
function ColorEditable({
  label,
  value,
  onChange,
  fallback,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fallback: string;
}) {
  const id = React.useId();
  // The native color input demands a valid #rrggbb; fall back so a partial hex
  // mid-type doesn't reset the swatch to black.
  const swatchValue = /^#([0-9a-fA-F]{6})$/.test(value.trim()) ? value.trim() : fallback;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors focus-within:ring-2 focus-within:ring-phisig-red/40 hover:border-phisig-red/30">
      <input
        type="color"
        value={swatchValue}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} color`}
        style={{ boxShadow: `0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px -2px ${swatchValue}99` }}
        className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5 transition-transform hover:scale-105"
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-xs font-semibold leading-tight text-foreground">
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex value`}
          spellCheck={false}
          maxLength={7}
          className="mt-0.5 w-full truncate bg-transparent font-mono text-xs uppercase leading-tight text-muted-foreground outline-none focus:text-foreground"
        />
      </div>
    </div>
  );
}

/* ── Per-axis override chip (44px tap target, one accent) ─────────────────── */
function AxisChip({
  label, sub, active, onClick,
}: { label: string; sub?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[44px] flex-col items-start justify-center rounded-lg border px-3 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50",
        active
          ? "border-phisig-red bg-phisig-red-soft/50 text-phisig-red"
          : "border-border bg-background text-foreground hover:border-phisig-red/40",
      )}
    >
      <span className="text-xs font-semibold leading-tight">{label}</span>
      {sub && <span className="text-[10px] capitalize text-muted-foreground leading-tight">{sub}</span>}
    </button>
  );
}

/* ── Icon-family override chip — previews real glyphs FROM that family ─────── */
const ICON_PREVIEW: Array<React.ComponentProps<typeof SiteIcon>["name"]> = [
  "star", "calendar", "users", "shield", "heart", "trophy",
];
function IconFamilyChip({
  label, family, active, onClick,
}: { label: string; family: IconFamilyId; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50",
        active
          ? "border-phisig-red bg-phisig-red-soft/40"
          : "border-border bg-background hover:border-phisig-red/40",
      )}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span className="flex items-center gap-1.5 text-phisig-red">
        {ICON_PREVIEW.map((n) => (
          <SiteIcon key={n} family={family} name={n} className="h-4 w-4" />
        ))}
      </span>
    </button>
  );
}

const EDITABLE_FIELDS: Record<string, { key: string; label: string; type: "input" | "textarea" }[]> = {
  hero: [
    { key: "h1.lead", label: "Headline Lead", type: "input" },
    { key: "h1.highlight", label: "Highlighted Word", type: "input" },
    { key: "h1.tail", label: "Headline Tail", type: "input" },
    { key: "subline", label: "Hero Subline / Tagline", type: "textarea" },
  ],
  stats: [
    { key: "brothers", label: "Active Members Count (e.g. 60+)", type: "input" },
    { key: "brothers.label", label: "Members Label (e.g. Active Brothers)", type: "input" },
    { key: "brothers.sub", label: "Members Subtext", type: "input" },
    { key: "gpa", label: "Chapter GPA (e.g. 3.45)", type: "input" },
    { key: "gpa.label", label: "GPA Label", type: "input" },
    { key: "gpa.sub", label: "GPA Subtext", type: "input" },
    { key: "years", label: "Years Strong (e.g. 50+)", type: "input" },
    { key: "years.label", label: "Years Label", type: "input" },
    { key: "years.sub", label: "Years Subtext", type: "input" },
    { key: "charity", label: "Charity Raised (e.g. $25k+)", type: "input" },
    { key: "charity.label", label: "Charity Label", type: "input" },
    { key: "charity.sub", label: "Charity Subtext", type: "input" },
  ],
  about: [
    { key: "history", label: "Chapter History / About Text", type: "textarea" },
    { key: "alumniLine", label: "Alumni Footprint Line", type: "input" },
    { key: "heritageLine", label: "Heritage / Chartering Line", type: "input" },
  ],
  testimonial: [
    { key: "quote", label: "Testimonial Quote", type: "textarea" },
    { key: "author", label: "Author Name", type: "input" },
    { key: "classYear", label: "Class Year (e.g. '26)", type: "input" },
    { key: "attribution", label: "Attribution / Title", type: "input" },
  ],
  spotlight: [
    { key: "name", label: "Member Name", type: "input" },
    { key: "role", label: "Major/Role", type: "input" },
    { key: "month", label: "Spotlight Month (e.g. October)", type: "input" },
    { key: "bio", label: "Biography Text", type: "textarea" },
    { key: "bullets", label: "Achievements / Highlights (separated by | or newlines)", type: "textarea" },
  ],
  faq: [
    { key: "json", label: "FAQ JSON (Array of {q, a} objects)", type: "textarea" },
  ],
  eboard: [
    { key: "1.name", label: "President - Name", type: "input" },
    { key: "1.role", label: "President - Role / Major", type: "input" },
    { key: "2.name", label: "VP - Name", type: "input" },
    { key: "2.role", label: "VP - Role / Major", type: "input" },
    { key: "3.name", label: "Treasurer - Name", type: "input" },
    { key: "3.role", label: "Treasurer - Role / Major", type: "input" },
    { key: "4.name", label: "Secretary - Name", type: "input" },
    { key: "4.role", label: "Secretary - Role / Major", type: "input" },
    { key: "5.name", label: "Recruitment - Name", type: "input" },
    { key: "5.role", label: "Recruitment - Role / Major", type: "input" },
  ],
  register: [
    { key: "termLabel", label: "Recruitment Term Label (e.g. Fall '26)", type: "input" },
    { key: "termLabelLong", label: "Full Term Label (optional, overrides default)", type: "input" },
  ],
};

export function WebsiteBuilderClient({
  initialConfig,
}: {
  initialConfig: Record<string, string>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [tab, setTab] = React.useState<TabId>("presets");

  // Local config state to dynamically sync overrides with live preview
  const [config, setConfig] = React.useState<Record<string, string>>(initialConfig);

  // Section content editor states
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editFields, setEditFields] = React.useState<Record<string, string>>({});
  const [savingSection, setSavingSection] = React.useState(false);

  const handleOpenEdit = (sectionId: string) => {
    setEditingSectionId(sectionId);
    const fields = EDITABLE_FIELDS[sectionId] || [];
    const initialValues: Record<string, string> = {};
    fields.forEach((f) => {
      const fullKey = sectionId === "hero" && f.key.startsWith("h1.")
        ? `hero.${f.key}`
        : sectionId === "register"
        ? `rush.${f.key}`
        : `${sectionId}.${f.key}`;
      initialValues[f.key] = config[fullKey] || "";
    });
    setEditFields(initialValues);
  };

  const handleSaveSectionContent = async () => {
    if (!editingSectionId) return;
    setSavingSection(true);
    try {
      const res = await fetch(`/api/admin/website/${editingSectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editFields }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Save failed");

      // Update local config state
      setConfig((prev) => {
        const next = { ...prev };
        Object.entries(editFields).forEach(([field, value]) => {
          const fullKey = editingSectionId === "hero" && field.startsWith("h1.")
            ? `hero.${field}`
            : editingSectionId === "register"
            ? `rush.${field}`
            : `${editingSectionId}.${field}`;
          next[fullKey] = value;
        });
        return next;
      });

      // Update individual states if editing hero
      if (editingSectionId === "hero") {
        if (editFields["h1.lead"] !== undefined) setHeadline(editFields["h1.lead"]);
        if (editFields["subline"] !== undefined) setTagline(editFields["subline"]);
      }

      push({
        title: "Section content updated",
        description: "Review the live preview on the right.",
        variant: "default",
      });
      setEditingSectionId(null);
    } catch (err: any) {
      push({
        title: "Failed to save section content",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSavingSection(false);
    }
  };

  // ── Staged brand + template (additive — Layout list is unchanged) ──────────
  const [template, setTemplate] = React.useState<TemplateId>(
    resolveTemplateId(initialConfig["website.template"]),
  );
  const [primaryHex, setPrimaryHex] = React.useState(
    initialConfig["brand.primaryHex"] || GS_PRIMARY,
  );
  const [secondaryHex, setSecondaryHex] = React.useState(
    initialConfig["brand.secondaryHex"] || GS_SECONDARY,
  );

  // ── Item 4: staged preset + per-axis overrides (component set / icon family) ─
  // An override is null when the axis should FOLLOW the preset default; picking a
  // chip pins an explicit override. Switching preset clears both back to null so
  // each preset starts from its own cohesive defaults, then can be tweaked.
  const [presetId, setPresetId] = React.useState<string>(
    resolveTemplatePreset(initialConfig["website.preset"]).id,
  );
  const rawSetOverride = initialConfig["website.componentSet"];
  const rawIconOverride = initialConfig["website.iconFamily"];
  const [componentSetOverride, setComponentSetOverride] = React.useState<ComponentSetId | null>(
    rawSetOverride && (COMPONENT_SET_IDS as readonly string[]).includes(rawSetOverride)
      ? (rawSetOverride as ComponentSetId)
      : null,
  );
  const [iconFamilyOverride, setIconFamilyOverride] = React.useState<IconFamilyId | null>(
    rawIconOverride && (ICON_FAMILY_IDS as readonly string[]).includes(rawIconOverride)
      ? (rawIconOverride as IconFamilyId)
      : null,
  );
  const activePreset = resolveTemplatePreset(presetId);
  const effectiveComponentSet: ComponentSetId = componentSetOverride ?? activePreset.componentSet;
  const effectiveIconFamily: IconFamilyId = iconFamilyOverride ?? activePreset.iconFamily;

  const selectPreset = (p: TemplatePreset) => {
    setPresetId(p.id);
    setTemplate(p.baseTemplate); // keep the base-template state (Template tab) in sync
    setComponentSetOverride(null); // per-axis overrides reset to this preset's defaults
    setIconFamilyOverride(null);
  };

  // New configuration states
  const [orientation, setOrientation] = React.useState<"centered" | "split-left" | "split-right">(
    (initialConfig["website.orientation"] as any) || "centered"
  );
  // #2 — read from the CANONICAL keys the public renderer + onboard API use, so
  // a value saved here (or during onboarding) round-trips instead of resetting.
  const [logo, setLogo] = React.useState(initialConfig["brand.logoUrl"] || initialConfig["website.logo"] || "");
  const [hero, setHero] = React.useState(initialConfig["brand.heroImageUrl"] || initialConfig["website.hero"] || "");
  const [headline, setHeadline] = React.useState(initialConfig["hero.h1.lead"] || initialConfig["website.headline"] || "");
  const [tagline, setTagline] = React.useState(initialConfig["hero.subline"] || initialConfig["website.tagline"] || "");
  // Chapter display name + brand SOFT tint are edited inline in the live preview.
  // These back the preview's name field + Soft color swatch, which previously had
  // no-op onChange handlers (edits silently vanished). They now persist on Save to
  // the canonical keys the public renderer reads (chapter.fraternityName +
  // brand.primarySoftHex → the --brand-primary-soft CSS var, see lib/brand-theme).
  const [fraternityName, setFraternityName] = React.useState(
    initialConfig["chapter.fraternityName"] || initialConfig["fraternityName"] || "",
  );
  const [softHex, setSoftHex] = React.useState(initialConfig["brand.primarySoftHex"] || "#eff6ff");

  // Quick Style Presets state — a single text box maps recognized keywords to a
  // built-in template + palette preset (no AI, no code-gen, no agents).
  const [tweakPrompt, setTweakPrompt] = React.useState("");

  // When the admin switches template, offer to clear any explicit
  // website.sections override so the new template's default order takes effect
  // (an existing override otherwise pins the order across templates).
  const [resetOrderOnTemplate, setResetOrderOnTemplate] = React.useState(true);
  const hasOrderOverride = Boolean(config["website.sections"]);
  const initialTemplate = resolveTemplateId(config["website.template"]);

  // Parse order
  const getOrderedSections = React.useCallback((): SectionConfig[] => {
    let orderList = [...DEFAULT_ORDER];
    const rawOrder = config["website.sections"];
    if (rawOrder) {
      try {
        const parsed = JSON.parse(rawOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          orderList = parsed.filter(key => key in SECTION_METADATA);
        }
      } catch {}
    }

    // Add missing default sections if any
    DEFAULT_ORDER.forEach(key => {
      if (!orderList.includes(key)) {
        orderList.push(key);
      }
    });

    return orderList.map(key => {
      const meta = SECTION_METADATA[key];
      const showKey = meta.showKey;
      let visible = true;
      if (showKey) {
        visible = config[showKey] !== "false"; // default true
      }
      return {
        id: key,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        showKey,
        visible
      };
    });
  }, [config]);

  const [sections, setSections] = React.useState<SectionConfig[]>([]);

  React.useEffect(() => {
    setSections(getOrderedSections());
  }, [getOrderedSections]);

  // Drag-and-drop reorder for the Layout list (item 3). The up/down buttons stay
  // as the accessible + touch fallback; both mutate the same `sections` order.
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);
  const reorderSections = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...sections];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    setSections(next);
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const next = [...sections];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    setSections(next);
  };

  const toggleVisibility = (id: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, visible: !s.visible };
      }
      return s;
    }));
  };

  // In-app confirm (replaces the jarring native window.confirm) for the
  // destructive "reset layout" action — matches the Dialog pattern used in the
  // roster. A native confirm() also blocks the JS thread and can't be styled or
  // reduced-motion-aware, so it's the wrong fit for a GOTY-bar admin surface.
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);

  const applyDefaults = () => {
    const reset = DEFAULT_ORDER.map(key => {
      const meta = SECTION_METADATA[key];
      return {
        id: key,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        showKey: meta.showKey,
        visible: true
      };
    });
    setSections(reset);
    setResetConfirmOpen(false);
    push({
      title: "Layout reset to defaults",
      description: "Review the order, then Save changes to publish it.",
      variant: "default",
    });
  };

  const resetToDefaults = () => setResetConfirmOpen(true);

  // "Reset to Greek Stack royal-blue + gold" — restores the platform brand preset.
  const resetBrandPreset = () => {
    setPrimaryHex(GS_PRIMARY);
    setSecondaryHex(GS_SECONDARY);
    push({
      title: "Brand reset to Greek Stack royal-blue + gold",
      description: "Save changes to publish the platform palette.",
      variant: "default",
    });
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const updates: Record<string, string> = {
        "website.sections": JSON.stringify(sections.map(s => s.id)),
        "website.template": template,
        // Item 4 — persist the chosen preset + the RESOLVED axes (override, or the
        // preset default when no override). resolveSiteConfig on the public renderer
        // reads these exact keys, so what the picker stages is what the page renders.
        "website.preset": presetId,
        "website.componentSet": effectiveComponentSet,
        "website.iconFamily": effectiveIconFamily,
        "brand.primaryHex": primaryHex.trim(),
        "brand.secondaryHex": secondaryHex.trim(),
        // Brand soft tint (was a no-op handler in the preview — now persisted).
        "brand.primarySoftHex": softHex.trim(),
        // Chapter display name (was a no-op handler). Only written when non-empty
        // so an unset field never clobbers an existing name with a blank.
        ...(fraternityName.trim() ? { "chapter.fraternityName": fraternityName.trim() } : {}),
        // #2 — write to the CANONICAL keys the public renderer actually reads,
        // so these controls change the LIVE site (they previously wrote to
        // website.* keys nothing consumed, so Save was a silent no-op while the
        // toast claimed "updated immediately"). orientation is now HONORED live:
        // the Classic hero (components/site/templates/hero-classic.tsx) reads
        // website.orientation and flips its two columns for "split-right"
        // ("centered"/"split-left"/unset keep the default headline-left layout,
        // so existing deploys render unchanged).
        "website.orientation": orientation,
        "brand.logoUrl": logo,
        "brand.heroImageUrl": hero,
        "hero.h1.lead": headline,
        "hero.subline": tagline,
      };
      sections.forEach(s => {
        if (s.showKey) {
          updates[s.showKey] = s.visible ? "true" : "false";
        }
      });

      // When the template changed and the admin opted in, clear the explicit
      // section-order override so the NEW template's default order reflows.
      // Writing "" lets the public renderer fall back to TEMPLATE_ORDER[template].
      if (template !== initialTemplate && resetOrderOnTemplate) {
        updates["website.sections"] = "";
      }

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Save failed");

      push({
        title: "Website configuration saved",
        description: "Your chapter landing page has been updated immediately.",
        variant: "default",
      });
      router.refresh();
    } catch (err: any) {
      push({
        title: "Failed to save configuration",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  // #10 — downscale + compress an uploaded image to a small data URL so a normal
  // phone photo can't blow past the ~5,000,000-char config cap (which surfaced
  // as an opaque "Invalid input" on Save). Rejects absurd files up front and
  // preserves logo transparency (PNG) while compressing hero photos (JPEG).
  const fileToCompressedDataUrl = (
    file: File,
    { maxDim, mime = "image/jpeg", quality = 0.82 }: { maxDim: number; mime?: string; quality?: number }
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error("That image is over 12MB. Please choose a smaller file."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read that image."));
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // SVGs are already vector/tiny — keep as-is, just cap length.
        if (file.type === "image/svg+xml") {
          if (dataUrl.length > 500_000) reject(new Error("That SVG is too large — please simplify it."));
          else resolve(dataUrl);
          return;
        }
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load that image."));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(dataUrl); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL(mime, quality));
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await fileToCompressedDataUrl(file, { maxDim: 256, mime: "image/png" }));
    } catch (err: any) {
      push({ title: "Couldn't use that logo", description: err?.message || "Please try another image.", variant: "destructive" });
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setHero(await fileToCompressedDataUrl(file, { maxDim: 1600, mime: "image/jpeg", quality: 0.82 }));
    } catch (err: any) {
      push({ title: "Couldn't use that hero image", description: err?.message || "Please try another image.", variant: "destructive" });
    }
  };

  // Quick Style Presets — a keyword matcher that maps recognized words in the
  // text box to a built-in template + palette preset. This is deterministic
  // client-side string matching, NOT AI/code generation. It only stages the same
  // template + color values the admin could pick by hand below; nothing is saved
  // until "Save changes".
  const applyStylePreset = () => {
    if (!tweakPrompt.trim()) return;

    const prompt = tweakPrompt.toLowerCase();

    // Keyword → REAL template id (classic | modern | bold). The matcher can only
    // ever stage a template the public renderer actually supports — no `as any`,
    // so a fake id can never compile in here and silently publish as Classic.
    if (
      prompt.includes("bold") ||
      prompt.includes("banner") ||
      prompt.includes("poster") ||
      prompt.includes("neon") ||
      prompt.includes("glow")
    ) {
      setTemplate("bold");
      setPrimaryHex("#0f172a");
      setSecondaryHex("#38bdf8");
    } else if (
      prompt.includes("modern") ||
      prompt.includes("split") ||
      prompt.includes("clean") ||
      prompt.includes("minimal") ||
      prompt.includes("simple")
    ) {
      setTemplate("modern");
      setPrimaryHex("#2563eb");
      setSecondaryHex("#f59e0b");
    } else if (
      prompt.includes("classic") ||
      prompt.includes("traditional") ||
      prompt.includes("serif") ||
      prompt.includes("crest")
    ) {
      setTemplate("classic");
      setPrimaryHex("#800000");
      setSecondaryHex("#d4af37");
    }

    if (prompt.includes("left") || prompt.includes("split left")) {
      setOrientation("split-left");
    } else if (prompt.includes("right") || prompt.includes("split right")) {
      setOrientation("split-right");
    } else if (prompt.includes("center") || prompt.includes("centered")) {
      setOrientation("centered");
    }

    if (prompt.includes("green") || prompt.includes("forest")) {
      setPrimaryHex("#15803d");
    } else if (prompt.includes("red") || prompt.includes("crimson")) {
      setPrimaryHex("#b91c1c");
    } else if (prompt.includes("gold") || prompt.includes("yellow")) {
      setSecondaryHex("#eab308");
    }

    if (prompt.includes("rush") || prompt.includes("join")) {
      setHeadline("Rush starts this fall");
      setTagline("Meet the brotherhood and become part of our legacy.");
    }

    setTweakPrompt("");
    push({
      title: "Style preset applied",
      description: "Review the updated preview on the right, then Save changes to publish.",
      variant: "default",
    });
  };

  const TABS: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
    { id: "presets", label: "Presets", icon: Sparkles },
    { id: "templates", label: "Template", icon: LayoutGrid },
    { id: "brand", label: "Brand", icon: Palette },
    { id: "layout", label: "Layout", icon: ChevronUp },
    { id: "tweak", label: "Style Presets", icon: Sparkles },
  ];

  // #7 — the interactive live preview, defined once and rendered on EVERY builder
  // tab: inline beside its controls in the Style-Presets tab, and in the shared
  // right rail for the Template / Brand / Layout tabs, so no tab edits blind.
  const livePreview = (
    <div className="rounded-xl border border-border bg-slate-950 p-4 min-h-[380px] flex flex-col justify-center">
      {/* #6 — read the CANONICAL chapter.* keys (with legacy unprefixed
          fallback) so each tenant previews THEIR identity instead of always the
          Phi Sig / USC reference chapter. */}
      <EditableLivePreview
        fraternityName={fraternityName}
        onFraternityName={setFraternityName}
        greekLetters={config["chapter.greekLetters"] || config["greekLetters"] || "ΦΣΚ"}
        greekLettersGlyphs={config["chapter.greekLettersGlyphs"] || config["greekLettersGlyphs"] || "ΦΣΚ"}
        fraternityLetters={config["chapter.fraternityLetters"] || config["fraternityLetters"] || "ΦΣΚ"}
        schoolName={config["chapter.schoolName"] || config["schoolName"] || "USC"}
        schoolShort={config["chapter.schoolShort"] || config["schoolShort"] || "USC"}
        primaryColor={primaryHex}
        onPrimaryColor={setPrimaryHex}
        darkColor={secondaryHex}
        onDarkColor={setSecondaryHex}
        softColor={softHex}
        onSoftColor={setSoftHex}
        heroHeadline={headline}
        onHeroHeadline={setHeadline}
        heroTagline={tagline}
        onHeroTagline={setTagline}
        subdomain={config["chapter.subdomain"] || config["subdomain"] || "usc"}
        templateId={template}
        orientation={orientation}
        chapterLogo={logo}
        chapterHero={hero}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Tab rail ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1" role="tablist" aria-label="Website builder sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-phisig-red shadow-sm ring-1 ring-phisig-red/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* ── PRESET PICKER (item 4) ────────────────────────────────────── */}
          {tab === "presets" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Pick a design preset</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A preset is a whole look - a layout, a component style, an icon
                  set, and a motion feel, tuned to go together. Pick one, then
                  fine-tune any part below. Your content and colors carry over.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {TEMPLATE_PRESETS.map((p) => {
                  const selected = presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectPreset(p)}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50",
                        selected ? "border-phisig-red shadow-md" : "border-border hover:border-phisig-red/40 hover:shadow-sm",
                      )}
                    >
                      {selected && (
                        <span className="absolute right-2.5 top-2.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-phisig-red text-white shadow">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-phisig-red-soft to-phisig-mist">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.thumb} alt={`${p.name} preview`} className="h-full w-full object-cover" loading="lazy" />
                      </span>
                      <span className="flex flex-1 flex-col gap-1.5 p-3">
                        <span className="text-sm font-semibold">{p.name}</span>
                        <span className="text-xs leading-relaxed text-muted-foreground">{p.blurb}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {[p.componentSet, p.iconFamily, p.motion].map((tag) => (
                            <span key={tag} className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                              {tag}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── Per-axis overrides ─────────────────────────────────────── */}
              <div className="space-y-5 rounded-xl border border-border bg-card/50 p-4">
                <div>
                  <h3 className="text-sm font-semibold">Fine-tune this preset</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Override any single part. &ldquo;Preset default&rdquo; follows{" "}
                    <strong>{activePreset.name}</strong>; picking another pins it.
                  </p>
                </div>

                {/* Component set */}
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Component style
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AxisChip
                      label="Preset default"
                      sub={activePreset.componentSet}
                      active={componentSetOverride === null}
                      onClick={() => setComponentSetOverride(null)}
                    />
                    {COMPONENT_SETS.map((s) => (
                      <AxisChip
                        key={s.id}
                        label={s.label}
                        sub={s.radius}
                        active={componentSetOverride === s.id}
                        onClick={() => setComponentSetOverride(s.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon family — with a live glyph preview drawn FROM that family */}
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Icon family
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <IconFamilyChip
                      label="Preset default"
                      family={activePreset.iconFamily}
                      active={iconFamilyOverride === null}
                      onClick={() => setIconFamilyOverride(null)}
                    />
                    {ICON_FAMILIES.map((f) => (
                      <IconFamilyChip
                        key={f.id}
                        label={f.label}
                        family={f.id}
                        active={iconFamilyOverride === f.id}
                        onClick={() => setIconFamilyOverride(f.id)}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    One family renders across the whole page - never mixed.
                  </p>
                </div>

                {/* Motion (comes from the preset; shown for context) */}
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Motion
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <span className="capitalize font-medium">{activePreset.motion}</span>
                    <span className="text-xs text-muted-foreground">
                      {activePreset.motion === "cinematic"
                        ? "2.5D depth + scroll reveals (reduced-motion safe)"
                        : activePreset.motion === "reveal"
                          ? "gentle scroll reveals"
                          : "minimal, restrained"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-slate-600">
                  <span className="font-medium text-foreground">Resolved system:</span>{" "}
                  {activePreset.name} · {effectiveComponentSet} components ·{" "}
                  {effectiveIconFamily} icons · {activePreset.motion} motion
                </div>
              </div>
            </div>
          )}

          {/* ── TEMPLATE GALLERY ──────────────────────────────────────────── */}
          {tab === "templates" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Choose a template</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each template keeps every section you configure - it only changes
                  the hero style and the default section order. Classic is the
                  original layout.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {TEMPLATE_META.map((tpl) => {
                  const selected = template === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTemplate(tpl.id)}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-phisig-red/50",
                        selected
                          ? "border-phisig-red shadow-md"
                          : "border-border hover:border-phisig-red/40 hover:shadow-sm",
                      )}
                    >
                      {selected && (
                        <span className="absolute right-2.5 top-2.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-phisig-red text-white shadow">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {/* Mockup thumbnail (static SVG in /public/templates). The
                          <img> degrades to the brand block if the asset is missing. */}
                      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-phisig-red-soft to-phisig-mist">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tpl.thumb}
                          alt={`${tpl.name} template preview`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </span>
                      <span className="flex flex-1 flex-col gap-1 p-3">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {tpl.name}
                          {tpl.id === initialTemplate && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                              Live
                            </span>
                          )}
                        </span>
                        <span className="text-xs leading-relaxed text-muted-foreground">{tpl.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Reset-order opt-in — only meaningful when a custom order exists
                  AND the staged template differs from the live one. */}
              {hasOrderOverride && template !== initialTemplate && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Checkbox
                    checked={resetOrderOnTemplate}
                    onCheckedChange={(v) => setResetOrderOnTemplate(Boolean(v))}
                    className="mt-0.5 h-4 w-4 border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <span className="text-xs leading-relaxed text-amber-900">
                    <strong>Reset section order to this template&apos;s default.</strong>{" "}
                    You previously customized the section order on the Layout tab.
                    Leave this on so the {TEMPLATE_META.find((t) => t.id === template)?.name}{" "}
                    layout reflows; turn it off to keep your custom order across templates.
                  </span>
                </label>
              )}
            </div>
          )}

          {/* ── BRAND PANEL ───────────────────────────────────────────────── */}
          {tab === "brand" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Brand colors</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your primary color themes the whole site instantly. The accent
                  (gold) is used by the Modern and Bold templates for highlights,
                  bands, and dividers.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorEditable
                  label="Primary color"
                  value={primaryHex}
                  onChange={setPrimaryHex}
                  fallback={GS_PRIMARY}
                />
                <ColorEditable
                  label="Accent color (gold)"
                  value={secondaryHex}
                  onChange={setSecondaryHex}
                  fallback={GS_SECONDARY}
                />
              </div>

              {/* Live swatch preview so the admin sees the pair before saving. */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <span className="flex -space-x-2">
                  <span
                    className="h-9 w-9 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: /^#([0-9a-fA-F]{6})$/.test(primaryHex.trim()) ? primaryHex.trim() : GS_PRIMARY }}
                    aria-hidden
                  />
                  <span
                    className="h-9 w-9 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: /^#([0-9a-fA-F]{6})$/.test(secondaryHex.trim()) ? secondaryHex.trim() : GS_SECONDARY }}
                    aria-hidden
                  />
                </span>
                <p className="text-xs text-muted-foreground">
                  Primary &amp; accent preview. Saving applies them across the public site.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={resetBrandPreset}
                disabled={busy}
                className="gap-1.5 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Reset to Greek Stack royal-blue + gold
              </Button>
            </div>
          )}

          {/* ── LAYOUT (the original section list — unchanged) ───────────────── */}
          {tab === "layout" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Layout Hierarchy</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Drag a section to reorder, or use the arrows. Toggle Show to add or remove it from the page.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={busy} className="text-xs gap-1.5 h-8">
                  <RefreshCw className="h-3 w-3" />
                  Reset to defaults
                </Button>
              </div>

              <div className="space-y-2.5">
                {sections.map((sect, index) => {
                  const Icon = sect.icon;
                  const isAlwaysVisible = !sect.showKey;

                  return (
                    <Card
                      key={sect.id}
                      draggable
                      onDragStart={() => setDragIdx(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (overIdx !== index) setOverIdx(index);
                      }}
                      onDrop={() => {
                        if (dragIdx !== null) reorderSections(dragIdx, index);
                        setDragIdx(null);
                        setOverIdx(null);
                      }}
                      onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                      className={cn(
                        "transition-all duration-200 border-l-4",
                        sect.visible ? "border-l-phisig-red border-border" : "border-l-slate-300 border-border opacity-65 bg-slate-50/50",
                        dragIdx === index && "opacity-50",
                        overIdx === index && dragIdx !== index && "ring-2 ring-phisig-red/40",
                      )}
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="hidden sm:flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-slate-400 active:cursor-grabbing"
                            aria-hidden="true"
                            title="Drag to reorder"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm leading-none">{sect.name}</span>
                              {sect.visible ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{sect.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Edit Content Button */}
                          {["hero", "stats", "about", "testimonial", "spotlight", "faq", "eboard", "register"].includes(sect.id) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(sect.id)}
                              disabled={busy}
                              className="text-xs h-8 mr-2"
                            >
                              Edit Content
                            </Button>
                          )}

                          {/* Visibility Toggle */}
                          {!isAlwaysVisible ? (
                            <div className="flex items-center gap-1.5 mr-2">
                              <Checkbox
                                id={`visible-${sect.id}`}
                                checked={sect.visible}
                                onCheckedChange={() => toggleVisibility(sect.id)}
                                className="h-4 w-4 border-slate-300 data-[state=checked]:bg-phisig-red data-[state=checked]:border-phisig-red"
                              />
                              <label htmlFor={`visible-${sect.id}`} className="text-xs text-slate-600 font-medium cursor-pointer select-none">
                                Show
                              </label>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic mr-3 select-none">
                              Always Visible
                            </span>
                          )}

                          {/* Order Controls */}
                          <div className="flex flex-col sm:flex-row border rounded-lg bg-card overflow-hidden">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveUp(index)}
                              disabled={index === 0 || busy}
                              className="h-11 w-11 sm:h-8 sm:w-8 rounded-none hover:bg-slate-100 text-slate-500 disabled:opacity-35"
                              title="Move Up"
                              aria-label={`Move ${sect.name} up`}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveDown(index)}
                              disabled={index === sections.length - 1 || busy}
                              className="h-11 w-11 sm:h-8 sm:w-8 rounded-none border-t sm:border-t-0 sm:border-l hover:bg-slate-100 text-slate-500 disabled:opacity-35"
                              title="Move Down"
                              aria-label={`Move ${sect.name} down`}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── QUICK STYLE PRESETS PANEL ─────────────────────────────────── */}
          {tab === "tweak" && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Quick Style Presets</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Type a few style words (like &ldquo;classic&rdquo;, &ldquo;modern&rdquo;, &ldquo;bold&rdquo;, &ldquo;green&rdquo;, or &ldquo;split left&rdquo;) and we&apos;ll stage a matching template and color preset for you. You can fine-tune everything by hand below.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Style keywords
                    </label>
                    <textarea
                      value={tweakPrompt}
                      onChange={(e) => setTweakPrompt(e.target.value)}
                      placeholder="e.g., bold dark banner with bright blue highlights and a split left layout"
                      className="w-full h-24 rounded-lg border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-phisig-red/40"
                    />
                    <Button
                      onClick={applyStylePreset}
                      disabled={!tweakPrompt.trim()}
                      className="w-full bg-phisig-red hover:bg-phisig-red-dark text-white gap-1.5"
                    >
                      <Sparkles className="h-4 w-4" />
                      Apply style preset
                    </Button>
                  </div>

                  <hr className="border-border" />

                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-foreground">Manual Adjustments</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Layout Orientation</label>
                        <select
                          value={orientation}
                          onChange={(e: any) => setOrientation(e.target.value)}
                          className="w-full rounded-md border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-phisig-red/40"
                        >
                          <option value="centered">Centered</option>
                          <option value="split-left">Split Left</option>
                          <option value="split-right">Split Right</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Template Style</label>
                        <select
                          value={template}
                          // Coerce through resolveTemplateId so the staged value is
                          // ALWAYS a real TemplateId the renderer supports.
                          onChange={(e) => setTemplate(resolveTemplateId(e.target.value))}
                          className="w-full rounded-md border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-phisig-red/40"
                        >
                          {/* Options sourced from TEMPLATE_META — the SAME single
                              source of truth the public renderer reads, so the
                              dropdown can never drift to a template that doesn't
                              exist. */}
                          {TEMPLATE_META.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 block">Chapter Logo</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                        />
                        {logo && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-emerald-600 font-semibold">✓ Uploaded</span>
                            <button
                              type="button"
                              onClick={() => setLogo("")}
                              className="text-[10px] text-rose-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 block">Hero Background Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHeroUpload}
                          className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                        />
                        {hero && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-emerald-600 font-semibold">✓ Uploaded</span>
                            <button
                              type="button"
                              onClick={() => setHero("")}
                              className="text-[10px] text-rose-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Live Preview (shared with the other tabs via the
                    `livePreview` const so there is a single source of truth). */}
                {livePreview}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky actions rail (shared across tabs) ───────────────────────── */}
        <div className="space-y-5">
          {/* #7 — live preview in the shared rail for every tab EXCEPT Style
              Presets (which renders it inline beside its own controls), so
              admins on the Template / Brand / Layout tabs still see their
              changes render as they make them. */}
          {tab !== "tweak" && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Live preview
              </div>
              {livePreview}
            </div>
          )}
          <Card className="bg-gradient-to-br from-white to-phisig-mist border-phisig-red/10 shadow-md">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-base">Actions</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Saving publishes your template, brand colors, and section layout to
                the public landing page immediately. Changes are white-labeled and
                cached safely per subdomain.
              </p>

              <Button onClick={() => handleSave()} disabled={busy} className="w-full bg-phisig-red hover:bg-phisig-red-dark text-white font-medium shadow-sm">
                {busy ? (
                  <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save changes</>
                )}
              </Button>

              <div className="rounded-lg border border-border bg-card/60 p-3 text-xs text-slate-600">
                <div className="font-medium text-foreground">Staged</div>
                <ul className="mt-1.5 space-y-1">
                  <li>Preset: <strong>{activePreset.name}</strong></li>
                  <li>System: <strong className="capitalize">{effectiveComponentSet}</strong> · <strong className="capitalize">{effectiveIconFamily}</strong> icons</li>
                  <li>Template: <strong className="capitalize">{TEMPLATE_META.find((t) => t.id === template)?.name}</strong></li>
                  <li className="flex items-center gap-1.5">
                    Brand:
                    <span className="inline-block h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: /^#([0-9a-fA-F]{6})$/.test(primaryHex.trim()) ? primaryHex.trim() : GS_PRIMARY }} aria-hidden />
                    <span className="inline-block h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: /^#([0-9a-fA-F]{6})$/.test(secondaryHex.trim()) ? secondaryHex.trim() : GS_SECONDARY }} aria-hidden />
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-sm">Builder Guides</h3>
              <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4 leading-relaxed">
                <li>The <strong>Template</strong> changes the hero style + default order; every section you configure carries over.</li>
                <li>The <strong>accent (gold)</strong> color only affects the Modern and Bold templates - Classic stays on your primary color.</li>
                <li>Use the <strong>Up/Down arrows</strong> on the Layout tab to fine-tune order. Sections closer to the top load first (LCP).</li>
                <li><strong>Hero</strong> and <strong>Registration Form</strong> cannot be hidden so the site is always functional for prospects.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reset-to-defaults confirm (replaces window.confirm) */}
      <Dialog open={resetConfirmOpen} onOpenChange={(o) => !busy && setResetConfirmOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset layout to defaults?</DialogTitle>
            <DialogDescription>
              This restores the original section order and makes every section
              visible. Nothing is published until you Save changes, so you can
              still cancel after reviewing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={applyDefaults} disabled={busy} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Reset layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Content Dialog */}
      <Dialog open={editingSectionId !== null} onOpenChange={(o) => !savingSection && !o && setEditingSectionId(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">Edit {editingSectionId} Content</DialogTitle>
            <DialogDescription>
              Modify the copy fields for this section. Changes are saved to database and show in live preview.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingSectionId && EDITABLE_FIELDS[editingSectionId]?.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={editFields[field.key] || ""}
                    onChange={(e) => setEditFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full h-24 rounded-md border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-phisig-red/40"
                  />
                ) : (
                  <input
                    type="text"
                    value={editFields[field.key] || ""}
                    onChange={(e) => setEditFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-phisig-red/40"
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSectionId(null)} disabled={savingSection}>
              Cancel
            </Button>
            <Button onClick={handleSaveSectionContent} disabled={savingSection} className="gap-1.5 bg-phisig-red hover:bg-phisig-red-dark text-white">
              {savingSection ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Content</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

