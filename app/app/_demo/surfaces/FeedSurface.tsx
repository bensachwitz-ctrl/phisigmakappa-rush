import React from "react";
import { Bell, ChevronDown, Pin, Sparkles, Mail, Phone, Briefcase, Vote, PieChart, QrCode, Gift, Palette } from "lucide-react";
import type { DemoContext } from "../context";

export function renderFeedTab(ctx: DemoContext) {
  const {
    combinedFeed,
    dashboardData,
    expandedAnnouncementId,
    role,
    selectedBrand,
    setDonationDone,
    setExpandedAnnouncementId,
    setShowPostAnnModal,
    setSpotlight,
    spotlight,
  } = ctx;
  return (
                      <div className="space-y-4">
                        {/* Welcome widget */}
                        <div 
                          className="border p-4 rounded-3xl relative overflow-hidden"
                          style={{ background: `linear-gradient(to right, ${selectedBrand.primaryColor}12, ${selectedBrand.primaryColor}06, #ffffff)`, borderColor: `${selectedBrand.primaryColor}20` }}
                        >
                          <h4 className="text-xs font-semibold text-slate-500">Welcome Back,</h4>
                          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                            {dashboardData?.profile?.name || "Member"}
                          </h2>
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedBrand.primaryColor }} />
                            {role === "brother" 
                              ? `${dashboardData?.profile?.position || "Active Member"} • ${dashboardData?.profile?.pledgeClass || "Brother"}` 
                              : `Class of ${dashboardData?.profile?.graduationYear || "Alumnus"}`
                            }
                          </p>

                          {role === "brother" && dashboardData?.standing && (
                            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Chapter Standing</span>
                                <div className="text-xs font-bold text-emerald-600 mt-0.5">{dashboardData.standing.standing}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Financials</span>
                                <div className={`text-xs font-bold mt-0.5 ${dashboardData.profile?.duesPaid ? "text-emerald-600" : "text-amber-600 font-bold"}`}>
                                  {dashboardData.profile?.duesPaid ? "Paid" : "Unpaid"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Quick tools — launchers for every other feature so the demo
                            showcases the WHOLE product, not just the 5 nav tabs. Each
                            opens a fully-interactive spotlight surface. */}
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1 mb-2">
                            <Sparkles className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> Chapter tools
                          </h3>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "elections" as const, label: "Elections", sub: "Secret ballot", Icon: Vote, show: role === "brother" },
                              { id: "treasury" as const, label: "Treasury", sub: "Budgets", Icon: PieChart, show: role === "brother" },
                              { id: "qr" as const, label: "QR check-in", sub: "Rush", Icon: QrCode, show: role === "brother" },
                              { id: "giving" as const, label: "Give", sub: "Donations", Icon: Gift, show: true },
                              { id: "theme" as const, label: "Branding", sub: "White-label", Icon: Palette, show: role === "brother" },
                            ].filter((t) => t.show).map(({ id, label, sub, Icon }) => (
                              <button
                                key={id}
                                onClick={() => { setSpotlight(id); if (id === "giving") setDonationDone(false); }}
                                className="p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col items-center gap-1 text-center transition active:scale-[0.97] hover:border-slate-200"
                              >
                                <span
                                  className="w-8 h-8 rounded-xl flex items-center justify-center border"
                                  style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '18', color: selectedBrand.primaryColor }}
                                >
                                  <Icon className="w-4 h-4" />
                                </span>
                                <span className="text-[9px] font-bold text-slate-800 leading-tight">{label}</span>
                                <span className="text-[7px] text-slate-400 uppercase tracking-wider leading-none">{sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Merged Timeline Feed */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <Bell className="w-3.5 h-3.5" style={{ color: selectedBrand.primaryColor }} /> News & Opportunity Feed
                            </h3>
                            {role === "brother" && (
                              <button
                                onClick={() => setShowPostAnnModal(true)}
                                className="px-2.5 py-1 text-[9px] font-bold text-white rounded-lg transition active:scale-95 flex items-center gap-1 shadow-sm"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                <Sparkles className="w-2.5 h-2.5" /> Post News
                              </button>
                            )}
                          </div>

                          {combinedFeed.length > 0 ? (
                            combinedFeed.map((item: any) => {
                              const isExpanded = expandedAnnouncementId === item.id;
                              const isCareer = item.feedType === "career";
                              
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setExpandedAnnouncementId(isExpanded ? null : item.id)}
                                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-sm ${
                                    item.pinned
                                      ? "border-amber-200"
                                      : "border-slate-100 hover:border-slate-200"
                                  }`}
                                  style={item.pinned ? { borderLeft: `4px solid ${selectedBrand.primaryColor}` } : {}}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {isCareer ? (
                                          <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded">
                                            <Briefcase className="w-2.5 h-2.5" /> Career Post
                                          </span>
                                        ) : (
                                          item.pinned && (
                                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded">
                                              <Pin className="w-2.5 h-2.5" /> Pinned
                                            </span>
                                          )
                                        )}
                                        <h4 className="text-xs font-bold text-slate-900">
                                          {isCareer ? item.title : item.title}
                                        </h4>
                                      </div>
                                      <span className="text-[9px] text-slate-400 block">
                                        Posted by {item.postedByName || item.authorName} ({item.postedByRole || item.authorRole})
                                      </span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 shrink-0">
                                      {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                    </span>
                                  </div>

                                  <div className={`text-[11px] text-slate-600 mt-2.5 leading-relaxed ${
                                    isExpanded ? "" : "line-clamp-2"
                                  }`}>
                                    {item.description || item.body}
                                  </div>

                                  {/* Expanded Career Details in Feed */}
                                  {isCareer && isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-[10px] text-slate-500" onClick={(e) => e.stopPropagation()}>
                                      {item.requirements && (
                                        <div>
                                          <span className="font-bold text-slate-800 uppercase text-[8px] block mb-0.5">Qualifications</span>
                                          <p>{item.requirements}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <div><strong>Company:</strong> {item.company}</div>
                                        {item.salary && <div><strong>Salary:</strong> {item.salary}</div>}
                                        {item.location && <div className="col-span-2"><strong>Location:</strong> {item.location}</div>}
                                      </div>
                                      
                                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                        <span className="font-bold text-slate-600 uppercase text-[8px] block">Referral Contacts</span>
                                        <p className="text-slate-800 font-medium text-xs">{item.contactName}</p>
                                        <div className="flex gap-2 pt-1.5">
                                          <a
                                            href={`mailto:${item.contactEmail}?subject=Referral Inquiry: ${item.title}`}
                                            className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-[9px] font-bold text-center flex items-center justify-center gap-1 transition"
                                          >
                                            <Mail className="w-3 h-3 text-slate-500" /> Email Referrer
                                          </a>
                                          {item.contactPhone && (
                                            <a
                                              href={`tel:${item.contactPhone}`}
                                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition"
                                            >
                                              <Phone className="w-3 h-3" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-end text-[9px] text-slate-400 mt-2">
                                    <span className="flex items-center gap-0.5">
                                      {isExpanded ? "Collapse" : "Expand"} <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
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
