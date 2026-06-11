import React from "react";
import { X, Phone, Crown } from "lucide-react";
import type { DemoContext } from "../context";

export function renderAddMemberModal(ctx: DemoContext) {
  const {
    email,
    handleAddMobileMember,
    newMemberEmail,
    newMemberGradYear,
    newMemberName,
    newMemberPhone,
    newMemberPosition,
    newMemberRole,
    selectedBrand,
    setNewMemberEmail,
    setNewMemberGradYear,
    setNewMemberName,
    setNewMemberPhone,
    setNewMemberPosition,
    setNewMemberRole,
    setShowAddMemberModal,
  } = ctx;
  // <lg: the form fills the content area below the demo header as a full
  // sheet — no dead shell bands around a floating card (owner round-8).
  // lg+: compact centered card inside the phone frame.
  return (
            <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-[110] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm lg:absolute lg:inset-0 lg:items-center lg:justify-center lg:p-6" onClick={() => setShowAddMemberModal(false)}>
              <div className="bg-white rounded-t-[32px] border border-slate-100 p-5 w-full grow space-y-4 shadow-2xl animate-scale-in text-left overflow-y-auto lg:grow-0 lg:w-full lg:max-w-xs lg:rounded-3xl lg:max-h-[85%]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add New Member</h4>
                  </div>
                  <button onClick={() => setShowAddMemberModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <form onSubmit={handleAddMobileMember} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Johnny Adams"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="johnny@usc.edu"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      placeholder="555-0192"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Chapter Roster Role</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setNewMemberRole("actives")}
                        className={`flex-1 py-1 text-[12px] font-semibold rounded transition ${
                          newMemberRole === "actives" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500"
                        }`}
                      >
                        Active Brother
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMemberRole("alumni")}
                        className={`flex-1 py-1 text-[12px] font-semibold rounded transition ${
                          newMemberRole === "alumni" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500"
                        }`}
                      >
                        Alumnus
                      </button>
                    </div>
                  </div>

                  {newMemberRole === "actives" ? (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Officer Position (Optional)</label>
                      <input
                        type="text"
                        value={newMemberPosition}
                        onChange={(e) => setNewMemberPosition(e.target.value)}
                        placeholder="e.g. Rush Chair, Secretary"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Graduation Year</label>
                      <input
                        type="number"
                        value={newMemberGradYear}
                        onChange={(e) => setNewMemberGradYear(e.target.value)}
                        placeholder="2020"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-[0.98] mt-2"
                    style={{ backgroundColor: selectedBrand.primaryColor }}
                  >
                    Add Member Record
                  </button>
                </form>
              </div>
            </div>
          );
}
