"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  Sparkles, Shield, Rocket, Check, ArrowRight,
  Laptop, Smartphone, RefreshCw, Download, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FratPreset {
  name: string;
  short: string;
  letters: string;
  primaryColor: string;
  darkColor: string;
  softColor: string;
  principles: string;
  tagline: string;
  greekLetters: string;
}

const FRAT_PRESETS: Record<string, FratPreset> = {
  phisig: {
    name: "Phi Sigma Kappa",
    short: "Phi Sig",
    letters: "ΦΣΚ",
    primaryColor: "#C8102E",
    darkColor: "#A20D26",
    softColor: "#FCEFF1",
    principles: "Brotherhood, Scholarship, Character",
    tagline: "#DamnProud",
    greekLetters: "Gamma Triton",
  },
  sigmachi: {
    name: "Sigma Chi",
    short: "SigChi",
    letters: "ΣΧ",
    primaryColor: "#004B87",
    darkColor: "#002F56",
    softColor: "#E6F0FA",
    principles: "Friendship, Justice, Learning",
    tagline: "#InHocSignoVinces",
    greekLetters: "Eta Lambda",
  },
  pike: {
    name: "Pi Kappa Alpha",
    short: "Pike",
    letters: "ΠΚΑ",
    primaryColor: "#83001C",
    darkColor: "#5C0014",
    softColor: "#F9F5EB",
    principles: "Scholars, Leaders, Athletes, Gentlemen",
    tagline: "#OnceAPike",
    greekLetters: "Alpha Mu",
  },
  beta: {
    name: "Beta Theta Pi",
    short: "Beta",
    letters: "ΒΘΠ",
    primaryColor: "#1E3A8A",
    darkColor: "#172554",
    softColor: "#EFF6FF",
    principles: "Mutual Assistance, Intellectual Growth, Trust",
    tagline: "#Kai",
    greekLetters: "Beta Delta",
  },
};

const SCHOOLS = [
  { name: "University of South Carolina", short: "USC" },
  { name: "Clemson University", short: "Clemson" },
  { name: "University of Georgia", short: "UGA" },
  { name: "University of North Carolina", short: "UNC" },
  { name: "University of Texas", short: "UT" },
];

