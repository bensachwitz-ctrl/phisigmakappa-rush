import React from "react";
import { DollarSign, CreditCard, Heart, CheckCircle2, AlertCircle } from "lucide-react";
import type { DemoContext } from "../context";

export function renderDuesTab(ctx: DemoContext) {
  const {
    dashboardData,
    handleSimulateStripePay,
    isDemo,
    role,
    selectedBrand,
    showToast,
  } = ctx;
  return (
                      <div className="space-y-4">
                        {role === "brother" ? (
                          <>
                            {/* Dues dashboard */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center space-y-4">
                              <div 
                                className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center border"
                                style={{ backgroundColor: selectedBrand.primaryColor + '12', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                              >
                                <DollarSign className="w-6 h-6" />
                              </div>

                              <div className="space-y-1">
                                <span className="text-[12px] text-slate-500 uppercase tracking-widest font-bold">
                                  {dashboardData?.dues?.config?.label || "Active Chapter Dues"}
                                </span>
                                <h2 className="text-2xl font-black text-slate-900">
                                  ${((dashboardData?.dues?.config?.amountCents || 0) / 100).toLocaleString([], { minimumFractionDigits: 2 })}
                                </h2>
                                <span className="text-[12px] text-slate-400 block">
                                  Period: {dashboardData?.dues?.config?.year || "Active Semester"}
                                </span>
                              </div>

                              <div className="pt-2 flex justify-center">
                                {dashboardData?.dues?.isPaid ? (
                                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dues Reconciled & Settled
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm animate-pulse">
                                    <AlertCircle className="w-4 h-4 text-amber-500" /> Action Required: Unpaid
                                  </div>
                                )}
                              </div>

                              {!dashboardData?.dues?.isPaid && dashboardData?.dues?.config?.enabled && (
                                <button
                                  type="button"
                                  onClick={isDemo ? handleSimulateStripePay : () => showToast("Initiating checkout session via Stripe Connect...", "info")}
                                  className="w-full py-3 text-white rounded-2xl text-xs font-bold shadow-md transition active:scale-[0.98]"
                                  style={{ backgroundColor: selectedBrand.primaryColor }}
                                >
                                  <CreditCard className="w-4 h-4 mr-1 inline" /> Pay Online w/ Stripe
                                </button>
                              )}
                            </div>

                            {/* Dues logs */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                                Financial Statement Ledger
                              </h4>
                              
                              {dashboardData?.dues?.payments?.length > 0 ? (
                                dashboardData.dues.payments.map((p: any) => (
                                  <div key={p.id} className="p-3.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs shadow-sm">
                                    <div>
                                      <p className="font-bold text-slate-900">Dues Assessment: {p.year}</p>
                                      <span className="text-[11px] text-slate-400">
                                        Channel: {p.method} • {new Date(p.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-slate-900">${(p.amountCents / 100).toFixed(2)}</p>
                                      <span className={`text-[11px] font-bold uppercase ${
                                        p.status === "PAID" ? "text-emerald-600" : "text-amber-600"
                                      }`}>
                                        {p.status}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-6 bg-white border border-slate-100 rounded-xl text-center text-xs text-slate-400 shadow-sm">
                                  No transaction logs found.
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Alumni donation panel */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center space-y-4">
                              <div 
                                className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center border"
                                style={{ backgroundColor: selectedBrand.primaryColor + '12', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                              >
                                <Heart className="w-6 h-6 fill-current" />
                              </div>

                              <div className="space-y-1">
                                <span className="text-[12px] text-slate-500 uppercase tracking-widest font-bold">Alumni Giving Portal</span>
                                <h3 className="text-sm font-bold text-slate-900">Support local scholarship funds</h3>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
                                  Contributions settle directly to the local chapter connected Stripe account for housing and recruitment.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => showToast("Initiating donation campaign session...", "info")}
                                className="w-full py-3 text-white rounded-2xl text-xs font-bold shadow-md transition active:scale-[0.98]"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                Secure Donation via Stripe
                              </button>
                            </div>

                            {/* Donation logs */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                                Donation Log Statement
                              </h4>

                              {dashboardData?.dues?.donations?.length > 0 ? (
                                dashboardData.dues.donations.map((d: any) => (
                                  <div key={d.id} className="p-3.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs shadow-sm">
                                    <div>
                                      <p className="font-bold text-slate-900">{d.campaign || "General Fund"}</p>
                                      <span className="text-[11px] text-slate-400">
                                        {new Date(d.recordedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="text-right font-bold text-slate-900">
                                      ${(d.amountCents / 100).toFixed(2)}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-6 bg-white border border-slate-100 rounded-xl text-center text-xs text-slate-400 shadow-sm">
                                  No donation history recorded.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
}
