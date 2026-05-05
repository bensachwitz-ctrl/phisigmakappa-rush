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
  RotateCcw, ExternalLink, Upload, Users, Mail, HandHeart, ShieldCheck,
  FileText, Plus, Trash2, ArrowUp, ArrowDown, MessageSquareQuote,
  CalendarDays, ListChecks, Activity,
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

      {/* BRAND COLORS — chapter-level theme override (white-label) */}
      <Section title="Brand colors" eyebrow="Override the cardinal-red default with your school color" icon={Sparkles}>
        <p className="text-xs text-muted-foreground mb-4">
          Default is Phi Sigma Kappa cardinal red <code className="font-mono text-foreground">#C8102E</code>.
          For chapters at other schools, paste your school&apos;s hex code. Format:{" "}
          <code className="font-mono text-foreground">#RRGGBB</code>. Changes apply on next page load — no
          code rebuild needed.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Primary (default #C8102E)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={values["brand.primaryHex"] || "#C8102E"}
                onChange={(e) => set("brand.primaryHex", e.target.value)}
                className="h-9 w-12 rounded-md border border-border cursor-pointer"
                aria-label="Primary brand color picker"
              />
              <Input
                value={values["brand.primaryHex"] || ""}
                onChange={(e) => set("brand.primaryHex", e.target.value)}
                placeholder="#C8102E"
                className="font-mono"
              />
            </div>
          </Field>
          <Field label="Primary dark (default #A20D26)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={values["brand.primaryDarkHex"] || "#A20D26"}
                onChange={(e) => set("brand.primaryDarkHex", e.target.value)}
                className="h-9 w-12 rounded-md border border-border cursor-pointer"
                aria-label="Primary dark brand color picker"
              />
              <Input
                value={values["brand.primaryDarkHex"] || ""}
                onChange={(e) => set("brand.primaryDarkHex", e.target.value)}
                placeholder="#A20D26"
                className="font-mono"
              />
            </div>
          </Field>
          <Field label="Primary soft / tint (default #FCEFF1)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={values["brand.primarySoftHex"] || "#FCEFF1"}
                onChange={(e) => set("brand.primarySoftHex", e.target.value)}
                className="h-9 w-12 rounded-md border border-border cursor-pointer"
                aria-label="Primary soft brand color picker"
              />
              <Input
                value={values["brand.primarySoftHex"] || ""}
                onChange={(e) => set("brand.primarySoftHex", e.target.value)}
                placeholder="#FCEFF1"
                className="font-mono"
              />
            </div>
          </Field>
        </div>
      </Section>

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
          <Field label="Headline part 1">
            <Input value={values["hero.h1.lead"] || ""} onChange={(e) => set("hero.h1.lead", e.target.value)} placeholder="The chapter that built" />
          </Field>
          <Field label="Headline part 2">
            <Input value={values["hero.h1.tail"] || ""} onChange={(e) => set("hero.h1.tail", e.target.value)} placeholder="the men of" />
          </Field>
          <Field label="Headline highlight (red word)">
            <Input value={values["hero.h1.highlight"] || ""} onChange={(e) => set("hero.h1.highlight", e.target.value)} placeholder="Carolina" />
          </Field>
          <Field label="Primary CTA label">
            <Input value={values["hero.cta.label"] || ""} onChange={(e) => set("hero.cta.label", e.target.value)} placeholder="Get on the interest list" />
          </Field>
          <Field label="Primary CTA link" className="sm:col-span-2">
            <Input value={values["hero.cta.href"] || ""} onChange={(e) => set("hero.cta.href", e.target.value)} placeholder="#register or https://…" />
          </Field>
        </div>
      </Section>

      {/* E-BOARD */}
      <Section title="Executive board" eyebrow="5 leadership cards on homepage" icon={Crown}>
        <p className="text-xs text-muted-foreground mb-4">
          Fill in the brothers' names and roles. Leave a row blank to hide that slot. Headshot optional — paste an Instagram slug or upload a photo.
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Slot {n}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Name">
                  <Input value={values[`eboard.${n}.name`] || ""} onChange={(e) => set(`eboard.${n}.name`, e.target.value)} placeholder="Mark Laughery" />
                </Field>
                <Field label="Role">
                  <Input value={values[`eboard.${n}.role`] || ""} onChange={(e) => set(`eboard.${n}.role`, e.target.value)} placeholder="President" />
                </Field>
              </div>
              <Field label="Headshot (optional)">
                <EboardHeadshotInput
                  value={values[`eboard.${n}.headshotUrl`] || ""}
                  onChange={(v) => set(`eboard.${n}.headshotUrl`, v)}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      {/* CONTACT */}
      <Section title="Contact &amp; social" eyebrow="Email, address, Instagram, advisor" icon={Mail}>
        {(values["contact.advisorName"] === "Chapter Advisor" || !values["contact.advisorName"] || !values["contact.rushPhone"]) && (
          <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900">
            <strong className="font-semibold">Heads up — visible on the public site:</strong>{" "}
            {values["contact.advisorName"] === "Chapter Advisor" || !values["contact.advisorName"]
              ? "Replace “Chapter Advisor” with the real advisor's full name. "
              : ""}
            {!values["contact.rushPhone"]
              ? "Add a chapter or rush-chair phone number — parents reviewing the site expect a callable contact, not just an email."
              : ""}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Rush email">
            <Input value={values["contact.rushEmail"] || ""} onChange={(e) => set("contact.rushEmail", e.target.value)} placeholder="rush@phisig-usc.com" />
          </Field>
          <Field label="Rush phone (optional)">
            <Input value={values["contact.rushPhone"] || ""} onChange={(e) => set("contact.rushPhone", e.target.value)} placeholder="(803) 555-0142" />
          </Field>
          <Field label="Chapter advisor — name">
            <Input value={values["contact.advisorName"] || ""} onChange={(e) => set("contact.advisorName", e.target.value)} placeholder="Dr. Jane Doe" />
          </Field>
          <Field label="Chapter advisor — title">
            <Input value={values["contact.advisorTitle"] || ""} onChange={(e) => set("contact.advisorTitle", e.target.value)} placeholder="Alumni Chapter Advisor, Gamma Triton" />
          </Field>
          <Field label="Chapter advisor — email">
            <Input value={values["contact.advisorEmail"] || ""} onChange={(e) => set("contact.advisorEmail", e.target.value)} placeholder="advisor@phisig-usc.com" />
          </Field>
          <Field label="Address">
            <Input value={values["contact.address"] || ""} onChange={(e) => set("contact.address", e.target.value)} placeholder="1525 College St" />
          </Field>
          <Field label="City / state / zip">
            <Input value={values["contact.cityState"] || ""} onChange={(e) => set("contact.cityState", e.target.value)} placeholder="Columbia, SC 29208" />
          </Field>
          <Field label="Google Maps URL">
            <Input value={values["contact.mapsUrl"] || ""} onChange={(e) => set("contact.mapsUrl", e.target.value)} placeholder="https://maps.google.com/?q=…" />
          </Field>
          <Field label="Instagram handle">
            <Input value={values["contact.instagramHandle"] || ""} onChange={(e) => set("contact.instagramHandle", e.target.value)} placeholder="@phisig_usc" />
          </Field>
          <Field label="Instagram URL">
            <Input value={values["contact.instagramUrl"] || ""} onChange={(e) => set("contact.instagramUrl", e.target.value)} placeholder="https://www.instagram.com/phisig_usc/" />
          </Field>
        </div>
      </Section>

      {/* PHILANTHROPY */}
      <Section title="Philanthropy" eyebrow="Beneficiary, dollars raised" icon={HandHeart}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Beneficiary (full name)">
            <Input value={values["philanthropy.beneficiary"] || ""} onChange={(e) => set("philanthropy.beneficiary", e.target.value)} placeholder="Special Olympics South Carolina" />
          </Field>
          <Field label="Beneficiary (short label)">
            <Input value={values["philanthropy.beneficiaryShort"] || ""} onChange={(e) => set("philanthropy.beneficiaryShort", e.target.value)} placeholder="Special Olympics SC" />
          </Field>
          <Field label="Most recent year">
            <Input value={values["philanthropy.raisedYear"] || ""} onChange={(e) => set("philanthropy.raisedYear", e.target.value)} placeholder="2025" />
          </Field>
          <Field label="Most recent event total">
            <Input value={values["philanthropy.raisedAmount"] || ""} onChange={(e) => set("philanthropy.raisedAmount", e.target.value)} placeholder="$700" />
          </Field>
          <Field label="All-time total" className="sm:col-span-2">
            <Input value={values["philanthropy.raisedTotal"] || ""} onChange={(e) => set("philanthropy.raisedTotal", e.target.value)} placeholder="$25k+" />
          </Field>
        </div>
      </Section>

      {/* TIMELINE — admin repeater */}
      <Section title="How rush works (timeline)" eyebrow="Week-by-week schedule cards" icon={CalendarDays}>
        <p className="text-xs text-muted-foreground mb-4">
          Three weeks by default. Add or remove rows as your chapter&apos;s schedule changes.
        </p>
        <JsonArrayEditor
          value={values["timeline.json"]}
          onChange={(v) => set("timeline.json", v)}
          fields={[
            { key: "week", label: "Week label", placeholder: "Week 1" },
            { key: "title", label: "Title", placeholder: "Open events" },
            { key: "body", label: "Body", placeholder: "What happens this week", textarea: true },
          ]}
          newRow={{ week: "", title: "", body: "" }}
          rowLabel={(r) => `${r.week || "(unnamed)"} — ${r.title || "untitled"}`}
        />
      </Section>

      {/* FAQ — admin repeater */}
      <Section title="FAQ" eyebrow="Common questions accordion" icon={Sparkles}>
        <p className="text-xs text-muted-foreground mb-4">
          Add as many Q&amp;A pairs as you want. They render in the order shown here.
        </p>
        <JsonArrayEditor
          value={values["faq.json"]}
          onChange={(v) => set("faq.json", v)}
          fields={[
            { key: "q", label: "Question", placeholder: "Is there a GPA requirement?" },
            { key: "a", label: "Answer", placeholder: "Our chapter average is…", textarea: true },
          ]}
          newRow={{ q: "", a: "" }}
          rowLabel={(r) => r.q || "(empty question)"}
        />
      </Section>

      {/* VALUES cards */}
      <Section title="Three Cardinal Principles" eyebrow="Brotherhood / Scholarship / Character cards" icon={ShieldCheck}>
        <JsonArrayEditor
          value={values["values.json"]}
          onChange={(v) => set("values.json", v)}
          fields={[
            { key: "title", label: "Title", placeholder: "Brotherhood" },
            { key: "body", label: "Body", placeholder: "Lifelong friendships…", textarea: true },
            { key: "icon", label: "Icon", placeholder: "Users", iconPicker: true },
          ]}
          newRow={{ title: "", body: "", icon: "Users" }}
          rowLabel={(r) => r.title || "(unnamed)"}
        />
      </Section>

      {/* HIGHLIGHTS ribbon */}
      <Section title="Highlights ribbon" eyebrow="Compact icon + label row under stats" icon={ListChecks}>
        <JsonArrayEditor
          value={values["highlights.json"]}
          onChange={(v) => set("highlights.json", v)}
          fields={[
            { key: "label", label: "Label", placeholder: "Special Olympics SC partners" },
            { key: "icon", label: "Icon", placeholder: "HandHeart", iconPicker: true },
          ]}
          newRow={{ label: "", icon: "HandHeart" }}
          rowLabel={(r) => r.label || "(empty)"}
        />
      </Section>

      {/* RECENT activity strip */}
      <Section title="Recent activity strip" eyebrow="4 cards under the Instagram feed" icon={Activity}>
        <JsonArrayEditor
          value={values["recent.json"]}
          onChange={(v) => set("recent.json", v)}
          fields={[
            { key: "tag", label: "Tag", placeholder: "Philanthropy" },
            { key: "title", label: "Title", placeholder: "Polar Plunge raised $700…" },
            { key: "icon", label: "Icon", placeholder: "HandHeart", iconPicker: true },
          ]}
          newRow={{ tag: "", title: "", icon: "Trophy" }}
          rowLabel={(r) => `${r.tag || "(no tag)"} — ${r.title || "no title"}`}
        />
      </Section>

      {/* TESTIMONIAL */}
      <Section title="Alumni testimonial" eyebrow="Quote in the testimonial section" icon={MessageSquareQuote}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Quote" className="sm:col-span-2">
            <Textarea
              value={values["testimonial.quote"] || ""}
              onChange={(e) => set("testimonial.quote", e.target.value)}
              rows={4}
              placeholder="Phi Sig isn't a four-year decision…"
            />
          </Field>
          <Field label="Author">
            <Input
              value={values["testimonial.author"] || ""}
              onChange={(e) => set("testimonial.author", e.target.value)}
              placeholder="A. Mitchell"
            />
          </Field>
          <Field label="Class year">
            <Input
              value={values["testimonial.classYear"] || ""}
              onChange={(e) => set("testimonial.classYear", e.target.value)}
              placeholder="'22"
            />
          </Field>
          <Field label="Attribution / role" className="sm:col-span-2">
            <Input
              value={values["testimonial.attribution"] || ""}
              onChange={(e) => set("testimonial.attribution", e.target.value)}
              placeholder="Gamma Triton alumnus, finance"
            />
          </Field>
        </div>
      </Section>

      {/* ABOUT history paragraph + anti-hazing body */}
      <Section title="Long-form copy" eyebrow="History paragraph + anti-hazing block body" icon={FileText}>
        <div className="space-y-4">
          <Field label="About-section history paragraph (Founded 1873 / Gamma Triton 1975 etc.)">
            <Textarea
              value={values["about.history"] || ""}
              onChange={(e) => set("about.history", e.target.value)}
              rows={5}
              placeholder="Phi Sigma Kappa was founded at Massachusetts Agricultural College in 1873…"
            />
          </Field>
          <Field label="Anti-hazing block body (the paragraph above the hotline)">
            <Textarea
              value={values["antiHazing.body"] || ""}
              onChange={(e) => set("antiHazing.body", e.target.value)}
              rows={4}
              placeholder="Phi Sigma Kappa national and the Gamma Triton chapter strictly prohibit hazing in any form…"
            />
          </Field>
        </div>
      </Section>

      {/* ANTI-HAZING + PRIVACY */}
      <Section title="Anti-hazing &amp; privacy" eyebrow="Compliance copy" icon={ShieldCheck}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="National anti-hazing hotline (display)">
            <Input value={values["antiHazing.hotline"] || ""} onChange={(e) => set("antiHazing.hotline", e.target.value)} placeholder="1-888-NOT-HAZE" />
          </Field>
          <Field label="Anti-hazing resource URL">
            <Input value={values["antiHazing.hotlineUrl"] || ""} onChange={(e) => set("antiHazing.hotlineUrl", e.target.value)} placeholder="https://hazingprevention.org/help/" />
          </Field>
          <Field label="Privacy policy &lsquo;Last updated&rsquo;" className="sm:col-span-2">
            <Input value={values["privacy.lastUpdated"] || ""} onChange={(e) => set("privacy.lastUpdated", e.target.value)} placeholder="May 2026" />
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
            <Input value={values["about.caption"] || ""} onChange={(e) => set("about.caption", e.target.value)} placeholder="Chapter formal — FIPG-compliant" />
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

      {/* STATS — value + label + subtitle, all admin-editable */}
      <Section title="Stats strip" eyebrow="4 stat tiles under the hero" icon={Crown}>
        <p className="text-xs text-muted-foreground mb-4">
          Each tile has a number, a label, and an optional small subtitle. Re-purpose any
          slot (e.g. swap &ldquo;150+ years strong&rdquo; for &ldquo;12 events / yr&rdquo;) without a code change.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {([
            { val: "stats.brothers", lab: "stats.brothers.label", sub: "stats.brothers.sub", title: "Slot 1" },
            { val: "stats.gpa", lab: "stats.gpa.label", sub: "stats.gpa.sub", title: "Slot 2" },
            { val: "stats.years", lab: "stats.years.label", sub: "stats.years.sub", title: "Slot 3" },
            { val: "stats.charity", lab: "stats.charity.label", sub: "stats.charity.sub", title: "Slot 4" },
          ]).map((s) => (
            <div key={s.val} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{s.title}</p>
              <Field label="Number / value">
                <Input value={values[s.val] || ""} onChange={(e) => set(s.val, e.target.value)} placeholder="60+" />
              </Field>
              <Field label="Label">
                <Input value={values[s.lab] || ""} onChange={(e) => set(s.lab, e.target.value)} placeholder="Active brothers" />
              </Field>
              <Field label="Subtitle (optional)">
                <Input value={values[s.sub] || ""} onChange={(e) => set(s.sub, e.target.value)} placeholder="Above the all-fraternity average" />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      {/* Section visibility */}
      <Section title="What shows on the homepage" eyebrow="Toggle any section on/off" icon={Sparkles}>
        <p className="text-xs text-muted-foreground mb-4">
          Hide any section if it's not ready or not relevant. Toggle off, click Save, and that section disappears from the homepage. Toggle back on whenever.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { key: "show.statsStrip", label: "Stats strip (60+ brothers / 3.45 GPA / etc.)" },
            { key: "show.highlightsBanner", label: "Highlights banner (icon row under stats)" },
            { key: "show.values", label: "Brotherhood / Scholarship / Character cards" },
            { key: "show.instagramFeed", label: "Instagram feed grid" },
            { key: "show.timeline", label: "How rush works (3-week timeline: Open → Closed → Interviews & Bid Day)" },
            { key: "show.testimonial", label: "Alumni testimonial quote" },
            { key: "show.spotlight", label: "Brother of the Month spotlight" },
            { key: "show.eboard", label: "2026 Executive Board card grid" },
            { key: "show.faq", label: "FAQ accordion" },
            { key: "show.whereWeLive", label: "Where We Live (chapter house section)" },
          ].map((s) => {
            const on = (values[s.key] ?? "true") !== "false";
            return (
              <label
                key={s.key}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-phisig-red/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => set(s.key, e.target.checked ? "true" : "false")}
                  className="mt-0.5 h-4 w-4 rounded border-border text-phisig-red focus:ring-phisig-red shrink-0 cursor-pointer"
                />
                <span className="text-sm">{s.label}</span>
              </label>
            );
          })}
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

/**
 * Generic admin repeater for JSON arrays stored as cfg strings.
 * Renders an expandable list with add/remove/reorder + inline field editing.
 * On any change it re-serializes the array as JSON and bubbles up.
 *
 * `value` is the raw JSON string from cfg. If empty/invalid, starts with [].
 */
type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  textarea?: boolean;
  iconPicker?: boolean;
};

function JsonArrayEditor({
  value,
  onChange,
  fields,
  newRow,
  rowLabel,
}: {
  value: string | undefined;
  onChange: (json: string) => void;
  fields: FieldDef[];
  newRow: Record<string, string>;
  rowLabel: (row: Record<string, string>) => string;
}) {
  const rows = React.useMemo<Record<string, string>[]>(() => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [value]);

  const [openIdx, setOpenIdx] = React.useState<number | null>(0);

  function commit(next: Record<string, string>[]) {
    onChange(JSON.stringify(next));
  }
  function update(i: number, key: string, v: string) {
    const next = rows.map((r, j) => (i === j ? { ...r, [key]: v } : r));
    commit(next);
  }
  function add() {
    const next = [...rows, { ...newRow }];
    commit(next);
    setOpenIdx(next.length - 1);
  }
  function remove(i: number) {
    if (!confirm("Remove this row?")) return;
    const next = rows.filter((_, j) => j !== i);
    commit(next);
    setOpenIdx(null);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
    setOpenIdx(j);
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((row, i) => {
          const open = openIdx === i;
          return (
            <li key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="flex-1 text-left text-sm font-medium hover:text-phisig-red transition-colors truncate"
                >
                  <span className="text-muted-foreground mr-2 text-xs">#{i + 1}</span>
                  {rowLabel(row)}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-secondary disabled:opacity-30"
                    aria-label="Move up"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-secondary disabled:opacity-30"
                    aria-label="Move down"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-red-50 text-red-600"
                    aria-label="Remove"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {open && (
                <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-border bg-secondary/30">
                  {fields.map((f) => (
                    <div key={f.key}>
                      <Label className="mb-1 inline-block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {f.label}
                      </Label>
                      {f.iconPicker ? (
                        <Select
                          value={row[f.key] || ""}
                          onValueChange={(v) => update(i, f.key, v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Pick an icon" /></SelectTrigger>
                          <SelectContent>
                            {ICONS.map((ic) => (
                              <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : f.textarea ? (
                        <Textarea
                          value={row[f.key] || ""}
                          onChange={(e) => update(i, f.key, e.target.value)}
                          rows={3}
                          placeholder={f.placeholder}
                        />
                      ) : (
                        <Input
                          value={row[f.key] || ""}
                          onChange={(e) => update(i, f.key, e.target.value)}
                          placeholder={f.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Add row
      </Button>
    </div>
  );
}

function EboardHeadshotInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { push } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      onChange(json.url);
      push({ title: "Photo uploaded — click Save to apply", variant: "success" });
    } catch (err: any) {
      push({ title: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img
          src={/^https?:\/\//.test(value) ? value : `/api/photo/${value}`}
          alt="Headshot preview"
          className="h-12 w-12 rounded-full object-cover ring-2 ring-phisig-red/20"
        />
      ) : (
        <div className="h-12 w-12 rounded-full bg-secondary border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">
          —
        </div>
      )}
      <div className="flex-1 space-y-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Slug or URL" />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function PhotoPreview({ slug, className, objectPosition }: { slug?: string; className?: string; objectPosition?: string }) {
  if (!slug) return <div className={`aspect-[4/3] rounded-xl bg-secondary border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground ${className ?? ""}`}>No slug yet</div>;
  return (
    <Link
      href={`https://www.instagram.com/p/${slug}/`}
      target="_blank"
      rel="noreferrer noopener"
      className={`block relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-secondary ${className ?? ""}`}
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
