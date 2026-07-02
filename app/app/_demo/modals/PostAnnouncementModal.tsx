import React from "react";
import {
  IconCheck,
  IconClose,
  IconPin,
} from "@/components/brand/icons";

import { BrandGlyphIcon } from "@/components/site/brand-glyph";
import type { DemoContext } from "../context";
import { useEscapeClose } from "./useEscapeClose";

export function renderPostAnnModal(ctx: DemoContext) {
  return <PostAnnModal ctx={ctx} />;
}

export function PostAnnModal({ ctx }: { ctx: DemoContext }) {
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
  const closeModal = () => { setShowPostAnnModal(false); setAnnTitle(""); setAnnBody(""); setAnnPinned(false); };
  useEscapeClose(closeModal);
  // <lg: the sheet FILLS the content area (viewport minus the demo header) —
  // no dead shell bands above/below (owner round-8); content scrolls inside.
  // lg+: classic in-phone bottom sheet.
  return (
                <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 flex flex-col justify-end bg-slate-950/75 text-left backdrop-blur-sm lg:absolute lg:inset-0" onClick={closeModal}>
                  <div role="dialog" aria-modal="true" aria-labelledby="post-ann-modal-title" className="bg-white rounded-t-[32px] border-t border-slate-200 grow overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl lg:grow-0 lg:max-h-[85%]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <BrandGlyphIcon name="announcements" className="w-5 h-5" style={{ color: selectedBrand.primaryColor }} />
                        <h4 id="post-ann-modal-title" className="text-sm font-bold text-slate-955">Publish Announcement</h4>
                      </div>
                      <button
                        onClick={closeModal}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                        type="button"
                        aria-label="Close"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>

                    {postAnnSuccess ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                          <IconCheck className="w-6 h-6" />
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
