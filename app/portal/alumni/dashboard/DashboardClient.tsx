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
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  ChevronRight,
  BookOpen,
  Heart,
  User,
  Briefcase,
  Linkedin,
  type LucideIcon,
  Plus,
  Award,
  X,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicFooter } from "@/components/site/footer";
import { useToast } from "@/components/ui/toast";
import { avatarSrc } from "@/lib/image-url";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  IllustrationWelcome,
  IllustrationCalendar,
  IllustrationInbox,
  IllustrationSearch,
  type IllustrationProps,
} from "@/components/brand/illustrations";

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
  optInDirectory?: boolean;
  optInNewsletter?: boolean;
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

/**
 * Browser-safe parse of a poll's JSON-stored options column. Returns [] on any
 * error so a single bad row can't crash the dashboard. (We can't import the
 * server lib/poll-options helper here — it pulls in node:crypto — so this is a
 * trimmed client-side twin of parsePollOptions.)
 */
function safeParseOptions(raw: string): { id: string; label: string }[] {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (o): o is { id: string; label: string } =>
          o &&
          typeof o === "object" &&
          typeof o.id === "string" &&
          typeof o.label === "string",
      )
      .map((o) => ({ id: o.id, label: o.label }));
  } catch {
    return [];
  }
}

/**
 * Designed empty-state for the alumni portal — a bespoke, on-brand SPOT
 * ILLUSTRATION (a small maroon-tinted scene that re-themes via currentColor)
 * with the section icon tucked into a soft maroon medallion badge, a headline,
 * and a sub. Matches the portal's cream/maroon identity (the platform <IconChip>
 * is indigo-toned and would clash here) and makes blank tabs feel friendly.
 *
 * NON-BREAKING: existing callers keep passing { icon, title, sub, className };
 * `illustration` is a new optional override (defaults to the welcome scene).
 * The illustration is decorative (aria-hidden) and reduced-motion-safe.
 */
