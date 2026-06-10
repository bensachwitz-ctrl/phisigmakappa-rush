import React from "react";
import { Search, ChevronRight, AlertCircle } from "lucide-react";
import { FRATERNITY_BRANDS } from "../mock-data";
import type { DemoContext } from "../context";

export function renderChapterPicker(ctx: DemoContext) {
  const {
    filteredChapters,
    handleSelectTenant,
    searchQuery,
    setSearchQuery,
  } = ctx;
  return (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
              <div className="text-center my-6">
                <div className="inline-flex mb-4">
                  <img src="/brand/greekstack-mark.png?v=2" className="w-16 h-16 rounded-2xl object-contain shadow-md" alt="Greekstack Logo" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Greekstack App</h1>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Access your chapter roster, submit dues securely, and view career networking opportunities. Select your chapter to start.
                </p>
              </div>

              {/* Search */}
              <div className="relative mb-4 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chapter or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm placeholder:text-slate-400 text-slate-900 transition brand-focus"
                />
              </div>

              {/* Active list */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] pr-1">
                {filteredChapters.length > 0 ? (
                  filteredChapters.map((t) => {
                    const br = FRATERNITY_BRANDS.find(b => b.id === t.brandId) || FRATERNITY_BRANDS[0];
                    const isDemoItem = t.id.startsWith("demo-");
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTenant(t)}
                        className="w-full text-left p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 flex items-center justify-between group transition shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-sm shrink-0"
                            style={{ backgroundColor: br.primaryColor + '10', borderColor: br.primaryColor + '20', color: br.primaryColor }}
                          >
                            {br.letters}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                                {t.name}
                              </h4>
                              {isDemoItem && (
                                <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">Demo</span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{t.school || "Greekstack Chapter"}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transform group-hover:translate-x-0.5 transition" />
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No active chapters found.</p>
                  </div>
                )}
              </div>
            </div>
          );
}
