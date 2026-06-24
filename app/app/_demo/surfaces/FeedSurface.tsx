import React from "react";
import { ChevronDown, Pin, Mail, Phone, Briefcase, Gift, Lock, Crown, Vote } from "lucide-react";
import { BrandGlyphIcon } from "@/components/site/brand-glyph";
import { isOfficerPosition } from "../mock-data";
import type { DemoContext } from "../context";

export function renderFeedTab(ctx: DemoContext) {
  const {
    combinedFeed,
    dashboardData,
    expandedAnnouncementId,
    role,
    selectedBrand,
    setActiveTab,
    setDonationDone,
    setExpandedAnnouncementId,
    setRole,
    setSpotlight,
    setViewRole,
  } = ctx;
  return (
                      <div className="space-y-3">
                        {/* Welcome widget — compact: avatar + name on one row, with
                            standing/financials as inline chips instead of a tall block. */}
                        <div
                          className="border p-3 rounded-2xl relative overflow-hidden"
                          style={{ background: `linear-gradient(to right, ${selectedBrand.primaryColor}12, ${selectedBrand.primaryColor}06, #ffffff)`, borderColor: `${selectedBrand.primaryColor}20` }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl text-[13px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: selectedBrand.primaryColor }}
                            >
                              {(dashboardData?.profile?.name || "M").split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-[11px] font-semibold leading-none text-slate-500">Welcome back</h4>
                              <h2 className="mt-0.5 truncate text-[16px] font-extrabold leading-tight tracking-tight text-slate-900">
                                {dashboardData?.profile?.name || "Member"}
                              </h2>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {role === "brother"
                                  ? `${dashboardData?.profile?.position || "Active Member"}${dashboardData?.profile?.position === "Active Brother" || dashboardData?.profile?.position === "Active Member" ? "" : " • Active Brother"} • ${dashboardData?.profile?.pledgeClass || "Brother"}`
                                  : `Class of ${dashboardData?.profile?.graduationYear || dashboardData?.profile?.gradYear || "—"} • Alumnus`}
                              </p>
                            </div>
                          </div>

                          {role === "brother" && dashboardData?.standing && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {dashboardData.standing.standing}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ring-1 ${
                                  dashboardData.profile?.duesPaid
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-amber-50 text-amber-700 ring-amber-100"
                                }`}
                              >
                                Dues {dashboardData.profile?.duesPaid ? "Paid" : "Unpaid"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Chapter tools — ONE row of icons (owner round-7), and
                            role-gated (owner round-8): GIVE lives on the ALUMNI
                            view ONLY. Brothers get participation actions (vote)
                            plus the Exec tools entry — UNLOCKED when the signed-
                            in member is an officer (president and e-board carry
                            exec rights via the role map), a locked gating demo
                            for plain actives. Write tools stay exec-view only. */}
                        <div>
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1 mb-1.5">
                            <BrandGlyphIcon name="letters" className="w-3 h-3" style={{ color: selectedBrand.primaryColor }} /> Chapter tools
                          </h3>
                          {/* grid-flow-col + auto-cols-fr keeps every visible tool
                              on a single line no matter the role's tool count. */}
                          <div className="grid grid-flow-col auto-cols-fr gap-1.5">
                            {role === "alumni" && (
                              <button
                                onClick={() => { setSpotlight("giving"); setDonationDone(false); }}
                                className="press gs-glass flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl p-1.5 text-center transition hover:-translate-y-0.5 motion-reduce:transform-none"
                              >
                                <span
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
                                  style={{ background: `linear-gradient(140deg, ${selectedBrand.primaryColor}, ${selectedBrand.primaryColor}cc)` }}
                                >
                                  <Gift className="h-4 w-4" />
                                </span>
                                <span className="w-full truncate text-[11px] font-bold leading-tight text-slate-700">Give</span>
                              </button>
                            )}
                            {role === "brother" && (
                              <button
                                onClick={() => { setSpotlight("elections"); }}
                                className="press gs-glass flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl p-1.5 text-center transition hover:-translate-y-0.5 motion-reduce:transform-none"
                              >
                                <span
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
                                  style={{ background: `linear-gradient(140deg, ${selectedBrand.primaryColor}, ${selectedBrand.primaryColor}cc)` }}
                                >
                                  <Vote className="h-4 w-4" />
                                </span>
                                <span className="w-full truncate text-[11px] font-bold leading-tight text-slate-700">Vote</span>
                              </button>
                            )}
                            {role === "brother" && (
                              isOfficerPosition(dashboardData?.profile?.position) ? (
                                <button
                                  onClick={() => { setRole("brother"); setViewRole("exec"); setActiveTab("feed"); }}
                                  aria-label={`You are ${dashboardData?.profile?.position}. Open the exec board view`}
                                  className="press gs-glass flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl p-1.5 text-center transition hover:-translate-y-0.5 motion-reduce:transform-none"
                                >
                                  <span
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
                                    style={{ background: `linear-gradient(140deg, ${selectedBrand.primaryColor}, ${selectedBrand.primaryColor}cc)` }}
                                  >
                                    <Crown className="h-4 w-4" />
                                  </span>
                                  <span className="w-full truncate text-[11px] font-bold leading-tight text-slate-700">Exec tools</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setRole("brother"); setViewRole("exec"); setActiveTab("feed"); }}
                                  aria-label="Exec-only tools. Switch to the exec board view"
                                  className="press gs-glass flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 p-1.5 text-center transition hover:-translate-y-0.5 motion-reduce:transform-none"
                                >
                                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <Lock className="h-4 w-4" />
                                  </span>
                                  <span className="w-full truncate text-[11px] font-bold leading-tight text-slate-500">Exec tools</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Merged Timeline Feed */}
                        <div className="space-y-2">
                          {/* Posting announcements is an exec write — members and
                              alumni read the feed; the Post tool lives in the exec
                              view's Announce tab (owner round-7 role gating). */}
                          <div className="flex items-center justify-between px-1">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <BrandGlyphIcon name="announcements" className="w-3 h-3" style={{ color: selectedBrand.primaryColor }} /> News & opportunities
                            </h3>
                          </div>

                          {combinedFeed.length > 0 ? (
                            combinedFeed.map((item: any) => {
                              const isExpanded = expandedAnnouncementId === item.id;
                              const isCareer = item.feedType === "career";

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setExpandedAnnouncementId(isExpanded ? null : item.id)}
                                  className="gs-glass cursor-pointer rounded-xl p-3 transition-all hover:-translate-y-0.5"
                                  style={item.pinned ? { borderLeft: `3px solid ${selectedBrand.primaryColor}` } : {}}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {isCareer ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0 rounded">
                                            <Briefcase className="w-2.5 h-2.5" /> Career
                                          </span>
                                        ) : (
                                          item.pinned && (
                                            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0 rounded">
                                              <Pin className="w-2.5 h-2.5" /> Pinned
                                            </span>
                                          )
                                        )}
                                        <h4 className="text-[13px] font-bold leading-tight text-slate-900">
                                          {item.title}
                                        </h4>
                                      </div>
                                      <span className="mt-0.5 block text-[11px] text-slate-400">
                                        {item.postedByName || item.authorName} · {item.postedByRole || item.authorRole}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 shrink-0">
                                      {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                    </span>
                                  </div>

                                  <div className={`text-[12px] text-slate-600 mt-1.5 leading-snug ${
                                    isExpanded ? "" : "line-clamp-2"
                                  }`}>
                                    {item.description || item.body}
                                  </div>

                                  {/* Expanded Career Details in Feed */}
                                  {isCareer && isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-[12px] text-slate-500" onClick={(e) => e.stopPropagation()}>
                                      {item.requirements && (
                                        <div>
                                          <span className="font-bold text-slate-800 uppercase text-[11px] block mb-0.5">Qualifications</span>
                                          <p>{item.requirements}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2 text-[12px]">
                                        <div><strong>Company:</strong> {item.company}</div>
                                        {item.salary && <div><strong>Salary:</strong> {item.salary}</div>}
                                        {item.location && <div className="col-span-2"><strong>Location:</strong> {item.location}</div>}
                                      </div>
                                      
                                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                        <span className="font-bold text-slate-600 uppercase text-[11px] block">Referral Contacts</span>
                                        <p className="text-slate-800 font-medium text-xs">{item.contactName}</p>
                                        <div className="flex flex-col gap-2 pt-1.5">
                                          <div className="flex gap-2 w-full">
                                            <a
                                              href={`mailto:${item.contactEmail}?subject=Referral Inquiry: ${item.title}`}
                                              className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-[11px] font-bold text-center flex items-center justify-center gap-1 transition"
                                            >
                                              <Mail className="w-3 h-3 text-slate-500" /> Email Referrer
                                            </a>
                                            {item.contactPhone && (
                                              <a
                                                href={`tel:${item.contactPhone}`}
                                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition shrink-0"
                                              >
                                                <Phone className="w-3 h-3" />
                                              </a>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              ctx.setQuickApplyJob(item);
                                            }}
                                            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold text-center flex items-center justify-center gap-1 transition shadow-sm"
                                          >
                                            <Briefcase className="w-3 h-3" /> Quick Apply
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-end text-[11px] text-slate-400 mt-1">
                                    <span className="flex items-center gap-0.5">
                                      {isExpanded ? "Less" : "More"} <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-8 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400 shadow-sm">
                              No feed updates available.
                            </div>
                          )}
                        </div>
                      </div>
                    );
}
