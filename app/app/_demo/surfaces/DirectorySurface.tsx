import React from "react";
import { Search, ChevronDown, Mail, Phone, Briefcase, Building2 } from "lucide-react";
import type { DemoContext } from "../context";

export function renderDirectoryTab(ctx: DemoContext) {
  const {
    dashboardData,
    expandedJobId,
    rosterSearch,
    rosterTab,
    selectedBrand,
    setExpandedJobId,
    setRosterSearch,
    setRosterTab,
    setShowPostJobModal,
  } = ctx;
  return (
                      <div className="space-y-3 flex-1 flex flex-col overflow-hidden text-left">
                        
                        {/* Directory Switcher tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                          <button
                            onClick={() => { setRosterTab("actives"); setRosterSearch(""); }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                              rosterTab === "actives"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                               : "text-slate-500 hover:text-slate-950"
                            }`}
                          >
                            Actives
                          </button>
                          <button
                            onClick={() => { setRosterTab("alumni"); setRosterSearch(""); }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                              rosterTab === "alumni"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-950"
                            }`}
                          >
                            Alumni
                          </button>
                          <button
                            onClick={() => { setRosterTab("careers"); setRosterSearch(""); }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${
                              rosterTab === "careers"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-950"
                            }`}
                          >
                            Careers
                          </button>
                        </div>

                        {/* Search field */}
                        <div className="relative shrink-0">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={
                              rosterTab === "actives"
                                ? "Search actives..."
                                : rosterTab === "alumni"
                                ? "Search alumni network..."
                                : "Search jobs & internships..."
                            }
                            value={rosterSearch}
                            onChange={(e) => setRosterSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl focus:border-slate-300 outline-none text-xs text-slate-900 shadow-sm"
                          />
                        </div>

                        {/* Directory list area */}
                        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                          
                          {/* 1. Actives View */}
                          {rosterTab === "actives" && (
                            (() => {
                              const list = (dashboardData?.roster?.actives || []).filter((b: any) => {
                                const q = rosterSearch.toLowerCase();
                                return (
                                  b.name.toLowerCase().includes(q) ||
                                  (b.position && b.position.toLowerCase().includes(q)) ||
                                  (b.pledgeClass && b.pledgeClass.toLowerCase().includes(q))
                                );
                              });
                              
                              if (list.length === 0) {
                                return (
                                  <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 shadow-sm">
                                    No brothers found matching query.
                                  </div>
                                );
                              }

                              return list.map((b: any) => (
                                <div key={b.id} className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div 
                                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none border"
                                      style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                    >
                                      {b.name.split(" ").map((n: string) => n[0]).join("")}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-bold text-slate-900 truncate">{b.name}</h5>
                                      <span className="text-[9px] text-slate-500 truncate block">
                                        {b.position || `${b.year || "Undergrad"}`} • {b.pledgeClass || "Brother"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {b.email && (
                                      <a
                                        href={`mailto:${b.email}`}
                                        className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                                      >
                                        <Mail className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    {b.phone && (
                                      <a
                                        href={`tel:${b.phone}`}
                                        className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                                      >
                                        <Phone className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ));
                            })()
                          )}

                          {/* 2. Alumni View */}
                          {rosterTab === "alumni" && (
                            (() => {
                              const list = (dashboardData?.roster?.alumni || []).filter((al: any) => {
                                const q = rosterSearch.toLowerCase();
                                return (
                                  al.name.toLowerCase().includes(q) ||
                                  (al.employer && al.employer.toLowerCase().includes(q)) ||
                                  (al.jobTitle && al.jobTitle.toLowerCase().includes(q)) ||
                                  (al.city && al.city.toLowerCase().includes(q))
                                );
                              });

                              if (list.length === 0) {
                                return (
                                  <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 shadow-sm">
                                    No matching alumni found.
                                  </div>
                                );
                              }

                              return list.map((al: any) => (
                                <div key={al.id} className="p-3.5 bg-white rounded-2xl border border-slate-100 space-y-2.5 shadow-sm">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div 
                                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none border"
                                        style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '15', color: selectedBrand.primaryColor }}
                                      >
                                        {al.name.split(" ").map((n: string) => n[0]).join("")}
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="text-xs font-bold text-slate-900 truncate">{al.name}</h5>
                                        <span className="text-[9px] text-slate-500 block uppercase tracking-wider">
                                          Class of {al.graduationYear} • {al.pledgeClass || "Alum"}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {al.email && (
                                        <a
                                          href={`mailto:${al.email}`}
                                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      {al.phone && (
                                        <a
                                          href={`tel:${al.phone}`}
                                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                                        >
                                          <Phone className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {al.jobTitle && (
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl text-[10px] text-slate-700">
                                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="font-semibold text-slate-800 truncate max-w-[240px]">
                                        {al.jobTitle} at {al.employer || "Private Company"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ));
                            })()
                          )}

                          {/* 3. Careers Tab */}
                          {rosterTab === "careers" && (
                            <div className="space-y-3">
                              {/* Post Opp Button */}
                              <button
                                onClick={() => setShowPostJobModal(true)}
                                className="w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                <Briefcase className="w-3.5 h-3.5" /> Post Job / Internship Opening
                              </button>

                              {/* Careers List */}
                              {(() => {
                                const list = (dashboardData?.careers || []).filter((j: any) => {
                                  const q = rosterSearch.toLowerCase();
                                  return (
                                    j.title.toLowerCase().includes(q) ||
                                    j.company.toLowerCase().includes(q) ||
                                    (j.location && j.location.toLowerCase().includes(q))
                                  );
                                });

                                if (list.length === 0) {
                                  return (
                                    <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-xs text-slate-400 shadow-sm">
                                      No openings listed.
                                    </div>
                                  );
                                }

                                return list.map((j: any) => {
                                  const isExpanded = expandedJobId === j.id;
                                  return (
                                    <div
                                      key={j.id}
                                      onClick={() => setExpandedJobId(isExpanded ? null : j.id)}
                                      className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition shadow-sm cursor-pointer space-y-3"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-xs font-bold text-slate-900 leading-tight">{j.title}</span>
                                          </div>
                                          <span className="text-[10px] text-slate-500 mt-1 block">
                                            {j.company} • {j.location || "Remote"}
                                          </span>
                                        </div>

                                        {j.salary && (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded shrink-0">
                                            {j.salary}
                                          </span>
                                        )}
                                      </div>

                                      <p className={`text-[10px] text-slate-600 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                                        {j.description}
                                      </p>

                                      {isExpanded && (
                                        <div className="pt-3 border-t border-slate-100 space-y-3 text-[10px] text-slate-500 transition-all" onClick={(e) => e.stopPropagation()}>
                                          {j.requirements && (
                                            <div>
                                              <span className="font-bold text-slate-800 uppercase text-[8px] block mb-0.5">Requirements</span>
                                              <p className="leading-relaxed">{j.requirements}</p>
                                            </div>
                                          )}

                                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                            <span className="font-bold text-slate-500 uppercase text-[8px] block">Referral Referral Contacts</span>
                                            <p className="text-slate-800 font-semibold text-xs">{j.contactName} ({j.postedByRole === "alumni" ? "Alumnus" : "Brother"})</p>
                                            
                                            <div className="flex gap-2 pt-1.5">
                                              <a
                                                href={`mailto:${j.contactEmail}?subject=Greekstack Career: ${j.title}`}
                                                className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[9px] font-bold text-center text-slate-800 flex items-center justify-center gap-1 transition shadow-sm"
                                              >
                                                <Mail className="w-3 h-3 text-slate-500" /> Email Referrer
                                              </a>
                                              {j.contactPhone && (
                                                <a
                                                  href={`tel:${j.contactPhone}`}
                                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition shadow-sm"
                                                >
                                                  <Phone className="w-3 h-3" />
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-50">
                                        <span>Shared by {j.postedByName}</span>
                                        <span className="flex items-center gap-0.5">
                                          {isExpanded ? "Collapse Details" : "View Details"} <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                        </span>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}

                        </div>
                      </div>
                    );
}
