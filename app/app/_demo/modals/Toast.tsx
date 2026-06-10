import React from "react";
import { Check, X, Info } from "lucide-react";
import type { DemoContext } from "../context";

export function renderToast(ctx: DemoContext) {
  const {
    toast,
  } = ctx;
  // Render-gated by the orchestrator (`{toast && renderToast(ctx)}`); this guard
  // only restores the type narrowing the inline conditional provided.
  if (!toast) return null;
  return (
            <div className="absolute top-4 left-4 right-4 z-[100] animate-spring-in pointer-events-none">
              <div className="bg-white/95 backdrop-blur border border-slate-200/80 rounded-2xl shadow-xl p-3 flex items-center gap-3">
                <div 
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: toast.type === "success" ? "#e6f4ea" : toast.type === "error" ? "#fce8e6" : "#e8f0fe",
                    color: toast.type === "success" ? "#137333" : toast.type === "error" ? "#c5221f" : "#1a73e8"
                  }}
                >
                  {toast.type === "success" ? (
                    <Check className="w-4.5 h-4.5" />
                  ) : toast.type === "error" ? (
                    <X className="w-4.5 h-4.5" />
                  ) : (
                    <Info className="w-4.5 h-4.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-900 leading-tight">System Notification</p>
                  <p className="text-[10px] text-slate-500 truncate leading-snug mt-0.5">{toast.message}</p>
                </div>
              </div>
            </div>
          );
}
