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
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1.5 shrink-0">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> Chapter Calendar
                          </h3>
                        </div>

                        {dashboardData?.events?.length > 0 ? (
                          dashboardData.events.map((e: any) => {
                            const isGoing = e.myRsvp?.status === "GOING";
                            const isMaybe = e.myRsvp?.status === "MAYBE";
                            const isNotGoing = e.myRsvp?.status === "NOT_GOING";
                            const starts = new Date(e.startsAt);
                            
                            return (
                              <div key={e.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3 text-left">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <span 
                                      className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
                                      style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                    >
                                      {e.category}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-900 mt-2">{e.name}</h4>
                                  </div>
                                  
                                  <div className="text-center bg-slate-50 border border-slate-100 rounded-lg p-1.5 min-w-[44px]">
                                    <div className="text-[11px] uppercase font-bold" style={{ color: selectedBrand.primaryColor }}>
                                      {starts.toLocaleDateString([], { month: "short" })}
                                    </div>
                                    <div className="text-xs font-bold text-slate-900">
                                      {starts.getDate()}
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[12px] text-slate-600 leading-normal line-clamp-2">
                                  {e.description || "No description provided."}
                                </p>

                                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[12px] text-slate-500 border-t border-slate-50 pt-2">
                                  {e.location && (
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {e.location}</span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 shrink-0" />{" "}
                                    {starts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                  </span>
                                  {e.dressCode && (
                                    <span className="flex items-center gap-1"><Award className="w-3 h-3 shrink-0" /> {e.dressCode}</span>
                                  )}
                                </div>

                                {role === "brother" && (
                                  <div className="pt-2 flex items-center gap-2">
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "GOING")}
                                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition flex items-center justify-center gap-1 ${
                                        isGoing
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-slate-50 text-slate-600 border border-slate-100 hover:text-slate-900"
                                      }`}
                                    >
                                      {isGoing && <Check className="w-3 h-3" />} Going
                                    </button>
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "MAYBE")}
                                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition flex items-center justify-center gap-1 ${
                                        isMaybe
                                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                                          : "bg-slate-50 text-slate-600 border border-slate-100 hover:text-slate-900"
                                      }`}
                                    >
                                      {isMaybe && <Check className="w-3 h-3" />} Maybe
                                    </button>
                                    <button
                                      disabled={rsvpSubmittingId === e.id}
                                      onClick={() => handleRsvp(e.id, "NOT_GOING")}
                                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition flex items-center justify-center gap-1 ${
                                        isNotGoing
                                          ? "bg-red-50 text-red-700 border border-red-200"
                                          : "bg-slate-50 text-slate-600 border border-slate-100 hover:text-slate-900"
                                      }`}
                                    >
                                      {isNotGoing && <Check className="w-3 h-3" />} Decline
                                    </button>
                                  </div>
                                )}

                                {/* Add to calendar — available to everyone (alumni see events too) */}
                                <button
                                  onClick={() => handleAddToCalendar(e)}
                                  className="w-full mt-1 py-1.5 rounded-lg text-[12px] font-bold border transition flex items-center justify-center gap-1.5 active:scale-[0.99]"
                                  style={{ color: selectedBrand.primaryColor, borderColor: selectedBrand.primaryColor + '30', backgroundColor: selectedBrand.primaryColor + '0a' }}
                                >
                                  <CalendarPlus className="w-3.5 h-3.5" /> Add to calendar
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
