"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  ArrowUp, ArrowDown, Eye, EyeOff, Save, RefreshCw, Flame, Trophy, Heart, 
  GraduationCap, UserPlus, Instagram, CalendarDays, CalendarRange, Quote, 
  Users, Crown, HelpCircle, MapPin, Rocket, ShieldCheck, ChevronUp, ChevronDown 
} from "lucide-react";

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

const DEFAULT_ORDER = [
  "hero", "stats", "highlights", "values", "register",
  "instagram", "timeline", "schedule", "testimonial",
  "spotlight", "eboard", "about", "faq", "where", "cta"
];

export function WebsiteBuilderClient({
  initialConfig
}: {
  initialConfig: Record<string, string>;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = React.useState(false);
  
  // Parse order
  const getOrderedSections = React.useCallback((): SectionConfig[] => {
    let orderList = [...DEFAULT_ORDER];
    const rawOrder = initialConfig["website.sections"];
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
        visible = initialConfig[showKey] !== "false"; // default true
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
  }, [initialConfig]);

  const [sections, setSections] = React.useState<SectionConfig[]>([]);

  React.useEffect(() => {
    setSections(getOrderedSections());
  }, [getOrderedSections]);

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
      description: "Review the order, then Save Layout Changes to publish it.",
      variant: "default",
    });
  };

  const resetToDefaults = () => setResetConfirmOpen(true);

  const handleSave = async () => {
    setBusy(true);
    try {
      const updates: Record<string, string> = {
        "website.sections": JSON.stringify(sections.map(s => s.id)),
      };
      sections.forEach(s => {
        if (s.showKey) {
          updates[s.showKey] = s.visible ? "true" : "false";
        }
      });
      
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Save failed");
      
      push({
        title: "Layout configuration saved",
        description: "Your chapter landing page has been updated with the new section order immediately.",
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

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Layout Hierarchy</h2>
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
              <Card key={sect.id} className={`transition-all duration-200 border-l-4 ${
                sect.visible ? "border-l-phisig-red border-border" : "border-l-slate-300 border-border opacity-65 bg-slate-50/50"
              }`}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
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

      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-white to-phisig-mist border-phisig-red/10 shadow-md">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-base">Actions</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rearranging layouts here immediately updates the main landing page structure. Changes are white-labeled and cached safely per subdomain.
            </p>
            
            <Button onClick={handleSave} disabled={busy} className="w-full bg-phisig-red hover:bg-phisig-red-dark text-white font-medium shadow-sm">
              {busy ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Layout Changes</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-sm">Builder Guides</h3>
            <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4 leading-relaxed">
              <li>Use the <strong>Up/Down arrows</strong> to change the render priority. Sections closer to the top load first (LCP).</li>
              <li>Sections like <strong>Hero</strong> and <strong>Registration Form</strong> cannot be hidden to ensure the site is functional for prospective members.</li>
              <li>Toggle visibility checkboxes off to hide sections like <strong>Spotlight</strong> or <strong>Instagram</strong> if they aren't fully configured yet.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Reset-to-defaults confirm (replaces window.confirm) */}
      <Dialog open={resetConfirmOpen} onOpenChange={(o) => !busy && setResetConfirmOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset layout to defaults?</DialogTitle>
            <DialogDescription>
              This restores the original section order and makes every section
              visible. Nothing is published until you Save Layout Changes, so you
              can still cancel after reviewing.
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
    </div>
  );
}