export function SaasSimulator() {
  const { push } = useToast();
  const [selectedFrat, setSelectedFrat] = useState("phisig");
  const [selectedSchool, setSelectedSchool] = useState(0);
  
  // Custom states
  const [fratName, setFratName] = useState("");
  const [fratLetters, setFratLetters] = useState("");
  const [greekLetters, setGreekLetters] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [darkColor, setDarkColor] = useState("");
  const [softColor, setSoftColor] = useState("");
  const [tagline, setTagline] = useState("");

  const [device, setDevice] = useState<"desktop" | "mobile" | "3d">("desktop");
  const [generating, setGenerating] = useState(false);

  // Sync states on preset change
  useEffect(() => {
    const preset = FRAT_PRESETS[selectedFrat];
    if (preset) {
      setFratName(preset.name);
      setFratLetters(preset.letters);
      setGreekLetters(preset.greekLetters);
      setPrimaryColor(preset.primaryColor);
      setDarkColor(preset.darkColor);
      setSoftColor(preset.softColor);
      setTagline(preset.tagline);
    }
  }, [selectedFrat]);

  const activeSchool = SCHOOLS[selectedSchool];
  const activePreset = FRAT_PRESETS[selectedFrat];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      push({
        title: "Bundle Created!",
        description: `Visual assets and configuration file generated for ${fratName} at ${activeSchool.short}.`,
        variant: "success",
      });
    }, 1800);
  };

  return (
    <section className="bg-cream-50/50 py-16 sm:py-24 border-t border-b border-maroon-100 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-maroon-100/20 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-100/20 rounded-full filter blur-3xl pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4">
        {/* Title block */}
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-maroon-700 bg-maroon-100 px-3 py-1 rounded-full">
            <Sparkles className="h-3 w-3" /> White-Label SaaS Engine
          </span>
          <h2 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-maroon-900 leading-tight">
            Tailor This Site to Any Chapter Instantly
          </h2>
          <p className="mt-3 text-base sm:text-lg text-maroon-700">
            See how the portal morphs its color schemes, taglines, layouts, and branding in real-time. Drag, click, and customize to simulate how this looks for your school.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 items-start">
          {/* Controls Console */}
          <Card className="border border-maroon-100 bg-white/80 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-maroon-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-maroon-700" /> Layout Customizer
              </h3>
              <p className="text-xs text-maroon-600 mt-1">Select presets or manually tweak theme attributes below.</p>
            </div>

            <div className="space-y-4">
              {/* Preset selector */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-maroon-800">1. Select Fraternity Preset</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(FRAT_PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedFrat(key)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all active:scale-[0.98]",
                        selectedFrat === key
                          ? "border-maroon-700 bg-maroon-50 shadow-sm"
                          : "border-maroon-100 bg-white/40 hover:border-maroon-300"
                      )}
                    >
                      <span className="block text-sm font-bold text-maroon-900">{p.short}</span>
                      <span className="block text-xs text-maroon-600 mt-0.5" style={{ color: p.primaryColor }}>{p.letters}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* School selector */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-maroon-800">2. Select University</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-2">
                  {SCHOOLS.map((s, i) => (
                    <button
                      key={s.short}
                      onClick={() => setSelectedSchool(i)}
                      className={cn(
                        "py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all truncate",
                        selectedSchool === i
                          ? "border-maroon-700 bg-maroon-50 text-maroon-900"
                          : "border-maroon-100 bg-white/40 text-maroon-700 hover:border-maroon-300"
                      )}
                    >
                      {s.short}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-maroon-100 my-4" />

              {/* Advanced Customizations */}
              <div className="space-y-3.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-maroon-800">3. Fine-Tune Typography &amp; Copy</Label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="custom-name" className="text-[11px] text-maroon-600">Frat Name</Label>
                    <Input id="custom-name" value={fratName} onChange={(e) => setFratName(e.target.value)} className="text-xs mt-1 bg-white border-maroon-100" />
                  </div>
                  <div>
                    <Label htmlFor="custom-letters" className="text-[11px] text-maroon-600">Greek Letters</Label>
                    <Input id="custom-letters" value={fratLetters} onChange={(e) => setFratLetters(e.target.value)} className="text-xs mt-1 bg-white border-maroon-100" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="custom-tagline" className="text-[11px] text-maroon-600">Tagline / Motto</Label>
                  <Input id="custom-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className="text-xs mt-1 bg-white border-maroon-100" />
                </div>
              </div>

              {/* Color Tweak */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-maroon-800">4. Adjust Brand Colors</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-maroon-600 block mb-1">Primary Color</Label>
                    <div className="flex gap-1.5 items-center">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-7 h-7 rounded border border-maroon-200 cursor-pointer" aria-label="Primary Color" />
                      <span className="text-[10px] font-mono text-maroon-700 uppercase">{primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-maroon-600 block mb-1">Dark Accent</Label>
                    <div className="flex gap-1.5 items-center">
                      <input type="color" value={darkColor} onChange={(e) => setDarkColor(e.target.value)} className="w-7 h-7 rounded border border-maroon-200 cursor-pointer" aria-label="Dark Accent" />
                      <span className="text-[10px] font-mono text-maroon-700 uppercase">{darkColor}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-maroon-600 block mb-1">Soft Tint</Label>
                    <div className="flex gap-1.5 items-center">
                      <input type="color" value={softColor} onChange={(e) => setSoftColor(e.target.value)} className="w-7 h-7 rounded border border-maroon-200 cursor-pointer" aria-label="Soft Tint" />
                      <span className="text-[10px] font-mono text-maroon-700 uppercase">{softColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-maroon-800 hover:bg-maroon-900 text-white flex items-center justify-center gap-2 mt-4 py-2.5 rounded-xl shadow-md font-semibold transition active:scale-[0.99]"
            >
              {generating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Packaging System...</>
              ) : (
                <><Download className="w-4 h-4" /> Export Configuration Zip</>
              )}
            </Button>
          </Card>

          {/* Interactive Live Device Mockup */}
          <div className="flex flex-col items-center">
            {/* View selectors */}
            <div className="flex gap-1 bg-maroon-100/50 p-1 rounded-xl mb-3 shadow-sm">
              <button
                onClick={() => setDevice("desktop")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  device === "desktop" ? "bg-white text-maroon-900 shadow-xs" : "text-maroon-600 hover:text-maroon-900"
                )}
              >
                <Laptop className="w-3.5 h-3.5" /> Desktop Preview
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  device === "mobile" ? "bg-white text-maroon-900 shadow-xs" : "text-maroon-600 hover:text-maroon-900"
                )}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile Preview
              </button>
              <button
                onClick={() => setDevice("3d")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  device === "3d" ? "bg-white text-maroon-900 shadow-xs" : "text-maroon-600 hover:text-maroon-900"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> 3D App Render
              </button>
            </div>

            {/* Mockup Frame */}
            <div
              className={cn(
                "border border-maroon-100 bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-500",
                device === "desktop" && "w-full max-w-[640px] aspect-[16/10.5]",
                device === "mobile" && "w-[280px] h-[480px]",
                device === "3d" && "w-full max-w-[500px] aspect-[1/1] bg-gradient-to-tr from-maroon-950 via-maroon-900 to-amber-950 p-6 flex flex-col items-center justify-center relative group"
              )}
            >
              {device === "3d" ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 overflow-hidden">
                  {/* Decorative glowing backdrops */}
                  <div className="absolute inset-0 bg-radial-gradient from-amber-500/20 via-transparent to-transparent opacity-60 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-maroon-500/30 rounded-full filter blur-3xl opacity-50 animate-pulse pointer-events-none" />
                  
                  {/* Floating symbols backdrop in 3D frame */}
                  <div className="absolute inset-0 overflow-hidden opacity-20 flex flex-wrap gap-12 items-center justify-center pointer-events-none select-none">
                    <span className="text-4xl font-serif font-black animate-float" style={{ animationDelay: "0s", color: primaryColor }}>{fratLetters[0] || "Φ"}</span>
                    <span className="text-5xl font-serif font-black animate-float" style={{ animationDelay: "1s", color: primaryColor }}>{fratLetters[1] || "Σ"}</span>
                    <span className="text-4xl font-serif font-black animate-float" style={{ animationDelay: "2s", color: primaryColor }}>{fratLetters[2] || "Κ"}</span>
                  </div>

                  {/* 3D Glassmorphic Device Mockup Image Container */}
                  <div className="relative z-10 w-full max-w-[340px] aspect-[16/10] sm:aspect-[4/3] flex items-center justify-center group-hover:scale-105 transition-transform duration-500 ease-out">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl shadow-black/50" />
                    
                    {/* The 3D Mockup Image with smooth hover floating effect */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/3d-mockup.png"
                      alt="Greekstack 3D Dashboard Mockup"
                      className="w-[90%] h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] animate-float"
                      style={{ animationDuration: "6s" }}
                    />
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 text-center z-10 bg-black/40 backdrop-blur-md px-4 py-3 rounded-xl border border-white/5">
                    <p className="text-xs font-bold text-white tracking-wider uppercase flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                      Dynamic 3D Portal View
                    </p>
                    <p className="text-[10px] text-zinc-300 mt-1">
                      Interactive portal dashboard with real-time analytics, secure logins, and custom {fratLetters} branding.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Browser/Phone Header */}
                  <div className="bg-maroon-100/30 border-b border-maroon-100 px-4 py-2 flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <div className="ml-4 flex-1 bg-white border border-maroon-100/60 rounded-md text-[10px] text-maroon-700 px-2 py-0.5 truncate select-none">
                      {fratLetters.toLowerCase().replace(/\s+/g, "")}.{activeSchool.short.toLowerCase()}.greekstack.com
                    </div>
                  </div>

                  {/* Dynamic Live Mockup Canvas */}
                  <div
                    className="w-full h-full p-4 overflow-y-auto relative select-none flex flex-col justify-between"
                    style={{ backgroundColor: softColor, color: "#1e1b4b" }}
                  >
                    {/* Embedded FloatingSymbols simulation inside mockup */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.06] flex flex-wrap gap-6 items-center justify-center">
                      {[...Array(6)].map((_, i) => (
                        <span key={i} className="text-xl font-bold select-none" style={{ color: primaryColor }}>
                          {i % 2 === 0 ? fratLetters[0] || "Φ" : fratLetters[1] || "Σ"}
                        </span>
                      ))}
                    </div>

                    <div className="relative z-10 space-y-4">
                      {/* Mock Nav */}
                      <div className="flex justify-between items-center border-b border-black/5 pb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-xs" style={{ backgroundColor: primaryColor }}>
                            {fratLetters[0] || "F"}
                          </div>
                          <span className="text-[10px] font-bold text-maroon-900">{fratLetters}</span>
                          <span className="text-[9px] text-maroon-600 font-normal">{activeSchool.short}</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-6 h-3 bg-black/5 rounded-sm" />
                          <div className="w-8 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-semibold text-white shadow-xs" style={{ backgroundColor: primaryColor }}>
                            Portal
                          </div>
                        </div>
                      </div>

                      {/* Mock Hero */}
                      <div className="space-y-2 mt-2">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-medium" style={{ color: primaryColor, borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}08` }}>
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                          {activeSchool.short} · Fall Rush 2026
                        </div>
                        <h4 className="text-sm sm:text-base font-extrabold leading-tight tracking-tight">
                          Rush {fratName} <span style={{ color: primaryColor }}>{tagline}</span>.
                        </h4>
                        <p className="text-[9px] text-maroon-700 leading-normal max-w-xs">
                          Drop your number and the {greekLetters} chapter will text you the recruitment schedule the moment events are approved.
                        </p>

                        <div className="flex gap-1.5 pt-1">
                          <div className="h-6 px-3 rounded-md flex items-center justify-center text-[9px] font-bold text-white shadow-xs" style={{ backgroundColor: primaryColor }}>
                            Register for Rush
                          </div>
                          <div className="h-6 px-3 rounded-md border border-black/10 flex items-center justify-center text-[9px] font-semibold text-maroon-800">
                            About Chapter
                          </div>
                        </div>
                      </div>

                      {/* Mock Value Cards */}
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {activePreset.principles.split(",").slice(0, 3).map((p, idx) => (
                          <div key={p} className="p-2 rounded-lg border border-black/5 bg-white/80 shadow-xs flex flex-col justify-between">
                            <div className="w-4 h-4 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                              <Shield className="w-2.5 h-2.5" />
                            </div>
                            <div>
                              <div className="text-[8px] font-bold text-maroon-900 mt-2 truncate">{p.trim()}</div>
                              <div className="text-[7px] text-maroon-600 line-clamp-2 mt-0.5 leading-tight">Lifelong bonds built on values.</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mock Footer */}
                    <div className="border-t border-black/5 pt-2 flex justify-between items-center text-[7px] text-maroon-600">
                      <span>© 2026 {fratName} {greekLetters}</span>
                      <span>Powered by Greekstack</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
