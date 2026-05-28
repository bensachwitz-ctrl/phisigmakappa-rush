"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  GraduationCap, 
  MapPin, 
  CheckCircle, 
  Calendar, 
  Vote, 
  Search,
  Check,
  Building,
  User,
  LogOut,
  Mail,
  Phone,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  BookOpen,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicFooter } from "@/components/site/footer";

interface Alumnus {
  id: string;
  fullName: string;
  preferredName: string | null;
  graduationYear: number;
  pledgeClass: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  employer: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  bio: string | null;
}

interface Brother {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  year: string | null;
  major: string | null;
  position: string | null;
  pledgeClass: string | null;
  headshotUrl: string | null;
}

interface PNM {
  id: string;
  name: string;
  email: string;
  phone: string;
  hometown: string | null;
  major: string | null;
  year: string | null;
}

interface Vouch {
  id: string;
  rushId: string;
  alumniId: string;
  note: string | null;
}

interface Poll {
  id: string;
  question: string;
  options: string; // JSON string
  closedAt: Date | null;
  closesAt: Date | null;
  votes: {
    id: string;
    brotherId: string | null;
    alumniId: string | null;
    optionId: string;
  }[];
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  dressCode: string | null;
  startsAt: string;
  endsAt: string | null;
  category: string;
}

interface Donation {
  id: string;
  amountCents: number;
  campaign: string | null;
  recordedAt: string;
  status: string;
  notes: string | null;
}

interface DashboardClientProps {
  alumni: Alumnus;
  brothers: Brother[];
  alumniNetwork: Alumnus[];
  allPnms: PNM[];
  vouches: Vouch[];
  polls: Poll[];
  events: Event[];
  donations: Donation[];
  isAdmin: boolean;
}

