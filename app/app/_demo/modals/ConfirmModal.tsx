import React from "react";
import type { DemoContext } from "../context";

export function renderConfirmModal(ctx: DemoContext) {
  const {
    confirmModal,
    selectedBrand,
    setConfirmModal,
  } = ctx;
  // Render-gated by the orchestrator (`{confirmModal && renderConfirmModal(ctx)}`);
  // this guard only restores the type narrowing the inline conditional provided.
  if (!confirmModal) return null;
  return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm lg:absolute" onClick={() => setConfirmModal(null)}>
              <div className="bg-white rounded-3xl border border-slate-100 p-5 w-full max-w-xs space-y-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="text-center space-y-1.5">
                  <h4 className="text-sm font-bold text-slate-950">{confirmModal.title}</h4>
                  <p className="text-xs text-slate-500 leading-normal">{confirmModal.message}</p>
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                    className="flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition"
                    style={{ backgroundColor: selectedBrand.primaryColor }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          );
}
