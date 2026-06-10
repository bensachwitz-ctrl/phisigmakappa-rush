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
                      <div className="space-y-3">
                        {role === "brother" ? (
                          <>
                            {/* Dues dashboard — compact: amount + status on one row,
                                icon inline rather than a tall stacked hero. */}
                            <div className="gs-glass rounded-2xl p-3.5 space-y-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                                  style={{ backgroundColor: selectedBrand.primaryColor + '12', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                                >
                                  <DollarSign className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold block leading-none">
                                    {dashboardData?.dues?.config?.label || "Active chapter dues"}
                                  </span>
                                  <h2 className="text-[22px] font-black leading-tight text-slate-900">
                                    ${((dashboardData?.dues?.config?.amountCents || 0) / 100).toLocaleString([], { minimumFractionDigits: 2 })}
                                  </h2>
                                  <span className="text-[11px] text-slate-400 block leading-none">
                                    {dashboardData?.dues?.config?.year || "Active semester"}
                                  </span>
                                </div>
                              </div>

                              {dashboardData?.dues?.isPaid ? (
                                <div className="inline-flex w-full items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-[12px] font-bold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dues settled
                                </div>
                              ) : (
                                <div className="inline-flex w-full items-center justify-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-xl text-[12px] font-bold">
                                  <AlertCircle className="w-4 h-4 text-amber-500" /> Action required · Unpaid
                                </div>
                              )}

                              {!dashboardData?.dues?.isPaid && dashboardData?.dues?.config?.enabled && (
                                <button
                                  type="button"
                                  onClick={isDemo ? handleSimulateStripePay : () => showToast("Initiating checkout session via Stripe Connect...", "info")}
                                  className="press flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold text-white shadow-lg transition active:scale-[0.99]"
                                  style={{ backgroundColor: selectedBrand.primaryColor }}
                                >
                                  <CreditCard className="h-4 w-4" /> Pay online with Stripe
                                </button>
                              )}
                            </div>

                            {/* Dues logs */}
                            <div className="space-y-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                                Payment ledger
                              </h4>

                              {dashboardData?.dues?.payments?.length > 0 ? (
                                dashboardData.dues.payments.map((p: any) => (
                                  <div key={p.id} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs shadow-sm">
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
                            {/* Alumni donation panel — compact */}
                            <div className="gs-glass rounded-2xl p-3.5 space-y-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                                  style={{ backgroundColor: selectedBrand.primaryColor + '12', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                                >
                                  <Heart className="w-5 h-5 fill-current" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold block leading-none">Alumni giving</span>
                                  <h3 className="text-[14px] font-bold text-slate-900 leading-tight mt-0.5">Support scholarship funds</h3>
                                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                    Contributions settle directly to the chapter's connected Stripe account.
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => showToast("Initiating donation campaign session...", "info")}
                                className="press flex min-h-[48px] w-full items-center justify-center rounded-xl text-[13px] font-bold text-white shadow-lg transition active:scale-[0.99]"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                Secure donation via Stripe
                              </button>
                            </div>

                            {/* Donation logs */}
                            <div className="space-y-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                                Donation history
                              </h4>

                              {dashboardData?.dues?.donations?.length > 0 ? (
                                dashboardData.dues.donations.map((d: any) => (
                                  <div key={d.id} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs shadow-sm">
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
