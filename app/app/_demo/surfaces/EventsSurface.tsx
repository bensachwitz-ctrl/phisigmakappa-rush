import React from "react";
import { Calendar, Check, MapPin, Award, Clock, CalendarPlus } from "lucide-react";
import type { DemoContext } from "../context";

export function renderEventsTab(ctx: DemoContext) {
  const {
    dashboardData,
    handleAddToCalendar,
    handleRsvp,
    role,
    rsvpSubmittingId,
    selectedBrand,
  } = ctx;
  return (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1 shrink-0">
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" style={{ color: selectedBrand.primaryColor }} /> Chapter calendar
                          </h3>
                        </div>

                        {dashboardData?.events?.length > 0 ? (
                          dashboardData.events.map((e: any) => {
                            const isGoing = e.myRsvp?.status === "GOING";
                            const isMaybe = e.myRsvp?.status === "MAYBE";
                            const isNotGoing = e.myRsvp?.status === "NOT_GOING";
                            const starts = new Date(e.startsAt);

                            return (
                              <div key={e.id} className="gs-glass space-y-2 rounded-xl p-3 text-left transition-all hover:-translate-y-0.5">
                                <div className="flex items-start gap-2.5">
                                  <div className="text-center bg-slate-50 border border-slate-100 rounded-lg px-1.5 py-1 min-w-[40px] shrink-0">
                                    <div className="text-[11px] uppercase font-bold leading-none" style={{ color: selectedBrand.primaryColor }}>
                                      {starts.toLocaleDateString([], { month: "short" })}
                                    </div>
                                    <div className="text-[15px] font-extrabold leading-tight text-slate-900">
                                      {starts.getDate()}
                                    </div>
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0 rounded border"
                                        style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                      >
                                        {e.category}
                                      </span>
                                    </div>
                                    <h4 className="text-[13px] font-bold text-slate-900 mt-1 leading-tight">{e.name}</h4>
                                    <div className="mt-1 flex flex-wrap items-center gap-y-0.5 gap-x-2.5 text-[11px] text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 shrink-0" />
                                        {starts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                      </span>
                                      {e.location && (
                                        <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {e.location}</span>
                                      )}
                                      {e.dressCode && (
                                        <span className="flex items-center gap-1"><Award className="w-3 h-3 shrink-0" /> {e.dressCode}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {e.description && (
                                  <p className="text-[12px] text-slate-600 leading-snug line-clamp-2">
                                    {e.description}
                                  </p>
                                )}

                                {role === "brother" && (
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "GOING")}
                                      className={`press flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg text-[12px] font-bold transition ${
                                        isGoing
                                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border border-slate-100 bg-slate-50 text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {isGoing && <Check className="h-3 w-3" />} Going
                                    </button>
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "MAYBE")}
                                      className={`press flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg text-[12px] font-bold transition ${
                                        isMaybe
                                          ? "border border-amber-200 bg-amber-50 text-amber-700"
                                          : "border border-slate-100 bg-slate-50 text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {isMaybe && <Check className="h-3 w-3" />} Maybe
                                    </button>
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "NOT_GOING")}
                                      className={`press flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg text-[12px] font-bold transition ${
                                        isNotGoing
                                          ? "border border-red-200 bg-red-50 text-red-700"
                                          : "border border-slate-100 bg-slate-50 text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {isNotGoing && <Check className="h-3 w-3" />} Decline
                                    </button>
                                  </div>
                                )}

                                {/* Add to calendar — available to everyone (alumni see events too) */}
                                <button
                                  onClick={() => handleAddToCalendar(e)}
                                  className="press flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border text-[12px] font-bold transition"
                                  style={{ color: selectedBrand.primaryColor, borderColor: selectedBrand.primaryColor + '30', backgroundColor: selectedBrand.primaryColor + '0a' }}
                                >
                                  <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400 shadow-sm">
                            No upcoming events on the schedule.
                          </div>
                        )}
                      </div>
                    );
}
