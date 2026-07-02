import React from "react";
import {
  IconAlert,
  IconBriefcase,
  IconCheck,
  IconClose,
  IconInfo,
  IconPhone,
} from "@/components/brand/icons";

import type { DemoContext } from "../context";
import { useEscapeClose } from "./useEscapeClose";

export function renderPostJobModal(ctx: DemoContext) {
  return <PostJobModal ctx={ctx} />;
}

export function PostJobModal({ ctx }: { ctx: DemoContext }) {
  const {
    email,
    handlePostJob,
    jobCompany,
    jobContactEmail,
    jobContactName,
    jobContactPhone,
    jobCrossPost,
    jobDescription,
    jobLocation,
    jobRequirements,
    jobSalary,
    jobTitle,
    postJobError,
    postJobSuccess,
    resetJobForm,
    role,
    selectedBrand,
    setJobCompany,
    setJobContactEmail,
    setJobContactName,
    setJobContactPhone,
    setJobCrossPost,
    setJobDescription,
    setJobLocation,
    setJobRequirements,
    setJobSalary,
    setJobTitle,
    setPostJobError,
    setShowPostJobModal,
  } = ctx;
  const closeModal = () => { setShowPostJobModal(false); resetJobForm(); setPostJobError(null); };
  useEscapeClose(closeModal);
  // <lg: the sheet FILLS the content area below the demo header — no dead
  // shell bands (owner round-8). lg+: classic in-phone bottom sheet.
  return (
                <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 flex flex-col justify-end bg-slate-950/75 text-left backdrop-blur-sm lg:absolute lg:inset-0" onClick={closeModal}>
                  <div role="dialog" aria-modal="true" aria-labelledby="post-job-modal-title" className="bg-white rounded-t-[32px] border-t border-slate-200 grow overflow-y-auto flex flex-col p-6 space-y-4 shadow-2xl lg:grow-0 lg:max-h-[88%]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <IconBriefcase className="w-5 h-5" style={{ color: selectedBrand.primaryColor }} />
                        <h4 id="post-job-modal-title" className="text-sm font-bold text-slate-955">Post Career Opportunity</h4>
                      </div>
                      <button
                        onClick={closeModal}
                        className="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition"
                        type="button"
                        aria-label="Close"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>

                    {postJobSuccess ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                          <IconCheck className="w-6 h-6" />
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">Post Shipped Successfully!</h5>
                        <p className="text-xs text-slate-500">The career opportunity is now live in active feeds and listings.</p>
                      </div>
                    ) : (
                      <form onSubmit={handlePostJob} className="space-y-3.5 pb-8">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Job / Internship Title</label>
                            <input
                              type="text"
                              required
                              value={jobTitle}
                              onChange={(e) => setJobTitle(e.target.value)}
                              placeholder="Software Engineer Intern"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Company Name</label>
                            <input
                              type="text"
                              required
                              value={jobCompany}
                              onChange={(e) => setJobCompany(e.target.value)}
                              placeholder="Google"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Location</label>
                            <input
                              type="text"
                              value={jobLocation}
                              onChange={(e) => setJobLocation(e.target.value)}
                              placeholder="San Francisco, CA"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Salary (Optional)</label>
                            <input
                              type="text"
                              value={jobSalary}
                              onChange={(e) => setJobSalary(e.target.value)}
                              placeholder="$45/hr or $90k/yr"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-3">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Contact & Referral Info</span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Referral Contact Name</label>
                              <input
                                type="text"
                                required
                                value={jobContactName}
                                onChange={(e) => setJobContactName(e.target.value)}
                                placeholder="Marcus Brody"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Contact Phone</label>
                              <input
                                type="text"
                                value={jobContactPhone}
                                onChange={(e) => setJobContactPhone(e.target.value)}
                                placeholder="415-555-0921"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Contact Email (for Applications)</label>
                            <input
                              type="email"
                              required
                              value={jobContactEmail}
                              onChange={(e) => setJobContactEmail(e.target.value)}
                              placeholder="marcus.brody@google.com"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                            />
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                          <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Description</label>
                          <textarea
                            required
                            rows={2}
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Detail the role, tasks, or application steps..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Preferred Qualifications</label>
                          <input
                            type="text"
                            value={jobRequirements}
                            onChange={(e) => setJobRequirements(e.target.value)}
                            placeholder="GPA 3.5+, computer science student"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-900 focus:border-slate-300 brand-focus"
                          />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <input
                            type="checkbox"
                            id="jobCrossPost"
                            checked={jobCrossPost}
                            onChange={(e) => setJobCrossPost(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <label htmlFor="jobCrossPost" className="text-[12px] text-slate-600 font-bold select-none cursor-pointer">
                            Cross-post teaser directly to Announcements feed
                          </label>
                        </div>

                        {postJobError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-1.5 text-[12px] text-red-600 leading-normal">
                            <IconAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{postJobError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2.5 text-white rounded-lg text-xs font-bold shadow-md transition active:scale-[0.98]"
                          style={{ backgroundColor: selectedBrand.primaryColor }}
                        >
                          Submit Listing
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
}
