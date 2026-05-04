"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Save, Loader2, Image as ImageIcon, Star, Crown, Sparkles,
  RotateCcw, ExternalLink, Upload,
} from "lucide-react";
import Link from "next/link";

const ICONS = ["Crown", "Trophy", "HandHeart", "Users", "Award", "Star", "Heart", "GraduationCap", "BookOpen", "Music", "Building2", "Flame", "ShieldCheck"];

export function SettingsManager({ initial }: { initial: Record<string, string> }) {
  const { push } = useToast();
  const [values, setValues] = React.useState(initial);
  const [dirty, setDirty] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  function set(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
    setDirty((d) => new Set(d).add(key));
  }

  async function save() {
    if (dirty.size === 0) return;
    setBusy(true);
    try {
      const updates: Record<string, string> = {};
      for (const k of dirty) updates[k] = values[k];
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error();
      push({ title: `Saved ${dirty.size} change${dirty.size === 1 ? "" : "s"}`, variant: "success" });
      setDirty(new Set());
    } catch {
      push({ title: "Save failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {dirty.size > 0 && (
        <div className="sticky top-16 z-30 -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="rounded-xl border border-phisig-red/30 bg-white shadow-lg p-3 flex items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-semibold">{dirty.size}</span> unsaved change{dirty.size === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setValues(initial); setDirty(new Set()); }}>
                <RotateCcw className="h-3.5 w-3.5" /> Discard
              </Button>
              <Button size="sm" onClick={save} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <Section title="Hero" eyebrow="Top of homepage" icon={Sparkles}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Eyebrow badge text">
            <Input value={values["hero.eyebrow"] || ""} onChange={(e) => set("hero.eyebrow", e.target.value)} placeholder="Fall Rush 2026 — Interest list now open" />
          </Field>
          <Field label="Subline / hero copy">
            <Textarea
              value={values["hero.subline"] || ""}
              onChange={(e) => set("hero.subline", e.target.value)}
              placeholder="Phi Sigma Kappa, Gamma Triton at the University of South Carolina…"
              rows={3}
            />
          </Field>
        </div>
      </Section>

      {/* HERO PHOTOS */}
      <Section title="Hero photo collage" eyebrow="3 tiles in the hero (right side)" icon={ImageIcon}>
        <p className="text-xs text-muted-foreground mb-4">
          Each tile shows a real Instagram post from{" "}
          <Link href="https://www.instagram.com/phisig_usc/" target="_blank" className="text-phisig-red hover:underline inline-flex items-center gap-1">
            @phisig_usc <ExternalLink className="h-3 w-3" />
          </Link>
          . Find a post on Instagram, copy the slug from the URL (the part after <code className="text-foreground">/p/</code>), and paste it below.
        </p>
        <div className="grid lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <PhotoCard
              key={n}
              title={n === 1 ? "Tile 1 (large)" : `Tile ${n}`}
              slug={values[`hero.tile${n}.slug`] || ""}
              caption={values[`hero.tile${n}.caption`] || ""}
              icon={values[`hero.tile${n}.icon`] || ""}
              onChangeSlug={(v) => set(`hero.tile${n}.slug`, v)}
              onChangeCaption={(v) => set(`hero.tile${n}.caption`, v)}
              onChangeIcon={(v) => set(`hero.tile${n}.icon`, v)}
            />
          ))}
        </div>
      </Section>

      {/* SPOTLIGHT */}
      <Section title="Brother of the Month" eyebrow="Spotlight section" icon={Star}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram post slug">
            <Input value={values["spotlight.slug"] || ""} onChange={(e) => set("spotlight.slug", e.target.value)} placeholder="DXzzTaFjSyj" />
          </Field>
          <Field label="Month">
            <Input value={values["spotlight.month"] || ""} onChange={(e) => set("spotlight.month", e.target.value)} placeholder="April" />
          </Field>
          <Field label="Brother's name">
            <Input value={values["spotlight.name"] || ""} onChange={(e) => set("spotlight.name", e.target.value)} placeholder="Michael McCarthy" />
          </Field>
          <Field label="Role / class">
            <Input value={values["spotlight.role"] || ""} onChange={(e) => set("spotlight.role", e.target.value)} placeholder="Freshman · Philanthropy Chair" />
          </Field>
          <Field label="Bio (1-2 sentences)" className="sm:col-span-2">
            <Textarea
              value={values["spotlight.bio"] || ""}
              onChange={(e) => set("spotlight.bio", e.target.value)}
              rows={3}
              placeholder="What this brother did to earn the recognition."
            />
          </Field>
        </div>
        <PhotoPreview slug={values["spotlight.slug"]} className="mt-4" />
      </Section>

      {/* ABOUT */}
      <Section title="About section photo" eyebrow="Right column of the About section" icon={ImageIcon}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram post slug">
            <Input value={values["about.slug"] || ""} onChange={(e) => set("about.slug", e.target.value)} placeholder="DWmioxGCaBG" />
          </Field>
          <Field label="Caption">
            <Input value={values["about.caption"] || ""} onChange={(e) => set("about.caption", e.target.value)} placeholder="Spring formal · NOLA" />
          </Field>
          <Field label="Image crop position (CSS object-position)">
            <Select value={values["about.objectPosition"] || "50% 50%"} onValueChange={(v) => set("about.objectPosition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50% 0%">Top</SelectItem>
                <SelectItem value="50% 25%">Upper</SelectItem>
                <SelectItem value="50% 50%">Center</SelectItem>
                <SelectItem value="50% 75%">Lower</SelectItem>
                <SelectItem value="50% 80%">Lower-bottom</SelectItem>
                <SelectItem value="50% 100%">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <PhotoPreview slug={values["about.slug"]} objectPosition={values["about.objectPosition"]} className="mt-4" />
      </Section>

      {/* STATS */}
      <Section title="Stats strip" eyebrow="Numbers shown under the hero" icon={Crown}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Brothers">
            <Input value={values["stats.brothers"] || ""} onChange={(e) => set("stats.brothers", e.target.value)} placeholder="60+" />
          </Field>
          <Field label="Chapter GPA">
            <Input value={values["stats.gpa"] || ""} onChange={(e) => set("stats.gpa", e.target.value)} placeholder="3.45" />
          </Field>
          <Field label="Years strong">
            <Input value={values["stats.years"] || ""} onChange={(e) => set("stats.years", e.target.value)} placeholder="150+" />
          </Field>
          <Field label="Charity raised">
            <Input value={values["stats.charity"] || ""} onChange={(e) => set("stats.charity", e.target.value)} placeholder="$25k+" />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title, eyebrow, icon: Icon, children,
}: {
  title: string;
  eyebrow: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-phisig-red">
            <Icon className="h-3 w-3" /> {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 inline-block text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function PhotoCard({
  title, slug, caption, icon, onChangeSlug, onChangeCaption, onChangeIcon,
}: {
  title: string; slug: string; caption: string; icon: string;
  onChangeSlug: (v: string) => void; onChangeCaption: (v: string) => void; onChangeIcon: (v: string) => void;
}) {
  const { push } = useToast();
  const [uploading, setUploading] = React.useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      onChangeSlug(json.url); // store the full Vercel Blob URL as the "slug"
      push({ title: "Photo uploaded — click Save to apply", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <PhotoPreview slug={slug} />
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-phisig-red text-white px-3 py-2 text-sm font-medium hover:bg-phisig-red-dark transition-colors">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload photo"}
        </span>
      </label>
      <p className="text-[10px] text-muted-foreground">
        Or paste an Instagram post slug below (the part after <code className="text-foreground">/p/</code>):
      </p>
      <Field label="Image source">
        <Input value={slug} onChange={(e) => onChangeSlug(e.target.value)} placeholder="DXzzTaFjSyj or full URL" />
      </Field>
      <Field label="Caption">
        <Input value={caption} onChange={(e) => onChangeCaption(e.target.value)} placeholder="Game Day" />
      </Field>
      <Field label="Icon">
        <Select value={icon} onValueChange={onChangeIcon}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function PhotoPreview({ slug, className, objectPosition }: { slug?: string; className?: string; objectPosition?: string }) {
  if (!slug) return <div className={`aspect-[4/3] rounded-lg bg-secondary border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground ${className ?? ""}`}>No slug yet</div>;
  return (
    <Link
      href={`https://www.instagram.com/p/${slug}/`}
      target="_blank"
      rel="noreferrer"
      className={`block relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-secondary ${className ?? ""}`}
    >
      <img
        src={`/api/photo/${slug}`}
        alt={`Preview ${slug}`}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: objectPosition || "50% 50%" }}
      />
      <span className="absolute bottom-2 right-2 text-[10px] bg-white/90 backdrop-blur rounded px-2 py-0.5 inline-flex items-center gap-1 text-phisig-red font-semibold">
        @phisig_usc <ExternalLink className="h-2.5 w-2.5" />
      </span>
    </Link>
  );
}
