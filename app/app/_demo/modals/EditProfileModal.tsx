import React from "react";
import { User, X, Phone } from "lucide-react";
import type { DemoContext } from "../context";

export function renderEditProfileModal(ctx: DemoContext) {
  const {
    editBio,
    editCity,
    editCompany,
    editHometown,
    editJobTitle,
    editLinkedIn,
    editMajor,
    editPhone,
    editState,
    editYear,
    handleSaveProfile,
    role,
    selectedBrand,
    setEditBio,
    setEditCity,
    setEditCompany,
    setEditHometown,
    setEditJobTitle,
    setEditLinkedIn,
    setEditMajor,
    setEditPhone,
    setEditState,
    setEditYear,
    setShowEditProfileModal,
  } = ctx;
  return (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex flex-col justify-end text-left" onClick={() => setShowEditProfileModal(false)}>
                  <div className="bg-white rounded-t-[32px] border-t border-slate-200 max-h-[88%] overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5" style={{ color: selectedBrand.primaryColor }} />
                        <h4 className="text-sm font-bold text-slate-955">Update Profile Information</h4>
                      </div>
                      <button
                        onClick={() => setShowEditProfileModal(false)}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-3.5 pb-8">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Phone Number</label>
                          <input
                            type="text"
                            required
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="803-555-0144"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Hometown</label>
                          <input
                            type="text"
                            required
                            value={editHometown}
                            onChange={(e) => setEditHometown(e.target.value)}
                            placeholder="Charleston, SC"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>
                      </div>

                      {role === "brother" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Year</label>
                            <input
                              type="text"
                              required
                              value={editYear}
                              onChange={(e) => setEditYear(e.target.value)}
                              placeholder="Senior"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Academic Major</label>
                            <input
                              type="text"
                              required
                              value={editMajor}
                              onChange={(e) => setEditMajor(e.target.value)}
                              placeholder="Computer Science"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Current Employer</label>
                              <input
                                type="text"
                                required
                                value={editCompany}
                                onChange={(e) => setEditCompany(e.target.value)}
                                placeholder="Google"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Job Title</label>
                              <input
                                type="text"
                                required
                                value={editJobTitle}
                                onChange={(e) => setEditJobTitle(e.target.value)}
                                placeholder="Senior Software Engineer"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">City</label>
                              <input
                                type="text"
                                required
                                value={editCity}
                                onChange={(e) => setEditCity(e.target.value)}
                                placeholder="San Francisco"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">State</label>
                              <input
                                type="text"
                                required
                                value={editState}
                                onChange={(e) => setEditState(e.target.value)}
                                placeholder="CA"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">LinkedIn URL</label>
                            <input
                              type="text"
                              value={editLinkedIn}
                              onChange={(e) => setEditLinkedIn(e.target.value)}
                              placeholder="https://linkedin.com/in/username"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Professional Bio / Mentorship Note</label>
                            <textarea
                              rows={2}
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              placeholder="Happy to review resumes or grab a coffee with active brothers."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-[0.98]"
                        style={{ backgroundColor: selectedBrand.primaryColor }}
                      >
                        Save & Sync Profile
                      </button>
                    </form>
                  </div>
                </div>
              );
}
