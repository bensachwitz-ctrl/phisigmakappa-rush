import React from "react";
import {
  IconCar,
  IconChevronRight,
  IconClock,
  IconKey,
  IconSearch,
  IconXCircle,
} from "@/components/brand/icons";

import type { DemoContext } from "../context";
import { isOfficerPosition } from "../mock-data";


export function renderRushTab(ctx: DemoContext) {
  const {
    activeSubTab,
    dashboardData,
    isRushActive,
    rushFilter,
    rushSearch,
    selectedBrand,
    setActiveSubTab,
    setIsRushActive,
    setRushFilter,
    setRushSearch,
    setSelectedPnm,
    setSimulatedDay,
    setSimulatedHour,
    setSoberAssignments,
    showToast,
    simulatedDay,
    simulatedHour,
    soberAssignments,
  } = ctx;
  return (
                      isRushActive ? (
                        <div className="space-y-3 flex flex-col flex-1 overflow-hidden text-left">
                          {/* Rush Statistics */}
                          <div className="grid grid-cols-3 gap-2 text-center shrink-0">
                            <div className="gs-glass rounded-2xl p-2.5">
                              <span className="text-[22px] font-extrabold" style={{ color: selectedBrand.primaryColor }}>{dashboardData?.pnms?.length || 0}</span>
                              <p className="mt-0.5 text-[11px] font-semibold uppercase text-slate-500">Total PNMs</p>
                            </div>
                            <div className="gs-glass rounded-2xl p-2.5">
                              <span className="text-[22px] font-extrabold" style={{ color: selectedBrand.primaryColor }}>
                                {dashboardData?.pnms?.filter((p: any) => p.status === "BID_EXTENDED").length || 0}
                              </span>
                              <p className="mt-0.5 text-[11px] font-semibold uppercase text-slate-500">Bids Sent</p>
                            </div>
                            <div className="gs-glass rounded-2xl p-2.5">
                              <span className="text-[22px] font-extrabold" style={{ color: selectedBrand.primaryColor }}>
                                {dashboardData?.pnms?.filter((p: any) => p.attendanceCount > 0).length || 0}
                              </span>
                              <p className="mt-0.5 text-[11px] font-semibold uppercase text-slate-500">Attended</p>
                            </div>
                          </div>

                          {/* Search & Filters */}
                          <div className="space-y-2 shrink-0">
                            <div className="relative">
                              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Search PNM name or major..."
                                value={rushSearch}
                                onChange={(e) => setRushSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl focus:border-slate-300 outline-none text-xs text-slate-900 shadow-sm"
                              />
                            </div>

                            {/* End Rush Toggle for Officers */}
                            {(isOfficerPosition(dashboardData?.profile?.position)) && (
                              <button
                                onClick={() => {
                                  setIsRushActive(false);
                                  showToast("Rush Season ended. Portal converted to New Members & Sober Driver Schedule.", "success");
                                }}
                                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[12px] font-black flex items-center justify-center gap-1 transition shadow-sm"
                              >
                                <IconXCircle className="w-3.5 h-3.5 text-red-400" /> Close Rush Season
                              </button>
                            )}

                            {/* Quick filters */}
                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                              {(["ALL", "ACTIVE", "BID_EXTENDED", "DROPPED"] as const).map((f) => (
                                <button
                                  key={f}
                                  onClick={() => setRushFilter(f)}
                                  className={`press min-h-[36px] shrink-0 whitespace-nowrap rounded-lg border px-3 text-[11px] font-bold uppercase tracking-wider transition ${
                                    rushFilter === f
                                      ? "border-slate-900 bg-slate-900 text-white"
                                      : "border-slate-100 bg-white text-slate-500 hover:text-slate-900"
                                  }`}
                                >
                                  {f.replace("_", " ")}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* PNM list stream */}
                          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                            {(() => {
                              const list = (dashboardData?.pnms || []).filter((p: any) => {
                                const q = rushSearch.toLowerCase();
                                const matchesSearch = p.name.toLowerCase().includes(q) || (p.major && p.major.toLowerCase().includes(q));
                                const matchesFilter = rushFilter === "ALL" || p.status === rushFilter;
                                return matchesSearch && matchesFilter;
                              });

                              if (list.length === 0) {
                                return (
                                  <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 shadow-sm">
                                    No candidates match your filters.
                                  </div>
                                );
                              }

                              return list.map((p: any) => (
                                <button
                                  key={p.id}
                                  onClick={() => setSelectedPnm(p)}
                                  className="press gs-glass group flex w-full min-h-[60px] items-center justify-between gap-3 rounded-2xl p-3 text-left transition hover:-translate-y-0.5"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div 
                                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none border"
                                      style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                    >
                                      {p.name.split(" ").map((n: string) => n[0]).join("")}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                        {p.name}
                                        {p.status === "BID_EXTENDED" && (
                                          <span className="text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded">Bid Sent</span>
                                        )}
                                      </h5>
                                      <span className="text-[11px] text-slate-500 block truncate">
                                        {p.year} • {p.major || "No Major Specified"} • {p.hometown}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right">
                                      <span className="text-[12px] font-bold text-slate-800">
                                        {p.votesAverage > 0 ? `+${p.votesAverage}` : p.votesAverage}
                                      </span>
                                      <span className="text-[11px] text-slate-400 block">{p.votesCount} votes</span>
                                    </div>
                                    <IconChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 transition" />
                                  </div>
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 flex flex-col flex-1 overflow-hidden text-left">
                          {/* Title block with Reopen Button */}
                          <div className="flex items-center justify-between bg-white p-3 border border-slate-100 rounded-2xl shadow-sm shrink-0">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">New Members Portal</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">Active Pledges & Sober Drivers</p>
                            </div>
                            <button
                              onClick={() => {
                                setIsRushActive(true);
                                showToast("Rush season re-opened.", "info");
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                              Re-open Rush
                            </button>
                          </div>

                          {/* Time Simulator block */}
                          <div className="p-3 bg-slate-950 text-slate-200 rounded-2xl border border-white/5 space-y-2 shadow-inner shrink-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <IconClock className="w-3 h-3 text-emerald-400" /> Time Simulator
                              </span>
                              <span className="text-[12px] font-black text-white bg-white/10 px-2 py-0.5 rounded">
                                {simulatedDay} @ {simulatedHour === 22 ? "10:00 PM" : simulatedHour === 23 ? "11:00 PM" : simulatedHour === 0 ? "12:00 AM" : "1:00 AM"}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {(["Friday", "Saturday", "Other"] as const).map((day) => (
                                <button
                                  key={day}
                                  onClick={() => setSimulatedDay(day)}
                                  className={`flex-1 py-1 text-[11px] font-bold rounded transition ${
                                    simulatedDay === day ? "bg-blue-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                                  }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              {([22, 23, 0, 1] as const).map((hour) => (
                                <button
                                  key={hour}
                                  onClick={() => setSimulatedHour(hour)}
                                  className={`flex-1 py-1 text-[11px] font-bold rounded transition ${
                                    simulatedHour === hour ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                                  }`}
                                >
                                  {hour === 22 ? "10pm" : hour === 23 ? "11pm" : hour === 0 ? "12am" : "1am"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Sub tabs: Directory vs Schedule */}
                          <div className="flex border-b border-slate-100 shrink-0">
                            <button
                              onClick={() => setActiveSubTab("directory")}
                              className={`flex-1 pb-1.5 text-[12px] font-bold border-b-2 text-center transition-all ${
                                activeSubTab === "directory" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
                              }`}
                            >
                              Pledge List
                            </button>
                            <button
                              onClick={() => setActiveSubTab("schedule")}
                              className={`flex-1 pb-1.5 text-[12px] font-bold border-b-2 text-center transition-all ${
                                activeSubTab === "schedule" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"
                              }`}
                            >
                              Sober Schedule
                            </button>
                          </div>

                          {activeSubTab === "directory" ? (
                            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                              {/* New Member List */}
                              {(() => {
                                // Filter mock accepted pledges
                                const list = (dashboardData?.pnms || []).map((p: any) => {
                                  // For simulation, let's treat active/bid_extended PNMs as pledges
                                  const isDriverNow = 
                                    (simulatedDay === "Friday" && simulatedHour >= 22 && simulatedHour < 24 && soberAssignments["Friday-22"] === p.id) ||
                                    (simulatedDay === "Friday" && (simulatedHour === 0 || simulatedHour === 1) && soberAssignments["Friday-00"] === p.id) ||
                                    (simulatedDay === "Saturday" && simulatedHour >= 22 && simulatedHour < 24 && soberAssignments["Saturday-22"] === p.id) ||
                                    (simulatedDay === "Saturday" && (simulatedHour === 0 || simulatedHour === 1) && soberAssignments["Saturday-00"] === p.id);
                                  return { ...p, isDriverNow };
                                });

                                return list.map((p: any) => (
                                  <div
                                    key={p.id}
                                    className={`p-3 bg-white rounded-2xl border flex items-center justify-between gap-3 text-left shadow-sm transition-all ${
                                      p.isDriverNow ? "ring-2 ring-amber-500/30 border-amber-300 bg-amber-500/[0.01]" : "border-slate-100"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div 
                                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none border"
                                        style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                      >
                                        {p.name.split(" ").map((n: string) => n[0]).join("")}
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                          {p.name}
                                          {p.isDriverNow && (
                                            <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold px-1 rounded">
                                              <IconKey className="w-2 h-2" /> DRIVING
                                            </span>
                                          )}
                                        </h5>
                                        <span className="text-[11px] text-slate-500 block truncate">
                                          {p.phone} • {p.major || "Freshman"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="shrink-0">
                                      {p.isDriverNow ? (
                                        <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                          <IconCar className="w-3.5 h-3.5" />
                                        </div>
                                      ) : (
                                        <span className="text-[11px] font-bold text-slate-400 block">Standby</span>
                                      )}
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          ) : (
                            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                              {/* Sober Driver Schedule Assignment List */}
                              {[
                                { key: "Friday-22", label: "Friday Late Night (10pm-12am)" },
                                { key: "Friday-00", label: "Friday Morning (12am-2am)" },
                                { key: "Saturday-22", label: "Saturday Late Night (10pm-12am)" },
                                { key: "Saturday-00", label: "Saturday Morning (12am-2am)" },
                              ].map((s) => {
                                const activeId = soberAssignments[s.key] || "";
                                const isCurrentShift = 
                                  (s.key === "Friday-22" && simulatedDay === "Friday" && simulatedHour >= 22 && simulatedHour < 24) ||
                                  (s.key === "Friday-00" && simulatedDay === "Friday" && (simulatedHour === 0 || simulatedHour === 1)) ||
                                  (s.key === "Saturday-22" && simulatedDay === "Saturday" && simulatedHour >= 22 && simulatedHour < 24) ||
                                  (s.key === "Saturday-00" && simulatedDay === "Saturday" && (simulatedHour === 0 || simulatedHour === 1));

                                return (
                                  <div key={s.key} className={`p-2.5 bg-white rounded-xl border transition-all ${
                                    isCurrentShift ? "border-emerald-400 bg-emerald-500/[0.01]" : "border-slate-100"
                                  }`}>
                                    <div className="flex justify-between items-center mb-1.5">
                                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                        <IconClock className="w-3.5 h-3.5 text-slate-400" /> {s.label}
                                      </span>
                                      {isCurrentShift && (
                                        <span className="text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full select-none">Active Now</span>
                                      )}
                                    </div>
                                    <select
                                      value={activeId}
                                      onChange={(e) => {
                                        setSoberAssignments((prev) => ({ ...prev, [s.key]: e.target.value }));
                                        showToast("Sober driver assignment updated.", "success");
                                      }}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] outline-none font-medium text-slate-800"
                                    >
                                      <option value="">Select a sober driver...</option>
                                      {(dashboardData?.pnms || []).map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )
                    );
}