function PortalEmpty({
  icon: Icon,
  illustration: Illustration = IllustrationWelcome,
  title,
  sub,
  className = "",
}: {
  icon: LucideIcon;
  illustration?: React.ComponentType<IllustrationProps>;
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}>
      <div className="relative text-maroon-700">
        <span aria-hidden className="absolute inset-0 -z-10 rounded-2xl bg-maroon-300/30 blur-2xl" />
        <Illustration className="h-24 w-28" aria-hidden="true" />
        <span className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-100 via-cream-100 to-cream-200 text-maroon-700 ring-1 ring-maroon-200/80 shadow-[0_8px_20px_-10px_rgba(74,17,29,0.45)]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-maroon-900">{title}</p>
        {sub && <p className="text-xs text-maroon-500 max-w-xs leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}

/** Deterministic initials from a full name (max 2 letters). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar with a maroon→cream initials-gradient fallback for member/alumni cards.
 * Shows the headshot when present; otherwise a tasteful gradient monogram — a
 * small touch that makes directory cards read as designed rather than generic.
 */
function InitialsAvatar({
  name,
  src,
  size = 48,
  rounded = "rounded-xl",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const dim = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarSrc(src, size * 2)}
        alt={name}
        style={dim}
        className={`${rounded} object-cover border border-maroon-100 ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={dim}
      className={`${rounded} inline-flex items-center justify-center bg-gradient-to-br from-maroon-700 via-maroon-600 to-maroon-800 text-cream-50 font-bold ring-1 ring-maroon-900/10 shadow-sm select-none ${className}`}
    >
      <span style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}>{initialsOf(name)}</span>
    </span>
  );
}

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  requirements: string | null;
  salary: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  postedById: string;
  postedByName: string;
  postedByRole: string;
  createdAt: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: {
    name: string;
    position: string | null;
  } | null;
  pollId?: string | null;
  poll?: {
    id: string;
    question: string;
    options: string;
    createdById: string;
    closesAt: string | null;
    closedAt: string | null;
    audience: string;
    createdAt: string;
    updatedAt: string;
    votes: {
      id: string;
      brotherId: string | null;
      alumniId: string | null;
      optionId: string;
    }[];
  } | null;
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
  jobPostings: JobPosting[];
  announcements: Announcement[];
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
  jobPostings,
  announcements,
  isAdmin,
}: DashboardClientProps) {
  const router = useRouter();
  const { push } = useToast();
  // Member-noun vocabulary (Brother/Sister/Member) for display copy. Route paths
  // stay /portal/* — only visible labels re-genders for sororities / pro orgs.
  const { fraternityName, terms } = useChapterIdentity();
  const [activeTab, setActiveTab] = useState("overview");

  // Confirm dialog state (replaces window.confirm) — mirrors the admin
  // meetings-client pattern: a designed Radix dialog instead of a raw browser
  // prompt. The action to run on confirm is captured in `onConfirm`.
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  function askConfirm(opts: NonNullable<typeof confirmState>) {
    setConfirmState(opts);
  }

  async function runConfirm() {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  // Search states
  const [brotherSearch, setBrotherSearch] = useState("");
  const [alumniSearch, setAlumniSearch] = useState("");
  const [pnmSearch, setPnmSearch] = useState("");

  // Career board states
  const [alumniTab, setAlumniTab] = useState("directory"); // "directory" or "careers"
  const [localJobPostings, setLocalJobPostings] = useState<JobPosting[]>(jobPostings || []);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobContactName, setJobContactName] = useState(alumni.fullName || "");
  const [jobContactEmail, setJobContactEmail] = useState(alumni.email || "");
  const [jobContactPhone, setJobContactPhone] = useState(alumni.phone || "");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [postJobError, setPostJobError] = useState<string | null>(null);
  const [postJobSuccess, setPostJobSuccess] = useState(false);
  const [submittingJob, setSubmittingJob] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobSearch, setJobSearch] = useState("");

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostJobError(null);
    setPostJobSuccess(false);
    setSubmittingJob(true);

    try {
      const res = await fetch("/api/portal/career/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          company: jobCompany,
          location: jobLocation,
          salary: jobSalary,
          contactName: jobContactName,
          contactEmail: jobContactEmail,
          contactPhone: jobContactPhone,
          description: jobDescription,
          requirements: jobRequirements,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setLocalJobPostings([data.job, ...localJobPostings]);
        setPostJobSuccess(true);
        setJobTitle("");
        setJobCompany("");
        setJobLocation("");
        setJobSalary("");
        setJobDescription("");
        setJobRequirements("");
        push({
          title: "Opportunity Shared",
          description: "Your internship or job opening has been shared on the active brother board.",
          variant: "success",
        } as any);
        setTimeout(() => {
          setShowPostJobModal(false);
          setPostJobSuccess(false);
        }, 1500);
      } else {
        setPostJobError(data.error || "Failed to submit job posting.");
      }
    } catch (err) {
      setPostJobError("Network error. Please try again.");
    } finally {
      setSubmittingJob(false);
    }
  };

  // Vouching states
  const [vouchList, setVouchList] = useState<Vouch[]>(vouches);
  const [vouchingPnm, setVouchingPnm] = useState<PNM | null>(null);
  const [vouchNote, setVouchNote] = useState("");
  const [submittingVouch, setSubmittingVouch] = useState(false);

  // Poll voting states
  const [pollList, setPollList] = useState<Poll[]>(polls);
  const [votingOnPollId, setVotingOnPollId] = useState<string | null>(null);

  // Announcements states
  const [announcementList, setAnnouncementList] = useState<Announcement[]>(announcements || []);
  const [activeAnnouncementId, setActiveAnnouncementId] = useState<string | null>(null);
  const activeAnnouncement = announcementList.find(a => a.id === activeAnnouncementId) || null;
  const setActiveAnnouncement = (ann: Announcement | null) => {
    setActiveAnnouncementId(ann ? ann.id : null);
  };

  // Donation states
  const [donationAmount, setDonationAmount] = useState("100");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [campaignFund, setCampaignFund] = useState("General");
  const [donationNote, setDonationNote] = useState("");
  const [submittingDonation, setSubmittingDonation] = useState(false);

  // Profile self-edit states. Seeded from the server-provided alumnus so the
  // form renders the alum's current values; identity fields (fullName,
  // graduationYear, pledgeClass, email) are display-only and NOT in this form —
  // the API likewise refuses to write them.
  const [alumProfile, setAlumProfile] = useState({
    fullName: alumni.fullName,
    graduationYear: alumni.graduationYear,
    pledgeClass: alumni.pledgeClass,
    email: alumni.email,
  });
  const [profileForm, setProfileForm] = useState({
    preferredName: alumni.preferredName || "",
    phone: alumni.phone || "",
    city: alumni.city || "",
    state: alumni.state || "",
    employer: alumni.employer || "",
    jobTitle: alumni.jobTitle || "",
    bio: alumni.bio || "",
    linkedinUrl: alumni.linkedinUrl || "",
    optInDirectory: alumni.optInDirectory ?? true,
    optInNewsletter: alumni.optInNewsletter ?? true,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Save profile changes — PATCH the alumni profile API. The API resolves WHO
  // is being edited from the session cookie, so we send only field values.
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);

    try {
      const res = await fetch("/api/portal/alumni/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredName: profileForm.preferredName.trim(),
          phone: profileForm.phone.trim(),
          city: profileForm.city.trim(),
          state: profileForm.state.trim(),
          employer: profileForm.employer.trim(),
          jobTitle: profileForm.jobTitle.trim(),
          bio: profileForm.bio.trim(),
          linkedinUrl: profileForm.linkedinUrl.trim(),
          optInDirectory: profileForm.optInDirectory,
          optInNewsletter: profileForm.optInNewsletter,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error || "Failed to save profile.";
        setProfileError(msg);
        push({ title: msg, variant: "destructive" });
      } else {
        // Reconcile local state from the fresh, persisted values the API returns.
        if (data.alumni) {
          setProfileForm((prev) => ({
            ...prev,
            preferredName: data.alumni.preferredName || "",
            phone: data.alumni.phone || "",
            city: data.alumni.city || "",
            state: data.alumni.state || "",
            employer: data.alumni.employer || "",
            jobTitle: data.alumni.jobTitle || "",
            bio: data.alumni.bio || "",
            linkedinUrl: data.alumni.linkedinUrl || "",
            optInDirectory: data.alumni.optInDirectory ?? prev.optInDirectory,
            optInNewsletter: data.alumni.optInNewsletter ?? prev.optInNewsletter,
          }));
          setAlumProfile((prev) => ({
            ...prev,
            fullName: data.alumni.fullName ?? prev.fullName,
            graduationYear: data.alumni.graduationYear ?? prev.graduationYear,
            pledgeClass: data.alumni.pledgeClass ?? prev.pledgeClass,
            email: data.alumni.email ?? prev.email,
          }));
        }
        setProfileSuccess("Profile updated successfully!");
        push({ title: "Profile updated", description: "Your changes are saved.", variant: "success" });
      }
    } catch {
      const msg = "A connection error occurred.";
      setProfileError(msg);
      push({ title: msg, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

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

  const handleRevokeVouch = (rushId: string) => {
    askConfirm({
      title: "Revoke this vouch?",
      description: "Your character note for this candidate will be removed. You can vouch again later.",
      confirmLabel: "Revoke Vouch",
      destructive: true,
      onConfirm: async () => {
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
      },
    });
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
          const votes = p.votes.filter(v => v.alumniId !== alumni.id);
          return {
            ...p,
            votes: [...votes, { id: data.vote?.id || "temp", brotherId: null, alumniId: alumni.id, optionId }],
          };
        }));
        setAnnouncementList((prev) =>
          prev.map((a) => {
            if (!a.poll || a.poll.id !== pollId) return a;
            const filteredVotes = a.poll.votes.filter((v) => v.alumniId !== alumni.id);
            return {
              ...a,
              poll: {
                ...a.poll,
                votes: [
                  ...filteredVotes,
                  { id: data.vote?.id || "temp", brotherId: null, alumniId: alumni.id, optionId },
                ],
              },
            };
          })
        );
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
      push({ title: "Please enter a valid amount of at least $5.00", variant: "destructive" });
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
        push({ title: "Failed to create donation session.", description: data.error || undefined, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      push({ title: "An unexpected error occurred.", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmittingDonation(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-between">
      <div>
        {/* Top Header / Portal Banner */}
        <header className="bg-white/85 backdrop-blur-xl border-b border-maroon-100 px-4 sm:px-6 py-4 shadow-[0_4px_20px_-12px_rgba(74,17,29,0.25)] sticky top-0 z-20">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-amber-400/40 blur-lg" />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-cream-50 flex items-center justify-center font-bold shadow-[0_6px_16px_-6px_rgba(217,119,6,0.6)] ring-1 ring-amber-700/20">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-maroon-900 leading-tight">Alumni Network Portal</h1>
                <p className="text-xs text-maroon-600">Welcome, {terms.member} {alumni.fullName}</p>
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
              { id: "profile", label: "My Profile", icon: User },
              { id: "pnms", label: "Hometown PNMs", icon: MapPin },
              { id: "brothers", label: `Active ${terms.members}`, icon: Users },
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
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500/40 ${
                    active
                      ? "bg-gradient-to-b from-maroon-700 to-maroon-900 text-cream-50 shadow-[0_6px_16px_-6px_rgba(74,17,29,0.6)] ring-1 ring-maroon-900/20"
                      : "text-maroon-700 hover:bg-white hover:text-maroon-900 hover:shadow-sm hover:-translate-y-px"
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
                <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
                  <h2 className="text-xl font-bold text-maroon-900 mb-3">Welcome to the Alumni Portal</h2>
                  <p className="text-sm text-maroon-700 leading-relaxed mb-4">
                    As an alum of {fraternityName}, your involvement is crucial to our chapter&apos;s growth.
                    Through this portal, you can connect with undergraduate {terms.membersLower}, review local PNMs, vote on
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

                {/* Chapter Announcements Feed Card */}
                <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] space-y-4">
                  <h3 className="font-bold text-maroon-900 text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-maroon-600" />
                    Chapter Announcements
                  </h3>
                  {announcementList.length > 0 ? (
                    <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                      {announcementList.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => setActiveAnnouncement(a)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setActiveAnnouncement(a);
                            }
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 text-left relative hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-16px_rgba(74,17,29,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500/40 ${
                            a.pinned
                              ? "bg-amber-50/50 hover:bg-amber-50 border-amber-200"
                              : "bg-cream-50/30 hover:bg-cream-50 border-maroon-100"
                          }`}
                        >
                          {a.pinned && (
                            <Badge className="bg-amber-500 text-white border-none py-0.5 px-1.5 text-[9px] uppercase font-bold tracking-wider absolute top-3.5 right-3.5">
                              Pinned
                            </Badge>
                          )}
                          <h4 className="font-bold text-maroon-900 text-sm pr-16">{a.title}</h4>
                          <p className="text-xs text-maroon-600 line-clamp-2 mt-1.5 leading-relaxed">{a.body}</p>
                          
                          {a.poll && (
                            <div 
                              className="mt-3 p-3 rounded-xl bg-white/70 border border-maroon-100/50 space-y-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-[11px] font-bold text-maroon-900 flex items-center gap-1.5">
                                <Vote className="w-3.5 h-3.5 text-maroon-600" />
                                {a.poll.question}
                              </p>
                              <div className="grid grid-cols-1 gap-1.5">
                                {safeParseOptions(a.poll.options).map((o) => {
                                  const optionVotes = a.poll!.votes.filter((v) => v.optionId === o.id).length;
                                  const totalVotes = a.poll!.votes.length;
                                  const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                                  const isSelected = a.poll!.votes.some((v) => v.alumniId === alumni.id && v.optionId === o.id);

                                  return (
                                    <button
                                      key={o.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVote(a.poll!.id, o.id);
                                      }}
                                      disabled={votingOnPollId === a.poll!.id}
                                      className={`w-full text-left p-2 rounded-lg border text-[11px] transition flex flex-col relative overflow-hidden justify-center min-h-[34px] ${
                                        isSelected
                                          ? "border-maroon-800 bg-maroon-50/20"
                                          : "border-maroon-100/70 hover:border-maroon-300 hover:bg-cream-50/50 bg-white/40"
                                      }`}
                                    >
                                      <div
                                        className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-550 ${
                                          isSelected ? "bg-maroon-200/20" : "bg-maroon-100/5"
                                        }`}
                                        style={{ width: `${pct}%` }}
                                      ></div>

                                      <div className="flex justify-between items-center z-10 w-full px-1">
                                        <span className={`flex items-center gap-1 ${
                                          isSelected ? "text-maroon-950 font-bold" : "text-maroon-800 font-medium"
                                        }`}>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-maroon-800 flex-shrink-0" />}
                                          {o.label}
                                        </span>
                                        <span className="font-bold text-maroon-900 font-mono text-[10px]">
                                          {pct}% ({optionVotes})
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="text-[9px] text-maroon-400 font-semibold uppercase flex justify-between px-1">
                                <span>{a.poll.votes.length} votes cast</span>
                                <span>Anonymous Poll</span>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 items-center text-[10px] text-maroon-400 mt-3 font-semibold uppercase tracking-wider">
                            <span>By: {a.author?.name || "Chapter Officer"} {a.author?.position ? `(${a.author.position})` : ""}</span>
                            <span>•</span>
                            <span>{new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <PortalEmpty
                      icon={MessageSquare}
                      illustration={IllustrationInbox}
                      title="No announcements yet"
                      sub="Chapter news and notices will show up here the moment they're posted."
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
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
                <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
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
                <div className="relative overflow-hidden bg-gradient-to-br from-maroon-800 to-maroon-950 text-cream-50 rounded-2xl p-6 shadow-[0_18px_44px_-20px_rgba(74,17,29,0.7)] ring-1 ring-maroon-900/30">
                  <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-400/15 blur-3xl" />
                  <h3 className="relative text-base font-bold mb-2">Next Chapter Event</h3>
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
                        className="w-full bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-maroon-950 font-bold text-xs py-2 rounded-lg mt-4 shadow-[0_6px_16px_-6px_rgba(217,119,6,0.7)] transition-all duration-200 active:scale-[0.98]"
                      >
                        View Calendar
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-cream-200/60">No upcoming alumni events scheduled.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-5 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
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

          {/* MY PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
                <div className="flex items-start gap-4">
                  <InitialsAvatar name={alumProfile.fullName} size={56} rounded="rounded-2xl" className="shrink-0" />
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-maroon-900 leading-tight">{alumProfile.fullName}</h2>
                    <p className="text-xs text-amber-800 font-bold uppercase tracking-wide mt-0.5">
                      Class of {alumProfile.graduationYear}
                      {alumProfile.pledgeClass ? ` · ${alumProfile.pledgeClass}` : ""}
                    </p>
                    <p className="text-xs text-maroon-600 mt-1">
                      Keep your details current so fellow {terms.membersLower} and undergraduates can reach you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
                {/* Locked identity fields — display-only, edited by chapter admins. */}
                <div className="mb-5 p-4 bg-cream-50/60 rounded-xl border border-maroon-50 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-maroon-500 mb-0.5">Full Name</span>
                    <p className="text-sm font-semibold text-maroon-900">{alumProfile.fullName}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-maroon-500 mb-0.5">Email on File</span>
                    <p className="text-sm font-semibold text-maroon-900">{alumProfile.email || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] text-maroon-500 italic">
                      Name &amp; email are managed by your chapter admin. Contact them to change these.
                    </p>
                  </div>
                </div>

                {profileError && (
                  <div role="alert" className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div role="status" className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                    {profileSuccess}
                  </div>
                )}

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="alum-preferredName" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Preferred Name
                      </label>
                      <input
                        id="alum-preferredName"
                        type="text"
                        value={profileForm.preferredName}
                        onChange={(e) => setProfileForm({ ...profileForm, preferredName: e.target.value })}
                        placeholder="e.g. Drew"
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs text-maroon-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="alum-phone" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Phone Number
                      </label>
                      <input
                        id="alum-phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="e.g. (555) 555-5555"
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs text-maroon-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="alum-city" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        City
                      </label>
                      <input
                        id="alum-city"
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        placeholder="e.g. Charlotte"
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs text-maroon-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="alum-state" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        State
                      </label>
                      <input
                        id="alum-state"
                        type="text"
                        value={profileForm.state}
                        onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                        placeholder="e.g. NC"
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs text-maroon-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="alum-employer" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Employer
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 w-3.5 h-3.5 text-maroon-400" />
                        <input
                          id="alum-employer"
                          type="text"
                          value={profileForm.employer}
                          onChange={(e) => setProfileForm({ ...profileForm, employer: e.target.value })}
                          placeholder="e.g. Acme Corp"
                          className="w-full pl-9 pr-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs text-maroon-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="alum-jobTitle" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Job Title
                      </label>
                      <input
                        id="alum-jobTitle"
                        type="text"
                        value={profileForm.jobTitle}
                        onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                        placeholder="e.g. Product Manager"
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs text-maroon-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="alum-linkedinUrl" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                      LinkedIn URL
                    </label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-maroon-400" />
                      <input
                        id="alum-linkedinUrl"
                        type="url"
                        value={profileForm.linkedinUrl}
                        onChange={(e) => setProfileForm({ ...profileForm, linkedinUrl: e.target.value })}
                        placeholder="https://www.linkedin.com/in/yourname"
                        className="w-full pl-9 pr-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs text-maroon-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="alum-bio" className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                      Biography
                    </label>
                    <textarea
                      id="alum-bio"
                      rows={5}
                      maxLength={2000}
                      placeholder="Share a brief bio — your career, how you stay involved, and how fellow alumni can connect with you."
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-amber-500 text-xs text-maroon-900 resize-none leading-relaxed"
                    />
                    <p className="text-[10px] text-right text-maroon-500 mt-1">{2000 - profileForm.bio.length} characters remaining</p>
                  </div>

                  {/* Privacy / communication preferences */}
                  <fieldset className="space-y-3 pt-1">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">Preferences</legend>

                    <label htmlFor="alum-optInDirectory" className="flex items-start gap-3 p-3 bg-cream-50/50 rounded-xl border border-maroon-50 cursor-pointer">
                      <input
                        id="alum-optInDirectory"
                        type="checkbox"
                        checked={profileForm.optInDirectory}
                        onChange={(e) => setProfileForm({ ...profileForm, optInDirectory: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-maroon-300 text-maroon-700 focus:ring-amber-500 accent-maroon-700"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-maroon-900">Show me in the Alumni Directory</span>
                        <span className="block text-[11px] text-maroon-600">Let other alumni and undergraduates find your profile and contact info.</span>
                      </span>
                    </label>

                    <label htmlFor="alum-optInNewsletter" className="flex items-start gap-3 p-3 bg-cream-50/50 rounded-xl border border-maroon-50 cursor-pointer">
                      <input
                        id="alum-optInNewsletter"
                        type="checkbox"
                        checked={profileForm.optInNewsletter}
                        onChange={(e) => setProfileForm({ ...profileForm, optInNewsletter: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-maroon-300 text-maroon-700 focus:ring-amber-500 accent-maroon-700"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-maroon-900">Subscribe to the chapter newsletter</span>
                        <span className="block text-[11px] text-maroon-600">Receive chapter updates, event invites, and alumni news by email.</span>
                      </span>
                    </label>
                  </fieldset>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-gradient-to-b from-maroon-700 to-maroon-900 hover:from-maroon-800 hover:to-maroon-950 text-cream-50 font-bold px-6 py-2.5 rounded-xl shadow-[0_8px_20px_-8px_rgba(74,17,29,0.6)] transition-all duration-200 active:scale-[0.98] disabled:active:scale-100"
                    >
                      {savingProfile ? "Saving Profile..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* HOMETOWN PNMS TAB */}
          {activeTab === "pnms" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
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
                        <div key={pnm.id} className="rounded-xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-4 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-[0_18px_40px_-20px_rgba(74,17,29,0.35)]">
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
                  <div className="bg-cream-100/50 rounded-xl border border-maroon-50 border-dashed">
                    <PortalEmpty
                      icon={MapPin}
                      illustration={IllustrationSearch}
                      title="No hometown matches"
                      sub="We didn't find active PNMs near your city or state. Use the search below to find anyone you know."
                    />
                  </div>
                )}
              </div>

              {/* General Search & Vouch */}
              <div className="pt-4">
                <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
                  <h3 className="text-base font-bold text-maroon-900 mb-3">Search all active PNMs</h3>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                    <input
                      type="text"
                      aria-label="Search all active PNMs by name, hometown, or major"
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
              <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
                <h2 className="text-xl font-bold text-maroon-900 mb-3">Undergraduate Active Roster</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                  <input
                    type="text"
                    aria-label="Search active brothers by name, position, or class"
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
                    <div key={b.id} className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-4 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] flex items-start gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_18px_40px_-20px_rgba(74,17,29,0.35)]">
                      <InitialsAvatar name={b.name} src={b.headshotUrl} size={48} rounded="rounded-xl" className="shrink-0" />
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-maroon-900 text-sm leading-snug">{b.name}</h3>
                        {b.position && (
                          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">{b.position}</p>
                        )}
                        <p className="text-[11px] text-maroon-700">
                          {b.year || "Undergrad"} • {b.pledgeClass || terms.member}
                        </p>
                        {b.major && (
                          <p className="text-[11px] text-maroon-600 italic">Major: {b.major}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <PortalEmpty
                      icon={Users}
                      illustration={IllustrationSearch}
                      title="No brothers match your search"
                      sub="Try a different name, position, or pledge class."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALUMNI DIRECTORY & CAREERS TAB */}
          {activeTab === "alumni" && (
            <div className="space-y-6 animate-fade-in text-left">
              {/* Sub-tabs for Alumni Directory & Careers */}
              <div className="flex border-b border-maroon-100 mb-6">
                <button
                  onClick={() => setAlumniTab("directory")}
                  className={`pb-3 text-sm font-bold tracking-wide uppercase px-4 border-b-2 transition-all ${
                    alumniTab === "directory"
                      ? "border-maroon-800 text-maroon-900"
                      : "border-transparent text-maroon-500 hover:text-maroon-800"
                  }`}
                >
                  Alumni Directory
                </button>
                <button
                  onClick={() => setAlumniTab("careers")}
                  className={`pb-3 text-sm font-bold tracking-wide uppercase px-4 border-b-2 transition-all ${
                    alumniTab === "careers"
                      ? "border-maroon-800 text-maroon-900"
                      : "border-transparent text-maroon-500 hover:text-maroon-800"
                  }`}
                >
                  Career Opportunities
                </button>
              </div>

              {alumniTab === "directory" ? (
                <>
                  <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
                    <h2 className="text-xl font-bold text-maroon-900 mb-3">Alumni Directory & Network</h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                      <input
                        type="text"
                        aria-label="Search the alumni directory by name, company, city, or state"
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
                        <div key={a.id} className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-5 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_18px_40px_-20px_rgba(74,17,29,0.35)] flex flex-col justify-between">
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
                      <div className="col-span-full">
                        <PortalEmpty
                          icon={GraduationCap}
                          illustration={IllustrationSearch}
                          title="No alumni match your query"
                          sub="Try a different name, company, city, or state."
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-maroon-900">Career & Internship Board</h2>
                      <p className="text-xs text-maroon-600">Browse internships, postgrad jobs, and referrals shared by alumni and active brothers.</p>
                    </div>
                    <Button
                      onClick={() => setShowPostJobModal(true)}
                      className="bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow"
                    >
                      <Plus className="w-4 h-4" /> Post Opportunity
                    </Button>
                  </div>

                  {/* Job Board Search */}
                  <div className="bg-white p-4 rounded-2xl border border-maroon-100 shadow-sm max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                      <input
                        type="text"
                        placeholder="Search jobs by title, company, keyword..."
                        value={jobSearch}
                        onChange={(e) => setJobSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900 placeholder:text-maroon-400"
                      />
                    </div>
                  </div>

                  {/* Careers List */}
                  {(() => {
                    const jobs = localJobPostings.filter(j => {
                      const q = jobSearch.toLowerCase();
                      return (
                        j.title.toLowerCase().includes(q) ||
                        j.company.toLowerCase().includes(q) ||
                        j.description.toLowerCase().includes(q) ||
                        (j.location && j.location.toLowerCase().includes(q))
                      );
                    });

                    if (jobs.length === 0) {
                      return (
                        <div className="bg-white border border-maroon-100 rounded-2xl shadow-sm">
                          <PortalEmpty
                            icon={Award}
                            illustration={IllustrationSearch}
                            title="No opportunities found"
                            sub="Be the first to post a job opening or internship to get the ball rolling!"
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {jobs.map((j) => {
                          const isExpanded = expandedJobId === j.id;
                          const refEmailSubject = `Greekstack Referral: ${j.title}`;
                          const refEmailBody = `Hi ${j.contactName},\n\nI saw the "${j.title}" opening at "${j.company}" that you shared in the Greekstack Career portal and would love to get in touch about applying and learning more.\n\nBest,\n${alumni.fullName}`;
                          const emailHref = `mailto:${j.contactEmail}?subject=${encodeURIComponent(refEmailSubject)}&body=${encodeURIComponent(refEmailBody)}`;

                          return (
                            <div
                              key={j.id}
                              onClick={() => setExpandedJobId(isExpanded ? null : j.id)}
                              className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] p-5 cursor-pointer hover:border-maroon-200 transition-all space-y-4 text-left"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <h3 className="font-bold text-maroon-900 text-base leading-snug flex items-center gap-2">
                                    <Building className="w-4 h-4 text-maroon-500 shrink-0" />
                                    {j.title}
                                  </h3>
                                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                                    {j.company} {j.location ? `• ${j.location}` : ""}
                                  </p>
                                </div>
                                {j.salary && (
                                  <Badge className="bg-emerald-100 text-emerald-800 font-bold border-none">
                                    {j.salary}
                                  </Badge>
                                )}
                              </div>

                              <p className={`text-xs text-maroon-700 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                                {j.description}
                              </p>

                              {isExpanded && (
                                <div className="border-t border-maroon-50 pt-4 space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                  {j.requirements && (
                                    <div className="space-y-1">
                                      <h4 className="text-xs font-bold text-maroon-900 uppercase tracking-wider">Qualifications & Requirements</h4>
                                      <p className="text-xs text-maroon-700 leading-relaxed">{j.requirements}</p>
                                    </div>
                                  )}

                                  <div className="bg-cream-50 p-4 rounded-xl border border-maroon-100/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-bold text-maroon-500 uppercase tracking-wider">Shared Referrer / Contact</span>
                                      <p className="text-xs font-bold text-maroon-900">{j.contactName} ({j.postedByRole === "alumni" ? "Alumnus" : "Active Member"})</p>
                                      <p className="text-[11px] text-maroon-600">Shared by {j.postedByName}</p>
                                    </div>

                                    <div className="flex items-center gap-2 sm:justify-end">
                                      <a
                                        href={emailHref}
                                        className="inline-flex items-center gap-1.5 bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-bold text-xs px-4 py-2 rounded-xl transition shadow"
                                      >
                                        <Mail className="w-3.5 h-3.5" /> Email Referrer
                                      </a>
                                      {j.contactPhone && (
                                        <a
                                          href={`tel:${j.contactPhone}`}
                                          className="w-8 h-8 rounded-lg bg-cream-100 hover:bg-cream-200 border border-maroon-200 flex items-center justify-center text-maroon-800 transition"
                                          title="Call Referrer"
                                        >
                                          <Phone className="w-4 h-4" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* SURVEYS & POLLS TAB */}
          {activeTab === "polls" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
                <h2 className="text-xl font-bold text-maroon-900 mb-2">Alumni Opinion Polls</h2>
                <p className="text-sm text-maroon-700">
                  Participate in voting for critical chapter matters, homecoming plans, and general feedback.
                </p>
              </div>

              <div className="space-y-4">
                {pollList.length > 0 ? (
                  pollList.map(poll => {
                    // Defensive parse — a single malformed options blob must not
                    // crash the whole dashboard to the error boundary. Mirrors
                    // the brother feed's parsePollOptions resilience. Bad rows
                    // simply render with no options rather than taking the page down.
                    const parsedOptions = safeParseOptions(poll.options);
                    const totalVotes = poll.votes.length;

                    // Find if current alumnus voted
                    const myVote = poll.votes.find(v => v.alumniId === alumni.id);

                    return (
                      <div key={poll.id} className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
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
                  <div className="bg-white rounded-2xl border border-maroon-100">
                    <PortalEmpty
                      icon={Vote}
                      illustration={IllustrationInbox}
                      title="No active polls"
                      sub="When the chapter opens an alumni poll, you'll be able to weigh in right here."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EVENTS CALENDAR TAB */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
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
                      <div key={event.id} className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_18px_40px_-20px_rgba(74,17,29,0.35)]">
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
                  <div className="col-span-full bg-white rounded-2xl border border-maroon-100">
                    <PortalEmpty
                      icon={Calendar}
                      illustration={IllustrationCalendar}
                      title="No upcoming events"
                      sub="Alumni dinners, tailgates, and homecoming weekends will be listed here as they're announced."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DONATE & SUPPORT TAB */}
          {activeTab === "donate" && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]">
                <h2 className="text-xl font-bold text-maroon-900 mb-1">Donate &amp; Support Chapter</h2>
                <p className="text-sm text-maroon-700">
                  Your contributions directly support active brothers, academic scholarships, and physical house improvements. Stripe processing is secure, and we take a 5% platform fee on all online donations.
                </p>
              </div>

              {/* Donation Form */}
              <div className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl p-6 ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] space-y-6">
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
                      inputMode="decimal"
                      min={5}
                      step="0.01"
                      aria-label="Custom donation amount in dollars"
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
                  className="w-full bg-gradient-to-b from-maroon-700 to-maroon-900 hover:from-maroon-800 hover:to-maroon-950 disabled:from-maroon-800/50 disabled:to-maroon-900/50 text-cream-50 font-bold py-3 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 shadow-[0_8px_20px_-8px_rgba(74,17,29,0.6)] flex items-center justify-center gap-2"
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

      {/* JOB POSTING MODAL */}
      {showPostJobModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl border border-maroon-100 shadow-xl overflow-hidden animate-fade-in text-left animate-in fade-in duration-200">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-maroon-500 uppercase tracking-wider block mb-1">
                    Post Career Opportunity
                  </span>
                  <h3 className="font-extrabold text-maroon-900 text-lg leading-snug">Share Job or Internship</h3>
                </div>
                <button
                  onClick={() => {
                    setShowPostJobModal(false);
                    setPostJobError(null);
                    setPostJobSuccess(false);
                  }}
                  className="p-1 rounded-lg hover:bg-cream-50 text-maroon-500 hover:text-maroon-900 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {postJobSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-250 flex items-center justify-center text-emerald-800">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-maroon-900 text-sm">Opportunity Shipped!</h4>
                  <p className="text-xs text-maroon-600">Your career posting has been shared with the chapter.</p>
                </div>
              ) : (
                <form onSubmit={handlePostJob} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Opportunity Title*</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Software Engineer Intern"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Company / Employer*</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Google"
                        value={jobCompany}
                        onChange={(e) => setJobCompany(e.target.value)}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Location</label>
                      <input
                        type="text"
                        placeholder="e.g. San Francisco, CA"
                        value={jobLocation}
                        onChange={(e) => setJobLocation(e.target.value)}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Salary / Compensation</label>
                      <input
                        type="text"
                        placeholder="e.g. $45/hr or $90,000/yr"
                        value={jobSalary}
                        onChange={(e) => setJobSalary(e.target.value)}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                      />
                    </div>
                  </div>

                  <div className="border-t border-maroon-50 pt-2 grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Contact Name*</label>
                      <input
                        type="text"
                        required
                        value={jobContactName}
                        onChange={(e) => setJobContactName(e.target.value)}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Contact Email*</label>
                      <input
                        type="email"
                        required
                        value={jobContactEmail}
                        onChange={(e) => setJobContactEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={jobContactPhone}
                        onChange={(e) => setJobContactPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Description & Referral Steps*</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Explain the job duties, how they can apply, and if you can submit an internal referral..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-maroon-900 uppercase tracking-wide mb-1">Preferred Qualifications (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Junior/Senior standing, CS or Business majors preferred"
                      value={jobRequirements}
                      onChange={(e) => setJobRequirements(e.target.value)}
                      className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                    />
                  </div>

                  {postJobError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                      {postJobError}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowPostJobModal(false);
                        setPostJobError(null);
                        setPostJobSuccess(false);
                      }}
                      className="text-maroon-700 hover:bg-cream-50 text-xs py-1 h-8 rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submittingJob}
                      className="bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-bold px-4 py-1 h-8 rounded-lg text-xs"
                    >
                      {submittingJob ? "Posting..." : "Share Posting"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG (replaces window.confirm) */}
      <Dialog open={!!confirmState} onOpenChange={(o) => !confirmBusy && !o && setConfirmState(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            <DialogDescription>{confirmState?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmState(null)}
              disabled={confirmBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={runConfirm}
              disabled={confirmBusy}
              className={
                confirmState?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-maroon-800 text-cream-50 hover:bg-maroon-900"
              }
            >
              {confirmBusy ? "Working..." : confirmState?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ANNOUNCEMENT DETAILS POPUP MODAL */}
      {activeAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl border border-maroon-100 shadow-xl overflow-hidden animate-fade-in text-left">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-maroon-500 uppercase tracking-wider block mb-1">
                    {activeAnnouncement.pinned ? "Pinned Announcement" : "Chapter Notice"}
                  </span>
                  <h3 className="font-extrabold text-maroon-900 text-lg leading-snug">{activeAnnouncement.title}</h3>
                </div>
                <button
                  onClick={() => setActiveAnnouncement(null)}
                  className="p-1 rounded-lg hover:bg-cream-50 text-maroon-50 hover:text-maroon-900 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-maroon-700 leading-relaxed font-normal space-y-2 whitespace-pre-wrap">
                {activeAnnouncement.body}
              </div>

              {activeAnnouncement.poll && (
                <div className="p-4 rounded-xl bg-cream-50/50 border border-maroon-100 space-y-3">
                  <p className="text-xs font-bold text-maroon-950 flex items-center gap-2">
                    <Vote className="w-4 h-4 text-maroon-700" />
                    {activeAnnouncement.poll.question}
                  </p>
                  <div className="space-y-2">
                    {safeParseOptions(activeAnnouncement.poll.options).map((o) => {
                      const optionVotes = activeAnnouncement.poll!.votes.filter((v) => v.optionId === o.id).length;
                      const totalVotes = activeAnnouncement.poll!.votes.length;
                      const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                      const isSelected = activeAnnouncement.poll!.votes.some((v) => v.alumniId === alumni.id && v.optionId === o.id);

                      return (
                        <button
                          key={o.id}
                          onClick={() => handleVote(activeAnnouncement.poll!.id, o.id)}
                          disabled={votingOnPollId === activeAnnouncement.poll!.id}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex flex-col relative overflow-hidden justify-center min-h-[40px] ${
                            isSelected
                              ? "border-maroon-800 bg-maroon-50/25"
                              : "border-maroon-100 hover:border-maroon-300 hover:bg-white bg-white/70"
                          }`}
                        >
                          <div
                            className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-550 ${
                              isSelected ? "bg-maroon-200/25" : "bg-maroon-100/10"
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>

                          <div className="flex justify-between items-center z-10 w-full px-1">
                            <span className={`flex items-center gap-1.5 ${
                              isSelected ? "text-maroon-950 font-bold" : "text-maroon-800 font-medium"
                            }`}>
                              {isSelected && <Check className="w-4 h-4 text-maroon-800 flex-shrink-0" />}
                              {o.label}
                            </span>
                            <span className="font-bold text-maroon-950 font-mono text-xs">
                              {pct}% ({optionVotes})
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-maroon-400 font-bold uppercase flex justify-between px-1">
                    <span>Total votes: {activeAnnouncement.poll.votes.length}</span>
                    <span>Anonymous Poll</span>
                  </div>
                </div>
              )}

              <div className="border-t border-maroon-50 pt-4 mt-6 flex justify-between items-center text-[10px] font-bold text-maroon-400 uppercase tracking-wider">
                <span>By: {activeAnnouncement.author?.name || "Chapter Officer"} {activeAnnouncement.author?.position ? `(${activeAnnouncement.author.position})` : ""}</span>
                <span>{new Date(activeAnnouncement.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
