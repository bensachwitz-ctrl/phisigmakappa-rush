import React from "react";
import {
  IconArrowLeft,
  IconBallot,
  IconCheck,
  IconCheckCircle,
  IconCrown,
  IconGift,
  IconHeart,
  IconInfo,
  IconPieChart,
  IconQrCode,
  IconShieldCheck,
  IconWallet,
  IconWhiteLabel,
} from "@/components/brand/icons";

import { FRATERNITY_BRANDS } from "../mock-data";
import type { DemoContext } from "../context";

export function renderSpotlight(ctx: DemoContext) {
  const {
    castBallot,
    dashboardData,
    donationCents,
    donationDone,
    handleDonate,
    handleQrCheckIn,
    handleSelectTenant,
    isDemo,
    myBallot,
    qrCheckedIn,
    qrMajor,
    qrName,
    qrYear,
    selectedBrand,
    selectedTenant,
    setDonationCents,
    setQrMajor,
    setQrName,
    setQrYear,
    setSpotlight,
    showToast,
    spotlight,
    tenants,
  } = ctx;
  return (
                <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-[80] flex flex-col animate-spotlight-in bg-slate-50 lg:absolute lg:inset-0">
                  {/* Spotlight header */}
                  <div className="shrink-0 px-4 pt-3 pb-2.5 bg-white border-b border-slate-100 flex items-center gap-2.5">
                    <button
                      onClick={() => setSpotlight(null)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition shrink-0"
                      aria-label="Back"
                    >
                      <IconArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {spotlight === "elections" && "Officer Elections"}
                        {spotlight === "treasury" && "Treasury & Budgets"}
                        {spotlight === "qr" && "Rush QR Check-in"}
                        {spotlight === "giving" && "Alumni Giving"}
                        {spotlight === "theme" && "White-label Branding"}
                      </h3>
                      {/* "Live interactive demo" is a SALES label — only the demo
                          showcase may show it. A real signed-in member never sees
                          it (the surfaces below are either wired to real data or
                          gated to the demo). */}
                      {isDemo && (
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Live interactive demo</p>
                      )}
                    </div>
                  </div>

                  {/* "What this does" callout — sales/marketing copy (some of it
                      describes capabilities not exercised on this exact screen),
                      so it is DEMO-ONLY. Real members get the working surface with
                      no marketing chrome. */}
                  {isDemo && (
                  <div className="shrink-0 mx-3 mt-2.5 mb-1 rounded-xl px-3 py-2 text-[12px] leading-relaxed border"
                    style={{ backgroundColor: selectedBrand.primaryColor + '0a', borderColor: selectedBrand.primaryColor + '22', color: '#334155' }}>
                    <span className="font-bold" style={{ color: selectedBrand.primaryColor }}>What this does · </span>
                    {spotlight === "elections" && "Run secret-ballot officer elections in-app. Every active gets one anonymous vote per seat; the platform tallies live and auto-seats the winners when voting closes."}
                    {spotlight === "treasury" && "Your treasurer's back office: chapter balance, dues collected vs. outstanding, a line-item budget that tracks spend in real time, and a reconciled ledger."}
                    {spotlight === "qr" && "Generate a QR for any rush event. A PNM scans it and either checks in or fills a quick form, and they drop straight into your recruitment pipeline. Try it below."}
                    {spotlight === "giving" && "Turn graduated brothers into a recurring base. Run branded campaigns with a live goal meter; donations clear through Stripe straight to your chapter."}
                    {spotlight === "theme" && "Your letters, colors, and crest: the entire platform re-skins to your chapter in seconds. Tap a brand to watch every surface change live."}
                  </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-3 pb-4 pt-1.5 space-y-3 text-left">
                    {/* ── ELECTIONS ─────────────────────────────────────────── */}
                    {spotlight === "elections" && dashboardData?.election && (
                      <>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{dashboardData.election.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Voting open</span>
                              · closes in 3 days
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-slate-900">{dashboardData.election.ballotsCast}/{dashboardData.election.totalEligible}</span>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Ballots cast</p>
                          </div>
                        </div>

                        {dashboardData.election.seats.map((seat: any) => {
                          const voted = !!myBallot[seat.id];
                          const total = seat.candidates.reduce((s: number, c: any) => s + c.votes, 0) || 1;
                          return (
                            <div key={seat.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <IconCrown className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> {seat.title}
                                </h5>
                                {voted && <span className="text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><IconCheck className="w-2.5 h-2.5" /> Voted</span>}
                              </div>
                              {seat.candidates.map((c: any) => {
                                const pct = Math.round((c.votes / total) * 100);
                                const mine = myBallot[seat.id] === c.id;
                                return (
                                  <button
                                    key={c.id}
                                    disabled={voted}
                                    onClick={() => castBallot(seat.id, c.id)}
                                    className={`w-full text-left rounded-xl border p-2.5 transition relative overflow-hidden ${
                                      mine ? "border-2" : "border-slate-100 hover:border-slate-200"
                                    } ${voted ? "cursor-default" : "active:scale-[0.99]"}`}
                                    style={mine ? { borderColor: selectedBrand.primaryColor } : {}}
                                  >
                                    {voted && (
                                      <span className="absolute inset-y-0 left-0 opacity-[0.08]" style={{ width: `${pct}%`, backgroundColor: selectedBrand.primaryColor }} />
                                    )}
                                    <div className="relative flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-900">{c.name} <span className="text-[11px] font-medium text-slate-400">· {c.year}</span></p>
                                        <p className="text-[11px] text-slate-500 truncate">{c.blurb}</p>
                                      </div>
                                      {voted ? (
                                        <span className="text-[11px] font-black text-slate-900 shrink-0">{pct}%</span>
                                      ) : (
                                        <span className="text-[11px] font-bold uppercase shrink-0" style={{ color: selectedBrand.primaryColor }}>Vote</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                              {!voted && <p className="text-[11px] text-slate-400 text-center pt-0.5">Your ballot is anonymous. Tap a candidate to cast it.</p>}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* ELECTIONS — explicit empty state. When there is no open
                        election the surface shows an honest "nothing to vote on"
                        message instead of a blank, data-less body. */}
                    {spotlight === "elections" && !dashboardData?.election && (
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                          <IconBallot className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">No open elections</h4>
                        <p className="text-[12px] text-slate-500 leading-relaxed max-w-[16rem]">
                          There are no elections open for voting right now. When your chapter opens officer voting, the ballot will appear here.
                        </p>
                      </div>
                    )}

                    {/* ── TREASURY ──────────────────────────────────────────── */}
                    {spotlight === "treasury" && dashboardData?.treasury && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Balance", cents: dashboardData.treasury.balanceCents, color: "text-slate-900" },
                            { label: "Collected", cents: dashboardData.treasury.duesCollectedCents, color: "text-emerald-600" },
                            { label: "Outstanding", cents: dashboardData.treasury.duesOutstandingCents, color: "text-amber-600" },
                          ].map((s) => (
                            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-2.5 text-center">
                              <p className={`text-[13px] font-black ${s.color}`}>${(s.cents / 100).toLocaleString()}</p>
                              <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3.5 space-y-2.5">
                          <h5 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <IconPieChart className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> Semester budget
                          </h5>
                          {dashboardData.treasury.budget.map((b: any) => {
                            const pct = Math.min(100, Math.round((b.spentCents / b.plannedCents) * 100));
                            const over = b.spentCents > b.plannedCents;
                            return (
                              <div key={b.id} className="space-y-1">
                                <div className="flex items-center justify-between text-[12px]">
                                  <span className="font-semibold text-slate-700">{b.category}</span>
                                  <span className="text-slate-500">${(b.spentCents / 100).toLocaleString()} <span className="text-slate-300">/ ${(b.plannedCents / 100).toLocaleString()}</span></span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: over ? "#dc2626" : selectedBrand.primaryColor }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3.5 space-y-2">
                          <h5 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <IconWallet className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> Recent ledger
                          </h5>
                          {dashboardData.treasury.ledger.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-slate-800 truncate">{t.label}</p>
                                <p className="text-[11px] text-slate-400">{new Date(t.date).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
                              </div>
                              <span className={`text-[11px] font-bold shrink-0 ${t.kind === "in" ? "text-emerald-600" : "text-slate-700"}`}>
                                {t.kind === "in" ? "+" : "−"}${Math.abs(t.amountCents / 100).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* ── QR RUSH CHECK-IN ──────────────────────────────────── */}
                    {/* DEMO-ONLY: the QR check-in writes to the demo's local
                        pipeline (no real recruitment endpoint ships yet), so the
                        whole surface is gated to the demo — a real member never
                        reaches a control that wouldn't persist. */}
                    {spotlight === "qr" && isDemo && (
                      <>
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-col items-center text-center gap-2">
                          <div className="p-3 rounded-2xl border-2 border-dashed" style={{ borderColor: selectedBrand.primaryColor + '40' }}>
                            <IconQrCode className="w-20 h-20" style={{ color: selectedBrand.primaryColor }} strokeWidth={1.25} />
                          </div>
                          <p className="text-[12px] text-slate-500 leading-relaxed">PNMs scan this at <span className="font-bold text-slate-700">Fall Info Session</span> to check in. New faces fill the form below.</p>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3.5 space-y-2.5">
                          <h5 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">New PNM check-in</h5>
                          <input value={qrName} onChange={(e) => setQrName(e.target.value)} placeholder="Full name"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300" />
                          <input value={qrMajor} onChange={(e) => setQrMajor(e.target.value)} placeholder="Major"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300" />
                          <select value={qrYear} onChange={(e) => setQrYear(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300">
                            {["Freshman", "Sophomore", "Junior", "Senior", "Transfer"].map((y) => <option key={y}>{y}</option>)}
                          </select>
                          <button
                            onClick={handleQrCheckIn}
                            disabled={!qrName.trim()}
                            className="w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-1.5"
                            style={{ backgroundColor: selectedBrand.primaryColor }}
                          >
                            <IconCheckCircle className="w-4 h-4" /> Check in to pipeline
                          </button>
                        </div>

                        {qrCheckedIn.length > 0 && (
                          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3.5 space-y-1.5">
                            <h5 className="text-[12px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5"><IconCheck className="w-3.5 h-3.5" /> Just checked in ({qrCheckedIn.length})</h5>
                            {qrCheckedIn.map((n, i) => (
                              <p key={i} className="text-[11px] text-slate-700 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {n} <span className="text-[11px] text-slate-400">→ added to rush board</span></p>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* ── ALUMNI GIVING ─────────────────────────────────────── */}
                    {/* DEMO-ONLY: the giving campaign meter + in-spotlight donate
                        is a sales showcase (the real alumni-donation Stripe flow
                        lives elsewhere); gated to the demo so a real member never
                        sees a campaign-donate control wired only to local state. */}
                    {spotlight === "giving" && isDemo && dashboardData?.giving && (() => {
                      const g = dashboardData.giving;
                      const pct = Math.min(100, Math.round((g.raisedCents / g.goalCents) * 100));
                      return (
                        <>
                          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <IconHeart className="w-4 h-4" style={{ color: selectedBrand.primaryColor }} />
                              <h4 className="text-xs font-bold text-slate-900">{g.campaign}</h4>
                            </div>
                            <div>
                              <div className="flex items-end justify-between mb-1">
                                <span className="text-lg font-black text-slate-900">${(g.raisedCents / 100).toLocaleString()}</span>
                                <span className="text-[12px] text-slate-500">of ${(g.goalCents / 100).toLocaleString()} · {pct}%</span>
                              </div>
                              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: selectedBrand.primaryColor }} />
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1.5">{g.donorCount} donors</p>
                            </div>
                          </div>

                          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3.5 space-y-2.5">
                            <h5 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Give now</h5>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[2500, 5000, 10000, 25000].map((amt) => (
                                <button key={amt} onClick={() => setDonationCents(amt)}
                                  className={`py-2 rounded-lg text-[11px] font-bold border transition ${donationCents === amt ? "text-white" : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"}`}
                                  style={donationCents === amt ? { backgroundColor: selectedBrand.primaryColor, borderColor: selectedBrand.primaryColor } : {}}>
                                  ${amt / 100}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={handleDonate}
                              className="w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-[0.98] flex items-center justify-center gap-1.5"
                              style={{ backgroundColor: donationDone ? "#059669" : selectedBrand.primaryColor }}
                            >
                              {donationDone ? <><IconCheck className="w-4 h-4" /> Thank you!</> : <><IconGift className="w-4 h-4" /> Donate ${(donationCents / 100).toFixed(0)} via Stripe</>}
                            </button>
                          </div>

                          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3.5 space-y-1.5">
                            <h5 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Recent gifts</h5>
                            {g.recent.map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                                <span className="text-[11px] text-slate-700">{d.name}</span>
                                <span className="text-[11px] font-bold text-emerald-600">+${(d.amountCents / 100).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}

                    {/* ── WHITE-LABEL BRANDING ──────────────────────────────── */}
                    {spotlight === "theme" && (
                      <>
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 text-center space-y-3">
                          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg transition-colors duration-300"
                            style={{ backgroundColor: selectedBrand.primaryColor }}>
                            {selectedBrand.letters}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{selectedBrand.name}</h4>
                            <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">{selectedTenant?.subdomain || "yourchapter"}.greekstack.app</p>
                          </div>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="w-5 h-5 rounded-full border border-slate-200" style={{ backgroundColor: selectedBrand.primaryColor }} />
                            <span className="text-[11px] font-mono text-slate-500">{selectedBrand.primaryColor}</span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3.5 space-y-2.5">
                          <h5 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <IconWhiteLabel className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> Switch chapter brand and watch it re-skin
                          </h5>
                          <div className="grid grid-cols-2 gap-2">
                            {tenants.slice(0, 6).map((t) => {
                              const b = FRATERNITY_BRANDS.find((x) => x.id === t.brandId) || FRATERNITY_BRANDS[0];
                              const active = selectedTenant?.id === t.id;
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    if (active) return;
                                    handleSelectTenant(t);
                                    setSpotlight(null);
                                    showToast(`Re-skinned to ${b.name}. Every surface updated.`, "success");
                                  }}
                                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition active:scale-[0.98] ${active ? "border-2" : "border-slate-100 hover:border-slate-200"}`}
                                  style={active ? { borderColor: b.primaryColor } : {}}
                                >
                                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black text-white shrink-0" style={{ backgroundColor: b.primaryColor }}>{b.letters}</span>
                                  <span className="text-[12px] font-bold text-slate-800 truncate text-left">{b.name}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                            <IconShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            Every page, email, and member portal re-skins instantly — no rebuild, no developer.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
}