export default function DashboardClient({
  alumni,
  brothers,
  alumniNetwork,
  allPnms,
  vouches,
  polls,
  events,
  donations,
  isAdmin,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Search states
  const [brotherSearch, setBrotherSearch] = useState("");
  const [alumniSearch, setAlumniSearch] = useState("");
  const [pnmSearch, setPnmSearch] = useState("");

  // Vouching states
  const [vouchList, setVouchList] = useState<Vouch[]>(vouches);
  const [vouchingPnm, setVouchingPnm] = useState<PNM | null>(null);
  const [vouchNote, setVouchNote] = useState("");
  const [submittingVouch, setSubmittingVouch] = useState(false);

  // Poll voting states
  const [pollList, setPollList] = useState<Poll[]>(polls);
  const [votingOnPollId, setVotingOnPollId] = useState<string | null>(null);

  // Donation states
  const [donationAmount, setDonationAmount] = useState("100");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [campaignFund, setCampaignFund] = useState("General");
  const [donationNote, setDonationNote] = useState("");
  const [submittingDonation, setSubmittingDonation] = useState(false);

  // Logout handler
  const handleLogout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal");
    router.refresh();
  };

  // Filter lists
  const filteredBrothers = brothers.filter(b => 
    b.name.toLowerCase().includes(brotherSearch.toLowerCase()) ||
    (b.position && b.position.toLowerCase().includes(brotherSearch.toLowerCase())) ||
    (b.pledgeClass && b.pledgeClass.toLowerCase().includes(brotherSearch.toLowerCase()))
  );

  const filteredAlumni = alumniNetwork.filter(a => 
    a.fullName.toLowerCase().includes(alumniSearch.toLowerCase()) ||
    (a.employer && a.employer.toLowerCase().includes(alumniSearch.toLowerCase())) ||
    (a.city && a.city.toLowerCase().includes(alumniSearch.toLowerCase())) ||
    (a.state && a.state.toLowerCase().includes(alumniSearch.toLowerCase()))
  );

  // Hometown matches
  const hometownPnms = allPnms.filter(p => {
    if (!p.hometown) return false;
    const home = p.hometown.toLowerCase();
    const city = alumni.city?.toLowerCase() || "";
    const state = alumni.state?.toLowerCase() || "";
    return (city && home.includes(city)) || (state && home.includes(state));
  });

  const filteredPnms = allPnms.filter(p => 
    p.name.toLowerCase().includes(pnmSearch.toLowerCase()) ||
    (p.hometown && p.hometown.toLowerCase().includes(pnmSearch.toLowerCase())) ||
    (p.major && p.major.toLowerCase().includes(pnmSearch.toLowerCase()))
  );

  // Vouch Handlers
  const openVouchModal = (pnm: PNM) => {
    const existing = vouchList.find(v => v.rushId === pnm.id);
    setVouchingPnm(pnm);
    setVouchNote(existing?.note || "");
  };

  const handleSaveVouch = async () => {
    if (!vouchingPnm) return;
    setSubmittingVouch(true);

    try {
      const res = await fetch("/api/alumni/vouch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rushId: vouchingPnm.id, note: vouchNote }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setVouchList(prev => {
          const filtered = prev.filter(v => v.rushId !== vouchingPnm.id);
          return [...filtered, data.vouch];
        });
        setVouchingPnm(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingVouch(false);
    }
  };

  const handleRevokeVouch = async (rushId: string) => {
    if (!confirm("Are you sure you want to revoke this vouch?")) return;

    try {
      const res = await fetch("/api/alumni/vouch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rushId }),
      });

      if (res.ok) {
        setVouchList(prev => prev.filter(v => v.rushId !== rushId));
        if (vouchingPnm?.id === rushId) {
          setVouchingPnm(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Poll Vote Handler
  const handleVote = async (pollId: string, optionId: string) => {
    setVotingOnPollId(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPollList(prev => prev.map(p => {
          if (p.id !== pollId) return p;
          // Replace or insert vote in local list
          const votes = p.votes.filter(v => v.alumniId !== alumni.id);
          return {
            ...p,
            votes: [...votes, { id: "temp", brotherId: null, alumniId: alumni.id, optionId }],
          };
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVotingOnPollId(null);
    }
  };

  const handleDonationCheckout = async () => {
    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount < 5) {
      alert("Please enter a valid amount of at least $5.00");
      return;
    }

    setSubmittingDonation(true);
    try {
      const res = await fetch("/api/alumni/donate/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alumniId: alumni.id,
          amountCents: Math.round(amount * 100),
          campaign: campaignFund,
          notes: donationNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create donation session.");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setSubmittingDonation(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-between">
      <div>
        {/* Top Header / Portal Banner */}
        <header className="bg-white border-b border-maroon-100 px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-cream-50 flex items-center justify-center font-bold shadow-sm">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-maroon-900 leading-tight">Alumni Network Portal</h1>
                <p className="text-xs text-maroon-600">Welcome, Brother {alumni.fullName}</p>
              </div>
            </div>

            {isAdmin && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Override Active
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 hover:text-maroon-900 border border-maroon-100 rounded-lg px-3 py-1.5 hover:bg-cream-50 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Inner Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide border-b border-maroon-100 pb-3 mb-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: "overview", label: "Overview", icon: Users },
              { id: "pnms", label: "Hometown PNMs", icon: MapPin },
              { id: "brothers", label: "Active Brothers", icon: Users },
              { id: "alumni", label: "Alumni Directory", icon: GraduationCap },
              { id: "polls", label: "Surveys & Polls", icon: Vote },
              { id: "events", label: "Events Calendar", icon: Calendar },
              { id: "donate", label: "Donate & Support", icon: Heart },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap shrink-0 min-h-[44px] ${
                    active 
                      ? "bg-maroon-800 text-cream-50 shadow" 
                      : "text-maroon-700 hover:bg-white hover:text-maroon-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENTS */}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-maroon-900 mb-3">Welcome to the Alumni Portal</h2>
                  <p className="text-sm text-maroon-700 leading-relaxed mb-4">
                    As an alumnus of Phi Sigma Kappa, your involvement is crucial to our chapter&apos;s growth. 
                    Through this portal, you can connect with undergraduate brothers, review local PNMs, vote on 
                    active alumni polls, and coordinate for homecoming events.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-cream-50 rounded-xl border border-maroon-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 block mb-1">Your Location</span>
                      <p className="text-sm font-bold text-maroon-900">
                        {alumni.city && alumni.state ? `${alumni.city}, ${alumni.state}` : "Not specified"}
                      </p>
                      <button 
                        onClick={() => setActiveTab("pnms")} 
                        className="text-xs font-semibold text-maroon-700 hover:text-maroon-900 mt-2 block underline"
                      >
                        Change settings & find PNMs &rarr;
                      </button>
                    </div>

                    <div className="p-4 bg-cream-50 rounded-xl border border-maroon-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 block mb-1">Your Vouches</span>
                      <p className="text-sm font-bold text-maroon-900">{vouchList.length} Active {vouchList.length === 1 ? "Vouch" : "Vouches"}</p>
                      <button 
                        onClick={() => setActiveTab("pnms")} 
                        className="text-xs font-semibold text-maroon-700 hover:text-maroon-900 mt-2 block underline"
                      >
                        Manage vouches &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-maroon-900 mb-4">Quick Stats & Insights</h2>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                    <div className="p-3 bg-cream-50/50 rounded-xl border border-maroon-50">
                      <p className="text-2xl font-black text-maroon-800">{brothers.length}</p>
                      <p className="text-xs text-maroon-600 font-medium">Actives</p>
                    </div>
                    <div className="p-3 bg-cream-50/50 rounded-xl border border-maroon-50">
                      <p className="text-2xl font-black text-maroon-800">{alumniNetwork.length}</p>
                      <p className="text-xs text-maroon-600 font-medium">Alumni</p>
                    </div>
                    <div className="p-3 bg-cream-50/50 rounded-xl border border-maroon-50">
                      <p className="text-2xl font-black text-maroon-800">{allPnms.length}</p>
                      <p className="text-xs text-maroon-600 font-medium">PNMs in Rush</p>
                    </div>
                  </div>
                </div>

                {/* DONATION HISTORY */}
                <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-maroon-900 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-amber-600 fill-amber-600/10" />
                    Your Donation History
                  </h2>
                  {donations && donations.length > 0 ? (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {donations.map((d) => (
                        <div key={d.id} className="flex justify-between items-center p-3 rounded-xl border border-maroon-50 bg-cream-50/20 text-sm">
                          <div>
                            <p className="font-bold text-maroon-900">{d.campaign || "General Donation"}</p>
                            <p className="text-[10px] text-maroon-500">
                              {new Date(d.recordedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                              {d.notes ? ` · ${d.notes}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-maroon-800">${(d.amountCents / 100).toFixed(2)}</span>
                            <span className={`block text-[9px] font-bold uppercase tracking-wider ${
                              d.status === "PAID" ? "text-emerald-600" : "text-amber-600"
                            }`}>
                              {d.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-cream-50/30 rounded-xl border border-maroon-50/60 border-dashed">
                      <p className="text-xs text-maroon-600 mb-2">No donations recorded yet.</p>
                      <button 
                        onClick={() => setActiveTab("donate")} 
                        className="inline-flex items-center gap-1 text-xs font-bold text-maroon-800 hover:text-maroon-950 underline"
                      >
                        Make your first donation &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-maroon-800 to-maroon-950 text-cream-50 rounded-2xl p-6 shadow-md">
                  <h3 className="text-base font-bold mb-2">Next Chapter Event</h3>
                  {events.length > 0 ? (
                    <div>
                      <h4 className="text-lg font-bold text-amber-300">{events[0].name}</h4>
                      <p className="text-xs text-cream-200/80 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(events[0].startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {events[0].location && (
                        <p className="text-xs text-cream-200/80 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {events[0].location}
                        </p>
                      )}
                      <button 
                        onClick={() => setActiveTab("events")} 
                        className="w-full bg-amber-500 hover:bg-amber-600 text-maroon-950 font-bold text-xs py-2 rounded-lg mt-4 transition"
                      >
                        View Calendar
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-cream-200/60">No upcoming alumni events scheduled.</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-maroon-100 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-maroon-900 mb-3 flex items-center gap-1.5">
                    <Vote className="w-4 h-4 text-amber-600" />
                    Quick Survey
                  </h3>
                  {pollList.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-maroon-800 mb-2">{pollList[0].question}</p>
                      <button 
                        onClick={() => setActiveTab("polls")} 
                        className="text-xs font-semibold text-maroon-600 hover:text-maroon-900 underline block"
                      >
                        Participate in Polls &rarr;
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-maroon-600">No active polls.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HOMETOWN PNMS TAB */}
          {activeTab === "pnms" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-maroon-900 mb-1">Hometown PNM Matching</h2>
                <p className="text-sm text-maroon-700">
                  Actively match Potential New Members (PNMs) whose hometown is near your current location (<strong>{alumni.city || "N/A"}, {alumni.state || "N/A"}</strong>). 
                  If you know a candidate, click <strong>Vouch</strong> to leave a character note.
                </p>
              </div>

              {/* Recommended list based on City/State */}
              <div>
                <h3 className="text-base font-bold text-maroon-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  Recommended candidates from {alumni.city || alumni.state || "your area"} ({hometownPnms.length})
                </h3>
                {hometownPnms.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {hometownPnms.map(pnm => {
                      const isVouched = vouchList.some(v => v.rushId === pnm.id);
                      const vouch = vouchList.find(v => v.rushId === pnm.id);
                      return (
                        <div key={pnm.id} className="bg-white rounded-xl border border-maroon-100 p-4 shadow-sm flex flex-col justify-between hover:border-amber-400 transition">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-maroon-900">{pnm.name}</span>
                              {isVouched && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                                  <Check className="w-3 h-3" />
                                  Vouched
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-maroon-700 flex items-center gap-1 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-maroon-400" />
                              Hometown: {pnm.hometown || "Unknown"}
                            </p>
                            {pnm.major && (
                              <p className="text-xs text-maroon-700 flex items-center gap-1 mt-1">
                                <BookOpen className="w-3.5 h-3.5 text-maroon-400" />
                                Major: {pnm.major}
                              </p>
                            )}
                            {isVouched && vouch?.note && (
                              <div className="mt-3 p-2 bg-cream-50 rounded-lg border border-maroon-50 text-[11px] text-maroon-700 italic">
                                &ldquo;{vouch.note}&rdquo;
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t border-maroon-50">
                            <button
                              onClick={() => openVouchModal(pnm)}
                              className="flex-1 text-center bg-maroon-800 hover:bg-maroon-900 text-cream-50 text-xs font-semibold py-1.5 rounded-lg transition"
                            >
                              {isVouched ? "Edit Note" : "Vouch"}
                            </button>
                            {isVouched && (
                              <button
                                onClick={() => handleRevokeVouch(pnm.id)}
                                className="px-2 text-center border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold py-1.5 rounded-lg transition"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-cream-100/50 rounded-xl border border-maroon-50 border-dashed p-6 text-center text-sm text-maroon-600">
                    No active PNMs found from your current city or state.
                  </div>
                )}
              </div>

              {/* General Search & Vouch */}
              <div className="pt-4">
                <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-maroon-900 mb-3">Search all active PNMs</h3>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                    <input
                      type="text"
                      placeholder="Search by name, hometown, or major..."
                      value={pnmSearch}
                      onChange={(e) => setPnmSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                    />
                  </div>

                  <div className="max-h-[350px] overflow-y-auto divide-y divide-maroon-100">
                    {filteredPnms.length > 0 ? (
                      filteredPnms.map(pnm => {
                        const isVouched = vouchList.some(v => v.rushId === pnm.id);
                        return (
                          <div key={pnm.id} className="py-3 flex items-center justify-between text-sm">
                            <div>
                              <div className="font-bold text-maroon-900 flex items-center gap-2">
                                {pnm.name}
                                {isVouched && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">
                                    <Check className="w-2.5 h-2.5" />
                                    Vouched
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-maroon-600">{pnm.hometown || "Unknown"} • {pnm.major || "No Major"}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openVouchModal(pnm)}
                                className="bg-maroon-700 hover:bg-maroon-800 text-cream-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                              >
                                {isVouched ? "Edit Note" : "Vouch"}
                              </button>
                              {isVouched && (
                                <button
                                  onClick={() => handleRevokeVouch(pnm.id)}
                                  className="border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold px-2 py-1.5 rounded-lg transition"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center py-4 text-xs text-maroon-500">No PNMs found matching your query.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE BROTHERS TAB */}
          {activeTab === "brothers" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-maroon-900 mb-3">Undergraduate Active Roster</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                  <input
                    type="text"
                    placeholder="Search by name, position, or class..."
                    value={brotherSearch}
                    onChange={(e) => setBrotherSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filteredBrothers.length > 0 ? (
                  filteredBrothers.map(b => (
                    <div key={b.id} className="bg-white rounded-2xl border border-maroon-100 p-4 shadow-sm flex items-start gap-4 hover:border-amber-300 transition">
                      <div className="w-12 h-12 rounded-xl bg-cream-100 overflow-hidden shrink-0 flex items-center justify-center border border-maroon-50">
                        {b.headshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.headshotUrl} alt={b.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-maroon-400" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-maroon-900 text-sm leading-snug">{b.name}</h3>
                        {b.position && (
                          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">{b.position}</p>
                        )}
                        <p className="text-[11px] text-maroon-700">
                          {b.year || "Undergrad"} • {b.pledgeClass || "Brother"}
                        </p>
                        {b.major && (
                          <p className="text-[11px] text-maroon-600 italic">Major: {b.major}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center text-sm text-maroon-500">
                    No active brothers found matching your search.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALUMNI DIRECTORY TAB */}
          {activeTab === "alumni" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-maroon-900 mb-3">Alumni Directory & Network</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                  <input
                    type="text"
                    placeholder="Search by name, company, city, or state..."
                    value={alumniSearch}
                    onChange={(e) => setAlumniSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filteredAlumni.length > 0 ? (
                  filteredAlumni.map(a => (
                    <div key={a.id} className="bg-white rounded-2xl border border-maroon-100 p-5 shadow-sm hover:border-amber-300 transition flex flex-col justify-between">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-bold text-maroon-900 text-base">{a.fullName}</h3>
                          <p className="text-xs text-amber-800 font-bold uppercase tracking-wide">Class of {a.graduationYear}</p>
                        </div>

                        {a.jobTitle || a.employer ? (
                          <p className="text-xs text-maroon-700 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-maroon-400 shrink-0" />
                            {a.jobTitle || "Employed"} at {a.employer || "Unknown"}
                          </p>
                        ) : null}

                        {a.city || a.state ? (
                          <p className="text-xs text-maroon-700 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-maroon-400 shrink-0" />
                            {a.city || ""}{a.city && a.state ? ", " : ""}{a.state || ""}
                          </p>
                        ) : null}

                        {a.bio && (
                          <p className="text-xs text-maroon-600 line-clamp-2 mt-1 italic border-l-2 border-amber-300 pl-2">
                            &ldquo;{a.bio}&rdquo;
                          </p>
                        )}
                      </div>

                      {a.email || a.linkedinUrl ? (
                        <div className="flex gap-2 mt-4 pt-3 border-t border-maroon-50 text-[11px]">
                          {a.email && (
                            <a href={`mailto:${a.email}`} className="text-maroon-700 hover:text-maroon-900 underline font-semibold flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Email
                            </a>
                          )}
                          {a.linkedinUrl && (
                            <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-maroon-700 hover:text-maroon-900 underline font-semibold flex items-center gap-1">
                              <ChevronRight className="w-3 h-3" />
                              LinkedIn
                            </a>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center text-sm text-maroon-500">
                    No alumni found matching your query.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SURVEYS & POLLS TAB */}
          {activeTab === "polls" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-maroon-900 mb-2">Alumni Opinion Polls</h2>
                <p className="text-sm text-maroon-700">
                  Participate in voting for critical chapter matters, homecoming plans, and general feedback.
                </p>
              </div>

              <div className="space-y-4">
                {pollList.length > 0 ? (
                  pollList.map(poll => {
                    const parsedOptions = JSON.parse(poll.options) as { id: string, label: string }[];
                    const totalVotes = poll.votes.length;

                    // Find if current alumnus voted
                    const myVote = poll.votes.find(v => v.alumniId === alumni.id);

                    return (
                      <div key={poll.id} className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-maroon-900 mb-4">{poll.question}</h3>
                        
                        <div className="space-y-3">
                          {parsedOptions.map(opt => {
                            const optionVotes = poll.votes.filter(v => v.optionId === opt.id).length;
                            const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                            const isMyChoice = myVote?.optionId === opt.id;

                            return (
                              <div key={opt.id} className="relative">
                                {myVote ? (
                                  // Voted view: show results
                                  <div className="flex items-center justify-between p-3 rounded-xl border border-maroon-100 bg-cream-50/30 overflow-hidden relative">
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 bg-maroon-100/50 z-0 transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    />
                                    <span className="text-sm font-semibold z-10 flex items-center gap-1.5">
                                      {opt.label}
                                      {isMyChoice && (
                                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                      )}
                                    </span>
                                    <span className="text-xs font-bold text-maroon-900 z-10">{optionVotes} votes ({percentage}%)</span>
                                  </div>
                                ) : (
                                  // Voting view: show vote buttons
                                  <button
                                    onClick={() => handleVote(poll.id, opt.id)}
                                    disabled={votingOnPollId === poll.id}
                                    className="w-full text-left p-3 rounded-xl border border-maroon-100 hover:border-amber-400 hover:bg-cream-50/50 text-sm font-semibold transition"
                                  >
                                    {opt.label}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 flex justify-between text-xs text-maroon-500 font-medium">
                          <span>{totalVotes} total {totalVotes === 1 ? "vote" : "votes"}</span>
                          {myVote && (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Your vote is recorded
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white rounded-2xl border border-maroon-100 p-8 text-center text-sm text-maroon-500">
                    No active polls for alumni at this time.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EVENTS CALENDAR TAB */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-maroon-900 mb-1">Alumni Calendar & Events</h2>
                <p className="text-sm text-maroon-700">
                  Stay updated on upcoming alumni networking dinners, tailgates, and homecoming weekends.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.length > 0 ? (
                  events.map(event => {
                    const parsedDate = new Date(event.startsAt);
                    const isRush = event.category === "RUSH";
                    const isAlumni = event.category === "ALUMNI" || event.category === "OTHER";

                    return (
                      <div key={event.id} className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm flex flex-col justify-between hover:border-amber-300 transition">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              isRush ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {event.category}
                            </span>
                            <span className="text-xs text-maroon-500 font-medium">
                              {parsedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-maroon-900 mb-2">{event.name}</h3>
                          
                          {event.description && (
                            <p className="text-sm text-maroon-700 mb-4 line-clamp-3 leading-relaxed">
                              {event.description}
                            </p>
                          )}

                          <div className="space-y-1.5 text-xs text-maroon-600">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-maroon-400" />
                              <strong>Time:</strong> {parsedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {event.location && (
                              <p className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-maroon-400" />
                                <strong>Location:</strong> {event.location}
                              </p>
                            )}
                            {event.dressCode && (
                              <p className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-maroon-400" />
                                <strong>Dress Code:</strong> {event.dressCode}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Calendar export options */}
                        <div className="mt-6 pt-4 border-t border-maroon-50 flex flex-wrap gap-2">
                          <a
                            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${parsedDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${parsedDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(event.description || "")}&location=${encodeURIComponent(event.location || "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center bg-cream-50 hover:bg-cream-100 text-maroon-900 border border-maroon-200 text-xs font-semibold py-2 rounded-lg transition min-w-0"
                          >
                            Add to Google Calendar
                          </a>
                          <a
                            href={`/api/events.ics?eventId=${event.id}`}
                            className="px-3 bg-cream-50 hover:bg-cream-100 text-maroon-900 border border-maroon-200 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center text-center"
                            title="Download ICS File"
                          >
                            Download ICS
                          </a>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full bg-white rounded-2xl border border-maroon-100 p-8 text-center text-sm text-maroon-500">
                    No upcoming events scheduled.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DONATE & SUPPORT TAB */}
          {activeTab === "donate" && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-maroon-900 mb-1">Donate &amp; Support Chapter</h2>
                <p className="text-sm text-maroon-700">
                  Your contributions directly support active brothers, academic scholarships, and physical house improvements. Stripe processing is secure, and we take a 5% platform fee on all online donations.
                </p>
              </div>

              {/* Donation Form */}
              <div className="bg-white rounded-2xl border border-maroon-100 p-6 shadow-sm space-y-6">
                <div>
                  <label className="block text-xs font-bold text-maroon-900 uppercase tracking-wider mb-2">1. Select Amount</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {[50, 100, 250, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setDonationAmount(amt.toString());
                          setIsCustomAmount(false);
                        }}
                        className={`py-2 rounded-xl text-sm font-bold border transition ${
                          donationAmount === amt.toString() && !isCustomAmount
                            ? "bg-maroon-800 text-cream-50 border-transparent shadow"
                            : "bg-cream-50 text-maroon-900 border-maroon-100/55 hover:border-maroon-300"
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-maroon-600 font-bold">$</span>
                    <input
                      type="number"
                      placeholder="Custom Amount"
                      value={isCustomAmount ? donationAmount : ""}
                      onChange={(e) => {
                        setDonationAmount(e.target.value);
                        setIsCustomAmount(true);
                      }}
                      className="w-full pl-7 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-maroon-900 uppercase tracking-wider mb-2">2. Select Campaign Fund</label>
                  <select
                    value={campaignFund}
                    onChange={(e) => setCampaignFund(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900 font-semibold"
                  >
                    <option value="General">General Fund</option>
                    <option value="Scholarship Fund">Scholarship Fund</option>
                    <option value="Housing Renovation">Housing Renovation</option>
                    <option value="Alumni Weekend">Alumni Weekend / Homecoming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-maroon-900 uppercase tracking-wider mb-2">3. Donation Note / Dedication (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. In memory of pledge class 1994, or general note..."
                    value={donationNote}
                    onChange={(e) => setDonationNote(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
                  />
                </div>

                <div className="bg-cream-50/50 rounded-xl border border-maroon-50 p-4 space-y-2 text-xs text-maroon-700">
                  <div className="flex justify-between">
                    <span>Donation Amount:</span>
                    <span className="font-bold">${Number(donationAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-maroon-100 pt-2 font-bold text-maroon-900">
                    <span>Total Charged:</span>
                    <span>${Number(donationAmount || 0).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submittingDonation || !donationAmount || Number(donationAmount) < 5}
                  onClick={handleDonationCheckout}
                  className="w-full bg-maroon-800 hover:bg-maroon-900 disabled:bg-maroon-800/50 text-cream-50 font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-2 font-semibold"
                >
                  {submittingDonation ? (
                    <span>Creating checkout...</span>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-current" />
                      Proceed to Secure Checkout
                    </>
                  )}
                </button>
                {Number(donationAmount) > 0 && Number(donationAmount) < 5 && (
                  <p className="text-[10px] text-red-600 text-center font-medium">Minimum donation is $5.00</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VOUCH MODAL */}
      {vouchingPnm && (
        <div className="fixed inset-0 bg-maroon-950/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-maroon-100 w-full sm:max-w-md p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-maroon-900">Vouch for {vouchingPnm.name}</h3>
              <p className="text-xs text-maroon-600">Provide a note explaining how you know this candidate and why they are a good fit.</p>
            </div>

            <textarea
              value={vouchNote}
              onChange={(e) => setVouchNote(e.target.value)}
              placeholder="e.g. Went to my high school, extremely hard worker, played soccer..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-sm text-maroon-900"
            />
            <p className="text-[10px] text-right text-maroon-500">{500 - vouchNote.length} characters remaining</p>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setVouchingPnm(null)}
                disabled={submittingVouch}
                className="w-1/2 bg-cream-100 hover:bg-cream-200 text-maroon-900 font-semibold border border-maroon-200 py-2 rounded-lg transition"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveVouch}
                disabled={submittingVouch}
                className="w-1/2 bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-semibold py-2 rounded-lg transition"
              >
                {submittingVouch ? "Saving..." : "Save Vouch"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
