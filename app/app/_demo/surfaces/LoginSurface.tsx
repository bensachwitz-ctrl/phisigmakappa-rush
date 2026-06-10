import React from "react";
import { ChevronRight, ArrowRight, AlertCircle } from "lucide-react";
import type { DemoContext } from "../context";

export function renderLogin(ctx: DemoContext) {
  const {
    authLoading,
    email,
    error,
    handleSignIn,
    password,
    role,
    selectedBrand,
    selectedTenant,
    setEmail,
    setError,
    setPassword,
    setRole,
    setSelectedTenant,
    setShowForgotPassword,
  } = ctx;
  // Render-gated by the orchestrator (`{selectedTenant && !token && renderLogin(ctx)}`);
  // this guard only restores the type narrowing the inline conditional provided.
  if (!selectedTenant) return null;
  return (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-white">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <button
                  onClick={() => { setSelectedTenant(null); setError(null); }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" /> Back to Chapters
                </button>
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedBrand.primaryColor, boxShadow: `0 0 8px ${selectedBrand.primaryColor}` }}
                />
              </div>

              <div className="text-center mb-6">
                <span 
                  className="text-[10px] font-bold tracking-widest uppercase border px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                >
                  {selectedBrand.letters} USC CHAPTER
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-3 leading-tight">{selectedTenant.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{selectedTenant.school}</p>
              </div>

              {/* Role Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRole("brother")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    role === "brother"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Active Brother
                </button>
                <button
                  type="button"
                  onClick={() => setRole("alumni")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    role === "alumni"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  Alumni Portal
                </button>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === "brother" ? "brother@usc.edu" : "alumnus@alumni.com"}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 transition brand-focus"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 transition brand-focus"
                  />
                  <div className="flex justify-between items-center text-[10px] pt-1.5 px-0.5">
                    <span></span>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-slate-500 hover:text-slate-950 transition font-semibold underline underline-offset-2"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-[11px] text-red-600 leading-normal">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  style={{ backgroundColor: selectedBrand.primaryColor }}
                >
                  {authLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Enter Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          );
}
