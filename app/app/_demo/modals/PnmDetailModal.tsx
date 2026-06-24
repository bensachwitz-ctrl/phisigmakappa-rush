import React from "react";
import {
  IconBallot,
  IconClose,
  IconSchool,
} from "@/components/brand/icons";

import type { DemoContext } from "../context";

export function renderPnmDetail(ctx: DemoContext) {
  const {
    handleAddImpression,
    handlePnmVote,
    handleSimulateCheckIn,
    newImpressionNote,
    newImpressionTone,
    selectedBrand,
    selectedPnm,
    setNewImpressionNote,
    setNewImpressionTone,
    setSelectedPnm,
  } = ctx;
  // <lg: the sheet FILLS the content area below the demo header — no dead
  // shell bands (owner round-8). lg+: classic in-phone bottom sheet.
  return (
                <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 flex flex-col justify-end bg-slate-950/70 text-left backdrop-blur-sm lg:absolute lg:inset-0" onClick={() => setSelectedPnm(null)}>
                  <div className="bg-white rounded-t-[32px] border-t border-slate-200 grow overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl lg:grow-0 lg:max-h-[85%]" onClick={(e) => e.stopPropagation()}>
                    
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border"
                          style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                        >
                          {selectedPnm.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{selectedPnm.name}</h4>
                          <span className="text-[12px] text-slate-500">{selectedPnm.status} Candidate</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedPnm(null)}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-[11px]">
                      
                      {/* Details specs */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Hometown</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{selectedPnm.hometown}</p>
                        </div>
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Major & School Year</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{selectedPnm.year} • {selectedPnm.major}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">High School</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{selectedPnm.highSchoolInfo || "Not specified"}</p>
                        </div>
                        {selectedPnm.backgroundInfo && (
                          <div className="col-span-2 border-t border-slate-200/60 pt-2">
                            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Vibe & Background</span>
                            <p className="text-slate-600 leading-relaxed mt-1">{selectedPnm.backgroundInfo}</p>
                          </div>
                        )}
                      </div>

                      {/* Interactive Voting Board */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Submit Your Rush Vote</span>
                        
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 justify-between gap-1">
                          {([-2, -1, 0, 1, 2] as const).map((score) => {
                            const isSelected = selectedPnm.myVote === score;
                            const labels = { "-2": "-2", "-1": "-1", "0": "0", "1": "+1", "2": "+2" };
                            
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => handlePnmVote(selectedPnm.id, score)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                                  isSelected
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {labels[score.toString() as keyof typeof labels]}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-slate-400 text-center">Votes count towards running averages: {selectedPnm.votesAverage} ({selectedPnm.votesCount} ballots cast)</p>
                      </div>

                      {/* Dynamic door scanner check-in */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl mt-1">
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Attendance Log</span>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">Checked in at {selectedPnm.attendanceCount} events</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSimulateCheckIn(selectedPnm.id)}
                          className="px-3.5 py-1.5 text-[12px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition"
                        >
                          Simulate Door Scan
                        </button>
                      </div>

                      {/* Impression feed */}
                      <div className="space-y-2.5 pt-2">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Brother Vibe Impressions Note</span>
                        
                        {/* Feed */}
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {selectedPnm.impressions && selectedPnm.impressions.length > 0 ? (
                            selectedPnm.impressions.map((imp: any, idx: number) => (
                              <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                <div className="flex justify-between text-[11px] font-bold">
                                  <span className="text-slate-800">{imp.authorName}</span>
                                  <span className={`uppercase ${
                                    imp.tone === "positive" ? "text-emerald-600" : imp.tone === "concern" ? "text-red-500" : "text-slate-500"
                                  }`}>{imp.tone}</span>
                                </div>
                                <p className="text-[12px] text-slate-600 leading-normal">{imp.note}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-slate-400">No notes recorded yet.</div>
                          )}
                        </div>

                        {/* Input form */}
                        <form onSubmit={(e) => handleAddImpression(e, selectedPnm.id)} className="space-y-2 border-t border-slate-100 pt-2.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Write a rush candidate note..."
                              required
                              value={newImpressionNote}
                              onChange={(e) => setNewImpressionNote(e.target.value)}
                              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[11px]"
                            />
                            
                            <select
                              value={newImpressionTone}
                              onChange={(e: any) => setNewImpressionTone(e.target.value)}
                              className="px-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none"
                            >
                              <option value="positive">Pos</option>
                              <option value="neutral">Neu</option>
                              <option value="concern">Con</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[12px] font-bold transition"
                          >
                            Add Roster Note
                          </button>
                        </form>
                      </div>

                    </div>
                  </div>
                </div>
              );
}
