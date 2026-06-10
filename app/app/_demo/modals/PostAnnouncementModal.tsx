import React from "react";
import { Pin, Check, X } from "lucide-react";
import { BrandGlyphIcon } from "@/components/site/brand-glyph";
import type { DemoContext } from "../context";

export function renderPostAnnModal(ctx: DemoContext) {
  const {
    annBody,
    annPinned,
    annTitle,
    handlePostAnnouncement,
    postAnnSuccess,
    selectedBrand,
    setAnnBody,
    setAnnPinned,
    setAnnTitle,
    setShowPostAnnModal,
  } = ctx;
  return (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/75 text-left backdrop-blur-sm lg:absolute" onClick={() => { setShowPostAnnModal(false); setAnnTitle(""); setAnnBody(""); setAnnPinned(false); }}>
                  <div className="bg-white rounded-t-[32px] border-t border-slate-200 max-h-[85%] overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <BrandGlyphIcon name="announcements" className="w-5 h-5" style={{ color: selectedBrand.primaryColor }} />
                        <h4 className="text-sm font-bold text-slate-955">Publish Announcement</h4>
                      </div>
                      <button
                        onClick={() => { setShowPostAnnModal(false); setAnnTitle(""); setAnnBody(""); setAnnPinned(false); }}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {postAnnSuccess ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                          <Check className="w-6 h-6" />
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">Announcement Published!</h5>
                        <p className="text-xs text-slate-500">The chapter update is now live on all feeds.</p>
                      </div>
                    ) : (
                      <form onSubmit={handlePostAnnouncement} className="space-y-4 pb-6">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Announcement Title</label>
                          <input
                            type="text"
                            required
                            value={annTitle}
                            onChange={(e) => setAnnTitle(e.target.value)}
                            placeholder="e.g. Chapter Meeting Postponed to 8 PM"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Announcement Body</label>
                          <textarea
                            required
                            rows={4}
                            value={annBody}
                            onChange={(e) => setAnnBody(e.target.value)}
                            placeholder="Provide full details for active brothers..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <input
                            type="checkbox"
                            id="annPinned"
                            checked={annPinned}
                            onChange={(e) => setAnnPinned(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <label htmlFor="annPinned" className="text-[12px] text-slate-600 font-bold select-none cursor-pointer">
                            Pin to the top of the feed (Mandatory View)
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-[0.98]"
                          style={{ backgroundColor: selectedBrand.primaryColor }}
                        >
                          Publish to Chapter
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
}
