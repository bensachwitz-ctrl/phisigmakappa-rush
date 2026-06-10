import React from "react";
import { Lock, Check, X } from "lucide-react";
import type { DemoContext } from "../context";

export function renderForgotPasswordModal(ctx: DemoContext) {
  const {
    email,
    forgotEmail,
    forgotLoading,
    forgotSuccess,
    handleMobileForgotSubmit,
    password,
    selectedBrand,
    setForgotEmail,
    setShowForgotPassword,
  } = ctx;
  return (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6" onClick={() => setShowForgotPassword(false)}>
              <div className="bg-white rounded-3xl border border-slate-100 p-5 w-full max-w-xs space-y-4 shadow-2xl animate-scale-in text-left" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4" style={{ color: selectedBrand.primaryColor }} />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Reset Password</h4>
                  </div>
                  <button onClick={() => setShowForgotPassword(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {forgotSuccess ? (
                  <div className="text-center py-6 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm mx-auto animate-bounce">
                      <Check className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs">Reset Link Dispatched!</h5>
                    <p className="text-[10px] text-slate-500">Check your email for instructions to choose a new password.</p>
                  </div>
                ) : (
                  <form onSubmit={handleMobileForgotSubmit} className="space-y-3">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Enter your email address below. We'll send you a link to reset your account password.
                    </p>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="brother@usc.edu"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-[0.98] flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: selectedBrand.primaryColor }}
                    >
                      {forgotLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Send Recovery Link"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
}
