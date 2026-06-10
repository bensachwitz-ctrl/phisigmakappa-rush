import React from "react";
import { Check, X } from "lucide-react";
import type { DemoContext } from "../context";

export function renderPricingModal(ctx: DemoContext) {
  const {
    setShowPricingModal,
  } = ctx;
  return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPricingModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-[32px] p-6 w-full max-w-2xl space-y-6 shadow-2xl relative animate-scale-in text-left text-slate-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPricingModal(false)} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-white/5 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-1.5 border-b border-white/10 pb-3">
              <div className="inline-flex items-center gap-1.5 text-blue-400 text-[12px] font-bold uppercase tracking-wider">
                <img src="/brand/greekstack-mark.png?v=2" className="w-3.5 h-3.5 object-contain" alt="" /> Launch Greekstack App
              </div>
              <h3 className="text-xl font-bold text-white leading-tight">Choose Your Chapter Plan</h3>
              <p className="text-xs text-slate-400">Unleash the full white-label platform for your chapter. Cancel anytime.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02] flex flex-col space-y-4 hover:border-white/20 transition">
                <div className="space-y-1">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Platform Monthly</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">$50</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <p className="text-[12px] text-amber-400 font-semibold">+ $200 each rush cycle</p>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 flex-1">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> First month 100% free</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Unlimited members & officers</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Isolated database schema</li>
                </ul>
                <button
                  onClick={() => window.location.href = "/onboard"}
                  className="w-full py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition"
                >
                  Start Free Month
                </button>
              </div>

              {/* Yearly Plan (Featured) */}
              <div className="border border-sky-500/30 rounded-2xl p-5 bg-sky-500/[0.03] flex flex-col space-y-4 hover:border-sky-500/40 transition relative overflow-hidden">
                <div className="absolute right-0 top-0 bg-sky-500 text-slate-950 font-black text-[11px] uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
                  Best Value
                </div>
                <div className="space-y-1">
                  <span className="text-[12px] font-bold text-sky-400 uppercase tracking-wider">Platform Yearly</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">$800</span>
                    <span className="text-xs text-slate-400">/ year</span>
                  </div>
                  <p className="text-[12px] text-emerald-400 font-semibold">All rush fees included</p>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 flex-1">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-sky-400" /> Save $100+ annually</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-sky-400" /> No per-cycle rush fees</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-sky-400" /> Premium priority support</li>
                </ul>
                <button
                  onClick={() => window.location.href = "/onboard"}
                  className="w-full py-2 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-blue-400 to-sky-400 hover:opacity-95 shadow-md transition"
                >
                  Deploy Yearly
                </button>
              </div>
            </div>

            <p className="text-[12px] text-slate-500 text-center leading-relaxed pt-2 border-t border-white/10">
              * Dues are processed securely via Stripe. Stripe standard card transaction rates (2.9% + 30¢) apply with no platform markup.
            </p>
          </div>
        </div>
      );
}
