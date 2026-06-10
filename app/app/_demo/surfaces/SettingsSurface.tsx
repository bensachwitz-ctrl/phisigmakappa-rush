import React from "react";
import { School, User, LogOut, Crown, KeyRound, Trash2 } from "lucide-react";
import type { DemoContext } from "../context";

export function renderSettingsTab(ctx: DemoContext) {
  const {
    dashboardData,
    email,
    handleRemoveMobileMember,
    handleSendMobileResetLink,
    handleSignOut,
    role,
    selectedBrand,
    selectedTenant,
    setConfirmModal,
    setShowAddMemberModal,
    setShowEditProfileModal,
  } = ctx;
  // Render-gated by the orchestrator inside `{token && selectedTenant && ...}`;
  // this guard only restores the type narrowing the enclosing block provided.
  if (!selectedTenant) return null;
  return (
                      <div className="space-y-4 text-left">
                        {/* User Card */}
                        {/* User Card */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2 shadow-sm">
                          <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg text-white border-2"
                            style={{ backgroundColor: selectedBrand.primaryColor, borderColor: selectedBrand.primaryColor + '50' }}
                          >
                            {dashboardData?.profile?.name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2) || "U"}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{dashboardData?.profile?.name}</h4>
                            <p className="text-[10px] text-slate-500">{dashboardData?.profile?.email}</p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <span 
                              className="text-[9px] px-2.5 py-0.5 rounded border font-semibold uppercase tracking-wider"
                              style={{ backgroundColor: selectedBrand.primaryColor + '10', borderColor: selectedBrand.primaryColor + '20', color: selectedBrand.primaryColor }}
                            >
                              {role} Account
                            </span>
                            <button
                              onClick={() => setShowEditProfileModal(true)}
                              className="text-[9px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded border border-slate-200 transition"
                            >
                              Edit Profile
                            </button>
                          </div>
                        </div>

                        {/* Roster details list */}
                        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-sm">
                          <div className="p-3.5 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Chapter Tenant</span>
                            <span className="font-semibold text-slate-800">{selectedTenant.name}</span>
                          </div>
                          <div className="p-3.5 flex items-center justify-between text-xs">
                            <span className="text-slate-500">School</span>
                            <span className="font-semibold text-slate-800">{selectedTenant.school}</span>
                          </div>
                          {role === "brother" && (
                            <>
                              <div className="p-3.5 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Pledge Class</span>
                                <span className="font-semibold text-slate-800">{dashboardData?.profile?.pledgeClass || "Not specified"}</span>
                              </div>
                              <div className="p-3.5 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Academic Standing</span>
                                <span className="font-semibold text-slate-800">{dashboardData?.profile?.status || "ACTIVE"}</span>
                              </div>
                            </>
                          )}
                          {role === "alumni" && (
                            <>
                              <div className="p-3.5 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Graduation Year</span>
                                <span className="font-semibold text-slate-800">{dashboardData?.profile?.graduationYear}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* PRESIDENTIAL ADMINISTRATION CONSOLE */}
                        {role === "brother" && (dashboardData?.profile?.position === "President" || dashboardData?.profile?.name === "Alex Mercer") && (
                          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-1.5">
                                <Crown className="w-4 h-4 text-amber-500" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Presidential Admin</h4>
                              </div>
                              <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="text-[9px] font-bold text-white px-2.5 py-1 rounded-lg transition active:scale-95"
                                style={{ backgroundColor: selectedBrand.primaryColor }}
                              >
                                + Add Member
                              </button>
                            </div>
                            
                            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                              {/* Actives */}
                              <div className="space-y-1.5">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Actives ({dashboardData?.roster?.actives?.length || 0})</span>
                                {(dashboardData?.roster?.actives || []).map((b: any) => (
                                  <div key={b.id} className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 text-[10px]">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">{b.name}</p>
                                      <p className="text-[8px] text-slate-505 truncate">{b.email || "No email"}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleSendMobileResetLink(b.email, b.name)}
                                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                        title="Send Reset Link"
                                      >
                                        <KeyRound className="w-3.5 h-3.5" />
                                      </button>
                                      {b.id !== "demo-brother-id" && (
                                        <button
                                          onClick={() => handleRemoveMobileMember(b.id, b.name, "actives")}
                                          className="p-1.5 hover:bg-red-50 text-red-505 rounded-lg transition"
                                          title="Remove Member"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Alumni */}
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Alumni ({dashboardData?.roster?.alumni?.length || 0})</span>
                                {(dashboardData?.roster?.alumni || []).map((al: any) => (
                                  <div key={al.id} className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 text-[10px]">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">{al.name}</p>
                                      <p className="text-[8px] text-slate-505 truncate">{al.email || "No email"}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleSendMobileResetLink(al.email, al.name)}
                                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                        title="Send Reset Link"
                                      >
                                        <KeyRound className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveMobileMember(al.id, al.name, "alumni")}
                                        className="p-1.5 hover:bg-red-50 text-red-505 rounded-lg transition"
                                        title="Remove Member"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                title: "Switch Chapter?",
                                message: "Are you sure you want to return to the Greekstack Chapter Selector?",
                                onConfirm: () => handleSignOut()
                              });
                            }}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                          >
                            <School className="w-4 h-4 text-slate-500" /> Switch Chapter Organization
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModal({
                                title: "Logout?",
                                message: "Are you sure you want to sign out of your account?",
                                onConfirm: () => handleSignOut()
                              });
                            }}
                            className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                          >
                            <LogOut className="w-4 h-4 text-red-500" /> Logout Securely
                          </button>
                        </div>
                      </div>
                    );
}
