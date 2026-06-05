"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { avatarSrc } from "@/lib/image-url";
import {
  Users,
  CheckCircle,
  Calendar,
  DollarSign,
  Settings,
  Activity,
  FileText,
  Check,
  Search,
  Building,
  User,
  LogOut,
  Mail,
  Phone,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  Plus,
  X,
  Lock,
  Upload,
  ExternalLink,
  Clock,
  Clipboard,
  AlertCircle,
  Award,
  Heart,
  HelpCircle,
  ChevronDown,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicFooter } from "@/components/site/footer";
import { useToast } from "@/components/ui/toast";
import { useChapterIdentity } from "@/components/brand/chapter-identity-context";
import {
  standingLabel,
  standingTone,
  type Standing,
  type BreakdownRow,
} from "@/lib/points";
import {
  IllustrationWelcome,
  IllustrationCalendar,
  IllustrationInbox,
  IllustrationLedger,
  IllustrationSearch,
  IllustrationRoster,
  type IllustrationProps,
} from "@/components/brand/illustrations";

// Interfaces to ensure strict type safety matching the server page props
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
  bio: string | null;
  serviceHours: number;
  status: string;
  bigBrotherId: string | null;
  bigBrother: { id: string; name: string; email: string | null; phone: string | null } | null;
  littles: { id: string; name: string; email: string | null; phone: string | null }[];
  createdAt: string;
  updatedAt: string;
  lastSeen: string;
  initiationDate: string | null;
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  location: string | null;
  notes: string | null;
  status: string;
  myAttendance: {
    id: string;
    meetingId: string;
    memberId: string;
    status: string;
    checkedInAt: any;
    excuseReason: string | null;
    excuseApprovedById: string | null;
    notes: string | null;
    createdAt: any;
    updatedAt: any;
  } | null;
}

interface Chore {
  id: string;
  taskId: string;
  task: {
    id: string;
    label: string;
    description: string | null;
    rotationOrder: number;
    active: boolean;
  };
  memberId: string;
  weekStarting: string;
  status: string;
  completedAt: string | null;
  grade: string | null;
  notes: string | null;
}

interface ServiceLog {
  id: string;
  description: string;
  hoursLogged: number;
  performedAt: string;
  status: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  serviceEvent: { id: string; title: string } | null;
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
  myRsvp: { status: string; note: string | null } | null;
}

interface ServiceEvent {
  id: string;
  title: string;
  eventDate: string;
  partnerOrg: string | null;
}

interface DuesPayment {
  id: string;
  brotherId: string;
  amountCents: number;
  currency: string;
  year: string;
  status: string;
  method: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  duesPaidAt: string | null;
}

interface Poll {
  id: string;
  question: string;
  options: string; // JSON: [{id, label}]
  createdById: string;
  closesAt: Date | null;
  closedAt: Date | null;
  audience: string;
  createdAt: Date;
  updatedAt: Date;
  votes: {
    id: string;
    brotherId: string | null;
    alumniId: string | null;
    optionId: string;
  }[];
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
}

interface Alumni {
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

interface DuesConfig {
  enabled: boolean;
  amountCents: number;
  year: string;
  label: string;
  stripePublishableKey: string;
}

interface MemberStanding {
  score: number;
  max: number;
  pct: number;
  standing: Standing;
  breakdown: BreakdownRow[];
}

interface BrothersDashboardClientProps {
  brother: Brother;
  meetings: Meeting[];
  chores: Chore[];
  serviceLogs: ServiceLog[];
  events: Event[];
  serviceEvents: ServiceEvent[];
  duesPayments: DuesPayment[];
  polls: Poll[];
  announcements: Announcement[];
  alumniNetwork: Alumni[];
  duesConfig: DuesConfig;
  standing: MemberStanding | null;
  isAdmin: boolean;
}

// Browser-safe JSON parser for chapter surveys
function parsePollOptions(raw: string): { id: string; label: string }[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o): o is { id: string; label: string } =>
        o && typeof o === "object" && typeof o.id === "string" && typeof o.label === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Designed empty-state for the brother portal — a bespoke, on-brand SPOT
 * ILLUSTRATION (a small maroon-tinted scene that re-themes via currentColor)
 * with the section icon tucked into a soft maroon medallion badge, a headline,
 * and a sub. Keeps the portal's cream/maroon identity (the platform <IconChip>
 * is indigo-toned and would clash here) while making blank tabs feel intentional
 * and friendly rather than unfinished.
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
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}>
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

/**
 * Premium frosted-glass surface for the portal's cream/maroon identity. A
 * translucent white card with a hairline maroon ring and a layered soft shadow
 * for real depth; pairs with `hover:` lift utilities at the call site. This is
 * the maroon twin of the admin GLASS_CARD (which is brand-red) so the two
 * surfaces feel like one product without sharing a palette.
 */
const PORTAL_CARD =
  "rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl " +
  "ring-1 ring-maroon-900/[0.03] " +
  "shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)]";

/** Hover-lift transition shared by interactive portal cards. */
const PORTAL_LIFT =
  "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(74,17,29,0.35)] hover:border-maroon-200";

/** Deterministic initials from a full name (max 2 letters). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar with a maroon→cream initials-gradient fallback. Shows the headshot
 * when present; otherwise a tasteful gradient monogram instead of a bare icon —
 * a small touch that makes member cards read as designed.
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

/** Icon per scoreable dimension — reuses icons already imported in this file. */
const STANDING_DIM_ICON: Record<string, LucideIcon> = {
  dues: DollarSign,
  meetings: CheckCircle,
  service: Award,
  study: Clock,
  chores: Settings,
};

/**
 * "Your standing" — the member-facing read of the engagement score. Mirrors the
 * admin leaderboard math (same lib/points engine) but framed personally and
 * read-only. Themed for the portal's cream/maroon surface; the standing tone
 * (emerald/amber/rose) is palette-neutral so it reads correctly here.
 */
function StandingWidget({
  standing,
  memberName,
}: {
  standing: { score: number; max: number; pct: number; standing: Standing; breakdown: BreakdownRow[] };
  memberName: string;
}) {
  const tone = standingTone(standing.standing);
  const firstName = memberName.trim().split(/\s+/)[0] || memberName;
  return (
    <div className={`${PORTAL_CARD} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {/* Score dial */}
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-cream-200" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                className={tone.text}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(standing.pct / 100) * 97.4} 97.4`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-maroon-900 tabular-nums">
              {standing.pct}%
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-maroon-500">Your standing</p>
            <p className="mt-0.5 text-2xl font-extrabold text-maroon-900 tabular-nums leading-none">
              {standing.score}
              <span className="text-sm font-semibold text-maroon-400">/{standing.max}</span>
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
              {standingLabel(standing.standing)}
            </span>
          </div>
        </div>
        <p className="text-xs text-maroon-500 max-w-[15rem] leading-relaxed">
          Nice work, {firstName}. This score blends your dues, meeting attendance, service,
          study hours, and chores. Keep it up to stay in good standing.
        </p>
      </div>

      {/* Per-dimension breakdown */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {standing.breakdown.map((row) => {
          const Icon = STANDING_DIM_ICON[row.key] || Activity;
          const rowPct = row.max > 0 ? Math.round((row.points / row.max) * 100) : 0;
          return (
            <div key={row.key} className="rounded-xl border border-maroon-100 bg-cream-50 p-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-maroon-500">
                <Icon className="h-3 w-3" aria-hidden="true" /> {row.label}
              </p>
              <p className="mt-1.5 text-sm font-bold text-maroon-900 tabular-nums">
                {row.points}
                <span className="text-[11px] font-medium text-maroon-400">/{row.max}</span>
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-cream-200 overflow-hidden">
                <div className="h-full rounded-full bg-maroon-600" style={{ width: `${rowPct}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-maroon-500 truncate" title={row.detail}>
                {row.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BrothersDashboardClient({
  brother: initialBrother,
  meetings,
  chores,
  serviceLogs: initialServiceLogs,
  events,
  serviceEvents,
  duesPayments,
  polls: initialPolls,
  announcements,
  alumniNetwork,
  duesConfig,
  standing,
  isAdmin,
}: BrothersDashboardClientProps) {
  const router = useRouter();
  const { push } = useToast();
  // Member-noun vocabulary (Brother/Sister/Member) for display copy. Route paths
  // under /portal/brothers stay as-is — only visible labels re-genders per org.
  const { greekLetters, terms } = useChapterIdentity();
  const [activeTab, setActiveTab] = useState("overview");

  // Local state management to enable instant interactive client feedback
  const [brother, setBrother] = useState<Brother>(initialBrother);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>(initialServiceLogs);
  const [pollList, setPollList] = useState<Poll[]>(initialPolls);
  const [eventList, setEventList] = useState<Event[]>(events);

  // Search & filter states
  const [alumniSearch, setAlumniSearch] = useState("");
  const [alumniYearFilter, setAlumniYearFilter] = useState("");
  const [alumniClassFilter, setAlumniClassFilter] = useState("");

  // Service log submission state
  const [newLog, setNewLog] = useState({
    description: "",
    hoursLogged: "",
    performedAt: new Date().toISOString().split("T")[0],
    serviceEventId: "",
  });
  const [submittingService, setSubmittingService] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [serviceSuccess, setServiceSuccess] = useState("");

  // RSVP status states
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [activeRsvpEvent, setActiveRsvpEvent] = useState<Event | null>(null);
  const [rsvpNote, setRsvpNote] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState<"GOING" | "NOT_GOING" | "MAYBE">("GOING");
  const [activeRosterEvent, setActiveRosterEvent] = useState<string | null>(null);
  const [rosterData, setRosterData] = useState<{
    roster: any[];
    noResponse: any[];
    counts: { GOING: number; NOT_GOING: number; MAYBE: number; NO_RESPONSE: number; TOTAL_BROTHERS: number };
  } | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Dues state
  const [payingDues, setPayingDues] = useState(false);
  const [duesError, setDuesError] = useState("");

  // Profile editing state
  const [profileForm, setProfileForm] = useState({
    email: brother.email || "",
    phone: brother.phone || "",
    year: brother.year || "",
    major: brother.major || "",
    bio: brother.bio || "",
    headshotUrl: brother.headshotUrl || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Announcement details modal state
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);

  // Poll voting state
  const [votingOnPollId, setVotingOnPollId] = useState<string | null>(null);

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch("/api/portal/logout", { method: "POST" });
      router.push("/portal/brothers");
      router.refresh();
    } catch {
      window.location.href = "/portal/brothers";
    }
  };

  // Calculations for meeting attendance % (completed meetings only)
  const completedMeetings = meetings.filter((m) => m.status === "completed");
  const attendedCount = completedMeetings.filter(
    (m) => m.myAttendance?.status === "present" || m.myAttendance?.status === "tardy"
  ).length;
  const attendancePercentage =
    completedMeetings.length > 0 ? Math.round((attendedCount / completedMeetings.length) * 100) : 100;

  // Calculations for total service hours
  const totalApprovedHours = serviceLogs
    .filter((l) => l.status === "approved")
    .reduce((sum, l) => sum + l.hoursLogged, 0);
  const totalPendingHours = serviceLogs
    .filter((l) => l.status === "submitted")
    .reduce((sum, l) => sum + l.hoursLogged, 0);

  // Filtered Alumni List
  const filteredAlumni = alumniNetwork.filter((a) => {
    const matchesSearch =
      a.fullName.toLowerCase().includes(alumniSearch.toLowerCase()) ||
      (a.employer && a.employer.toLowerCase().includes(alumniSearch.toLowerCase())) ||
      (a.jobTitle && a.jobTitle.toLowerCase().includes(alumniSearch.toLowerCase())) ||
      (a.city && a.city.toLowerCase().includes(alumniSearch.toLowerCase())) ||
      (a.state && a.state.toLowerCase().includes(alumniSearch.toLowerCase()));

    const matchesYear = alumniYearFilter === "" || a.graduationYear.toString() === alumniYearFilter;
    const matchesClass = alumniClassFilter === "" || a.pledgeClass === alumniClassFilter;

    return matchesSearch && matchesYear && matchesClass;
  });

  // Extract unique classes/years for dropdown filters
  const uniqueGraduationYears = Array.from(
    new Set(alumniNetwork.map((a) => a.graduationYear))
  ).sort((a, b) => b - a);

  const uniquePledgeClasses = Array.from(
    new Set(alumniNetwork.map((a) => a.pledgeClass).filter((c): c is string => !!c))
  ).sort();

  // Submit new service hours
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceError("");
    setServiceSuccess("");

    const hoursNum = parseFloat(newLog.hoursLogged);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setServiceError("Please enter a valid amount of hours.");
      return;
    }

    if (!newLog.description.trim()) {
      setServiceError("Please write a brief description of what you did.");
      return;
    }

    setSubmittingService(true);
    try {
      const res = await fetch("/api/portal/brothers/service-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newLog.description.trim(),
          hoursLogged: hoursNum,
          performedAt: new Date(newLog.performedAt).toISOString(),
          serviceEventId: newLog.serviceEventId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setServiceError(data.error || "Failed to submit hours.");
      } else {
        setServiceSuccess("Service hours logged successfully!");
        setNewLog({
          description: "",
          hoursLogged: "",
          performedAt: new Date().toISOString().split("T")[0],
          serviceEventId: "",
        });
        // Refresh local list of service logs
        const logFetch = await fetch("/api/portal/brothers/service-hours");
        const logData = await logFetch.json();
        if (logData.ok) {
          setServiceLogs(logData.logs);
          // Update local brother cached hours value if the sum updated
          const updatedSum = logData.logs
            .filter((l: any) => l.status === "approved")
            .reduce((sum: number, l: any) => sum + Number(l.hoursLogged), 0);
          setBrother(prev => ({ ...prev, serviceHours: updatedSum }));
        }
      }
    } catch {
      setServiceError("Connection error. Please try again.");
    } finally {
      setSubmittingService(false);
    }
  };

  // Submit RSVP
  const handleRsvpSubmit = async () => {
    if (!activeRsvpEvent) return;
    setRsvpLoading(activeRsvpEvent.id);

    try {
      const res = await fetch(`/api/events/${activeRsvpEvent.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: rsvpStatus,
          note: rsvpNote.trim() || "",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Update local event list
        setEventList((prev) =>
          prev.map((e) =>
            e.id === activeRsvpEvent.id
              ? { ...e, myRsvp: { status: rsvpStatus, note: rsvpNote.trim() || null } }
              : e
          )
        );
        setActiveRsvpEvent(null);
        setRsvpNote("");
      } else {
        push({ title: "Failed to update RSVP.", description: data.error || undefined, variant: "destructive" });
      }
    } catch {
      push({ title: "A connection error occurred.", description: "Please check your network and try again.", variant: "destructive" });
    } finally {
      setRsvpLoading(null);
    }
  };

  // Open RSVP Modal
  const openRsvpModal = (event: Event) => {
    setActiveRsvpEvent(event);
    setRsvpStatus((event.myRsvp?.status as "GOING" | "NOT_GOING" | "MAYBE") || "GOING");
    setRsvpNote(event.myRsvp?.note || "");
  };

  // Fetch Event RSVP Roster
  const fetchRoster = async (eventId: string) => {
    if (activeRosterEvent === eventId) {
      setActiveRosterEvent(null);
      setRosterData(null);
      return;
    }
    setLoadingRoster(true);
    setActiveRosterEvent(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`);
      const data = await res.json();
      if (res.ok) {
        setRosterData(data);
      } else {
        setRosterData(null);
      }
    } catch {
      setRosterData(null);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Handle Dues Checkout redirection via Stripe
  const handlePayDues = async () => {
    setPayingDues(true);
    setDuesError("");

    try {
      const res = await fetch("/api/dues/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setDuesError(data.error || "Dues checkout service is currently unavailable.");
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setDuesError("Stripe payment gateway did not return a valid URL.");
      }
    } catch {
      setDuesError("A network connection error occurred while launching Stripe.");
    } finally {
      setPayingDues(false);
    }
  };

  // Handle Poll Vote
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
        setPollList((prev) =>
          prev.map((p) => {
            if (p.id !== pollId) return p;
            const filteredVotes = p.votes.filter((v) => v.brotherId !== brother.id);
            return {
              ...p,
              votes: [
                ...filteredVotes,
                { id: data.vote?.id || "temp", brotherId: brother.id, alumniId: null, optionId },
              ],
            };
          })
        );
      } else {
        const err = await res.json();
        push({ title: "Failed to submit vote.", description: err.error || undefined, variant: "destructive" });
      }
    } catch {
      push({ title: "A network error occurred.", description: "Please try voting again.", variant: "destructive" });
    } finally {
      setVotingOnPollId(null);
    }
  };

  // Handle Profile headshot upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setProfileError("");
    setProfileSuccess("");

    const fd = new FormData();
    fd.append("file", files[0]);

    try {
      const res = await fetch("/api/upload-headshot", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setProfileForm((prev) => ({ ...prev, headshotUrl: data.url }));
        setProfileSuccess("Image uploaded successfully! Save changes to update profile.");
      } else {
        setProfileError(data.error || "Failed to upload image. Max size 8MB (PNG/JPG).");
      }
    } catch {
      setProfileError("Network error uploading headshot.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Save profile changes
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);

    try {
      const res = await fetch("/api/portal/brothers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          year: profileForm.year.trim(),
          major: profileForm.major.trim(),
          bio: profileForm.bio.trim(),
          headshotUrl: profileForm.headshotUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Failed to save profile.");
      } else {
        setProfileSuccess("Profile updated successfully!");
        setBrother(data.brother);
      }
    } catch {
      setProfileError("A connection error occurred.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Identify current dues status
  const currentDuesPaid = duesPayments.some(
    (p) => p.year === duesConfig.year && p.status === "PAID"
  );
  const duesPending = duesPayments.some(
    (p) => p.year === duesConfig.year && p.status === "PENDING"
  );

  return (
    <div className="min-h-screen bg-cream-50 text-maroon-950 flex flex-col justify-between">
      <div>
        {/* Top Header / Portal Banner */}
        <header className="bg-white/85 backdrop-blur-xl border-b border-maroon-100 px-4 sm:px-6 py-4 shadow-[0_4px_20px_-12px_rgba(74,17,29,0.25)] sticky top-0 z-20">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-maroon-500/30 blur-lg" />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maroon-700 to-maroon-900 text-cream-50 flex items-center justify-center font-bold shadow-[0_6px_16px_-6px_rgba(74,17,29,0.6)] ring-1 ring-maroon-900/20">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-maroon-900 leading-tight">{greekLetters} Portal</h1>
                <p className="text-xs text-maroon-600">Active {terms.member} Workspace • {brother.name}</p>
              </div>
            </div>

            {isAdmin && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Override Mode
              </div>
            )}

            <div className="flex items-center gap-3">
              {brother.position && (
                <Badge className="bg-amber-600 text-white border-none py-1 px-2.5 font-semibold text-xs tracking-wider uppercase">
                  {brother.position}
                </Badge>
              )}
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

        {/* Dashboard Content Container */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          
          {/* R45 Navigation tabs row */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide border-b border-maroon-100 pb-3 mb-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "events", label: "Events & RSVPs", icon: Calendar },
              { id: "service", label: "Service Hours", icon: Award },
              { id: "dues", label: "Chapter Dues", icon: DollarSign },
              { id: "alumni", label: "Alumni Directory", icon: Users },
              { id: "polls", label: "Chapter Polls", icon: FileText },
              { id: "profile", label: "My Profile", icon: User },
              // Standalone pages (not tab-panels) route via router.push instead
              // of flipping the active tab.
              { id: "elections", label: "Officer Elections", icon: Vote, href: "/portal/brothers/elections" },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => (tab.href ? router.push(tab.href) : setActiveTab(tab.id))}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500/40 ${
                    active
                      ? "bg-gradient-to-b from-maroon-700 to-maroon-900 text-cream-50 shadow-[0_6px_16px_-6px_rgba(74,17,29,0.6)] ring-1 ring-maroon-900/20"
                      : "text-maroon-700 hover:bg-white hover:text-maroon-900 hover:shadow-sm hover:-translate-y-px"
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-300 ${active ? "" : "group-hover:scale-110"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT COMPONENT ROUTING */}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              {/* Good-standing widget — your engagement score at a glance */}
              {standing && <StandingWidget standing={standing} memberName={brother.name} />}

              {/* Profile Card & Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Profile Brief Info Card */}
                <div className={`${PORTAL_CARD} ${PORTAL_LIFT} p-6 flex flex-col justify-between`}>
                  <div className="flex items-start gap-4">
                    <InitialsAvatar name={brother.name} src={brother.headshotUrl} size={64} rounded="rounded-xl" className="flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-maroon-900 text-lg">{brother.name}</h3>
                      <p className="text-xs text-maroon-600 font-medium">Class: {brother.pledgeClass || "N/A"}</p>
                      <p className="text-xs text-maroon-500 font-medium">{brother.major || "Major unconfigured"}</p>
                      <p className="text-xs text-maroon-500 font-medium">{brother.year || "Year unconfigured"}</p>
                    </div>
                  </div>
                  <div className="border-t border-maroon-50 pt-4 mt-4 space-y-2">
                    <div className="text-xs flex justify-between">
                      <span className="text-maroon-600 font-medium">Big {terms.member}:</span>
                      <span className="text-maroon-900 font-semibold">{brother.bigBrother?.name || "None"}</span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span className="text-maroon-600 font-medium">Little {terms.members}:</span>
                      <span className="text-maroon-900 font-semibold">
                        {brother.littles.length > 0
                          ? brother.littles.map((l) => l.name).join(", ")
                          : "None"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Meeting Attendance Metric Card */}
                <div className={`${PORTAL_CARD} ${PORTAL_LIFT} p-6 flex flex-col justify-between`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-maroon-500">Meeting Attendance</span>
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-extrabold text-maroon-900">{attendancePercentage}%</span>
                      <span className="text-xs text-maroon-500">of completed meetings</span>
                    </div>
                    {/* Tiny gauge */}
                    <div className="w-full bg-cream-100 h-2.5 rounded-full mt-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          attendancePercentage >= 85
                            ? "bg-emerald-600"
                            : attendancePercentage >= 70
                            ? "bg-amber-500"
                            : "bg-red-600"
                        }`}
                        style={{ width: `${attendancePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="border-t border-maroon-50 pt-3 mt-4 flex justify-between text-xs text-maroon-600">
                    <span>Attended: {attendedCount}</span>
                    <span>Total Completed: {completedMeetings.length}</span>
                  </div>
                </div>

                {/* Service Hours Metric Card */}
                <div className={`${PORTAL_CARD} ${PORTAL_LIFT} p-6 flex flex-col justify-between`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-maroon-500">Service Hours Logged</span>
                      <Award className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-extrabold text-maroon-900">{totalApprovedHours}</span>
                      <span className="text-xs text-maroon-500">approved hrs</span>
                    </div>
                    {totalPendingHours > 0 && (
                      <p className="text-[11px] text-amber-700 mt-1 font-medium">
                        + {totalPendingHours} hours currently pending approval
                      </p>
                    )}
                    {/* Tiny progress toward semester goal of 15 hours */}
                    <div className="w-full bg-cream-100 h-2.5 rounded-full mt-4 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${Math.min((totalApprovedHours / 15) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="border-t border-maroon-50 pt-3 mt-4 flex justify-between text-xs text-maroon-600">
                    <span>Goal: 15 hrs</span>
                    <span>Progress: {Math.round((totalApprovedHours / 15) * 100)}%</span>
                  </div>
                </div>

              </div>

              {/* Chores & Announcements Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Chore Assignment Card */}
                <div className={`${PORTAL_CARD} ${PORTAL_LIFT} p-6 md:col-span-1 flex flex-col justify-between`}>
                  <div>
                    <h3 className="font-bold text-maroon-900 text-lg flex items-center gap-2 mb-4">
                      <Settings className="w-4 h-4 text-maroon-600 animate-spin" style={{ animationDuration: '6s' }} />
                      Chore Wheel Assignment
                    </h3>
                    {chores.length > 0 ? (
                      <div className="space-y-4">
                        <div className="bg-cream-50 border border-maroon-100 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-maroon-500 font-semibold uppercase tracking-wider">Active Chore</span>
                            <Badge className={`border-none ${
                              chores[0].status === "completed" || chores[0].status === "graded"
                                ? "bg-emerald-100 text-emerald-800"
                                : chores[0].status === "skipped"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {chores[0].status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="font-bold text-maroon-900 text-base">{chores[0].task.label}</p>
                          {chores[0].task.description && (
                            <p className="text-xs text-maroon-600 leading-normal">{chores[0].task.description}</p>
                          )}
                          <p className="text-[10px] text-maroon-400">
                            Week: {new Date(chores[0].weekStarting).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        {chores[0].grade && (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs">
                            <Award className="w-4 h-4 text-amber-600" />
                            <span className="text-amber-800 font-medium">
                              Grade: <strong className="text-amber-950 font-bold">{chores[0].grade}</strong>
                              {chores[0].notes && ` — "${chores[0].notes}"`}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <PortalEmpty
                        icon={CheckCircle}
                        title="All clear this week"
                        sub="No chores on the wheel for you right now. Nice work staying on top of it."
                        className="py-8"
                      />
                    )}
                  </div>
                  {chores.length > 1 && (
                    <div className="border-t border-maroon-50 pt-3 mt-4">
                      <span className="text-xs text-maroon-500 font-semibold uppercase block mb-2">Chore History</span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {chores.slice(1, 4).map((c) => (
                          <div key={c.id} className="text-xs flex justify-between items-center text-maroon-700 py-1 border-b border-maroon-50 last:border-0">
                            <span>{c.task.label}</span>
                            <span className="text-[10px] uppercase font-semibold text-maroon-500">{c.status} ({c.grade || "Ungraded"})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Announcements Feed Card */}
                <div className={`${PORTAL_CARD} p-6 md:col-span-2 space-y-4`}>
                  <h3 className="font-bold text-maroon-900 text-lg flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-maroon-600" />
                    Chapter Announcements
                  </h3>
                  {announcements.length > 0 ? (
                    <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                      {announcements.map((a) => (
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
                      sub="Chapter news and officer updates will show up here the moment they're posted."
                    />
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: EVENTS & RSVPs */}
          {activeTab === "events" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-maroon-900">Upcoming Chapter Events</h2>
                  <p className="text-xs text-maroon-600">RSVP to chapter meetings, philanthropy, socials, and recruitment.</p>
                </div>
                <Badge className="bg-maroon-800 text-cream-50 font-semibold px-3 py-1.5 border-none">
                  {eventList.length} Scheduled
                </Badge>
              </div>

              {eventList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {eventList.map((e) => {
                    const rsvpStatusValue = e.myRsvp?.status;
                    return (
                      <div
                        key={e.id}
                        className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] p-6 flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-maroon-200 hover:shadow-[0_18px_40px_-20px_rgba(74,17,29,0.35)]"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              {e.category}
                            </span>
                            {rsvpStatusValue ? (
                              <Badge className={`border-none ${
                                rsvpStatusValue === "GOING"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : rsvpStatusValue === "NOT_GOING"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {rsvpStatusValue}
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700 border-none font-medium">
                                No Response
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-bold text-maroon-900 text-lg leading-snug">{e.name}</h3>
                          {e.description && (
                            <p className="text-xs text-maroon-600 leading-relaxed font-normal">{e.description}</p>
                          )}

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-xs text-maroon-700 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-maroon-400 flex-shrink-0" />
                              <span>{new Date(e.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {e.location && (
                              <div className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-maroon-400 flex-shrink-0" />
                                <span className="truncate">{e.location}</span>
                              </div>
                            )}
                            {e.dressCode && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <Lock className="w-3.5 h-3.5 text-maroon-400 flex-shrink-0" />
                                <span>Dress Code: <strong className="text-maroon-900 font-semibold">{e.dressCode}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Event RSVP Controls */}
                        <div className="border-t border-maroon-50 pt-4 flex flex-wrap gap-2 justify-between items-center">
                          <div className="flex gap-1.5">
                            <Button
                              onClick={() => openRsvpModal(e)}
                              size="sm"
                              variant="outline"
                              className="border-maroon-200 text-maroon-800 hover:bg-cream-50 text-xs py-1 h-8 rounded-lg"
                            >
                              RSVP / Update
                            </Button>
                            <Button
                              onClick={() => fetchRoster(e.id)}
                              size="sm"
                              variant="ghost"
                              className="text-maroon-700 hover:text-maroon-900 text-xs py-1 h-8 px-2"
                            >
                              {activeRosterEvent === e.id ? "Hide Roster" : "Who is Going?"}
                            </Button>
                          </div>

                          {e.myRsvp?.note && (
                            <span className="text-[10px] text-maroon-400 max-w-xs truncate italic">
                              &ldquo;{e.myRsvp.note}&rdquo;
                            </span>
                          )}
                        </div>

                        {/* In-Line RSVP Roster Display */}
                        {activeRosterEvent === e.id && (
                          <div className="mt-4 border-t border-maroon-50 pt-4 animate-fade-in text-left">
                            <h4 className="font-bold text-xs text-maroon-900 uppercase tracking-wider mb-2">RSVP Roster</h4>
                            {loadingRoster ? (
                              <p className="text-xs text-maroon-400">Loading attendee roster...</p>
                            ) : rosterData ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-maroon-600">
                                  <div className="bg-emerald-50 border border-emerald-100 rounded p-1">
                                    Going: {rosterData.counts.GOING}
                                  </div>
                                  <div className="bg-amber-50 border border-amber-100 rounded p-1">
                                    Maybe: {rosterData.counts.MAYBE}
                                  </div>
                                  <div className="bg-red-50 border border-red-100 rounded p-1">
                                    Declined: {rosterData.counts.NOT_GOING}
                                  </div>
                                </div>

                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                  {rosterData.roster.length > 0 ? (
                                    rosterData.roster.map((r, idx) => (
                                      <div key={idx} className="flex justify-between items-center py-1 border-b border-maroon-50 text-xs last:border-none">
                                        <span className="font-medium text-maroon-900">{r.brother.name}</span>
                                        <div className="flex gap-2 items-center">
                                          {r.note && (
                                            <span className="text-[10px] text-maroon-400 italic max-w-[120px] truncate">
                                              &ldquo;{r.note}&rdquo;
                                            </span>
                                          )}
                                          <Badge className={`border-none text-[9px] px-1.5 py-0.5 uppercase ${
                                            r.status === "GOING"
                                              ? "bg-emerald-100 text-emerald-800"
                                              : r.status === "NOT_GOING"
                                              ? "bg-red-100 text-red-800"
                                              : "bg-amber-100 text-amber-800"
                                          }`}>
                                            {r.status}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-[11px] text-maroon-400 text-center py-2">No RSVPs recorded yet.</p>
                                  )}
                                  {rosterData.noResponse.length > 0 && (
                                    <div className="pt-2">
                                      <span className="text-[10px] font-bold text-maroon-400 block mb-1">NO RESPONSE ({rosterData.noResponse.length})</span>
                                      <p className="text-[10px] text-maroon-500">{rosterData.noResponse.map((b) => b.name).join(", ")}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-red-600">Roster could not be fetched.</p>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-maroon-100 rounded-2xl shadow-sm">
                  <PortalEmpty
                    icon={Calendar}
                    illustration={IllustrationCalendar}
                    title="No upcoming events"
                    sub="When officers schedule meetings, socials, or philanthropy, they'll appear here to RSVP."
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICE HOURS */}
          {activeTab === "service" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Submit New Service Log Form */}
                <div className="p-6 rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] md:col-span-1">
                  <h3 className="font-bold text-maroon-900 text-lg mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-maroon-600" />
                    Log Service Hours
                  </h3>

                  {serviceError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                      {serviceError}
                    </div>
                  )}

                  {serviceSuccess && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                      {serviceSuccess}
                    </div>
                  )}

                  <form onSubmit={handleServiceSubmit} className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Service Event Linkage
                      </label>
                      <select
                        value={newLog.serviceEventId}
                        onChange={(e) => setNewLog({ ...newLog, serviceEventId: e.target.value })}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-sm text-maroon-900"
                      >
                        <option value="">Independent Project (No Event)</option>
                        {serviceEvents.map((se) => (
                          <option key={se.id} value={se.id}>
                            {se.title} ({new Date(se.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-maroon-500 mt-1">
                        Link your hours to an approved chapter event, or log individual independent service.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Hours Logged
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        placeholder="e.g. 3.5"
                        value={newLog.hoursLogged}
                        onChange={(e) => setNewLog({ ...newLog, hoursLogged: e.target.value })}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-sm text-maroon-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Date Performed
                      </label>
                      <input
                        type="date"
                        required
                        value={newLog.performedAt}
                        onChange={(e) => setNewLog({ ...newLog, performedAt: e.target.value })}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-sm text-maroon-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Description & Details
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Describe the service event, what tasks you completed, and who you worked with."
                        value={newLog.description}
                        onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-sm text-maroon-900 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingService}
                      className="w-full bg-gradient-to-b from-maroon-700 to-maroon-900 hover:from-maroon-800 hover:to-maroon-950 text-cream-50 py-2 rounded-xl shadow-[0_8px_20px_-8px_rgba(74,17,29,0.6)] font-semibold transition-all duration-200 active:scale-[0.98]"
                    >
                      {submittingService ? "Logging Hours..." : "Submit Log"}
                    </Button>
                  </form>
                </div>

                {/* Service History Table */}
                <div className="p-6 rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-maroon-900 text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-maroon-600" />
                      Service Hours Ledger
                    </h3>
                    <Badge className="bg-amber-600 text-white border-none py-1 px-2.5">
                      {serviceLogs.length} Total Logs
                    </Badge>
                  </div>

                  {serviceLogs.length > 0 ? (
                    <div className="overflow-x-auto border border-maroon-50 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-cream-50 text-maroon-900 border-b border-maroon-100 font-bold uppercase tracking-wider">
                            <th className="p-3">Date</th>
                            <th className="p-3">Event/Description</th>
                            <th className="p-3 text-center">Hours</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-maroon-50">
                          {serviceLogs.map((l) => (
                            <tr key={l.id} className="hover:bg-cream-50/20 text-maroon-800">
                              <td className="p-3 whitespace-nowrap font-medium">
                                {new Date(l.performedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="p-3 max-w-sm">
                                <span className="font-semibold block text-maroon-900">
                                  {l.serviceEvent ? l.serviceEvent.title : "Independent Service"}
                                </span>
                                <span className="text-[11px] text-maroon-600 line-clamp-1 mt-0.5">{l.description}</span>
                                {l.rejectionReason && (
                                  <div className="p-2 mt-1 rounded bg-red-50 border border-red-150 text-[10px] text-red-800">
                                    Rejection reason: &ldquo;{l.rejectionReason}&rdquo;
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-sm text-maroon-900">
                                {l.hoursLogged}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  l.status === "approved"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : l.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    l.status === "approved"
                                      ? "bg-emerald-600"
                                      : l.status === "rejected"
                                      ? "bg-red-650"
                                      : "bg-amber-500"
                                  }`} />
                                  {l.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <PortalEmpty
                      icon={Award}
                      title="No service hours logged yet"
                      sub="Submit your first log on the left — get out there and support the community."
                    />
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: CHAPTER DUES */}
          {activeTab === "dues" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Active Semester Dues Card */}
                <div className="p-6 rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] md:col-span-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-bold text-maroon-900 text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-maroon-600" />
                      Active Semester Dues
                    </h3>

                    {duesError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
                        {duesError}
                      </div>
                    )}

                    <div className="bg-cream-50 border border-maroon-100 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-maroon-600 font-bold tracking-wide uppercase">{duesConfig.label}</span>
                        <Badge className={`border-none font-bold uppercase ${
                          currentDuesPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : duesPending
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {currentDuesPaid ? "PAID" : duesPending ? "PENDING" : "UNPAID"}
                        </Badge>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-maroon-900">
                          ${(duesConfig.amountCents / 100).toFixed(2)}
                        </span>
                        <span className="text-xs text-maroon-500 font-medium">{duesConfig.year}</span>
                      </div>
                      <p className="text-[10px] text-maroon-500 leading-normal">
                        Dues are required to stay in active standing, attend chapter formals, and vote on bids/elections.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-maroon-50 mt-4">
                    {duesConfig.enabled ? (
                      currentDuesPaid ? (
                        <div className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
                          <Check className="w-4 h-4" />
                          Good Standing for {duesConfig.year}
                        </div>
                      ) : (
                        <Button
                          onClick={handlePayDues}
                          disabled={payingDues}
                          className="w-full bg-gradient-to-b from-maroon-700 to-maroon-900 hover:from-maroon-800 hover:to-maroon-950 text-cream-50 py-2.5 rounded-xl font-bold shadow-[0_8px_20px_-8px_rgba(74,17,29,0.6)] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
                        >
                          {payingDues ? (
                            <span>Redirecting to Stripe...</span>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4" />
                              Pay Dues Online
                            </>
                          )}
                        </Button>
                      )
                    ) : (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold text-center leading-normal">
                        Online Stripe dues payment is currently disabled. Please pay your Treasurer manually.
                      </div>
                    )}
                  </div>
                </div>

                {/* Past Transactions Ledger */}
                <div className="p-6 rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] md:col-span-2 space-y-4">
                  <h3 className="font-bold text-maroon-900 text-lg flex items-center gap-2">
                    <Clipboard className="w-5 h-5 text-maroon-600" />
                    Chapter Payment Ledger
                  </h3>

                  {duesPayments.length > 0 ? (
                    <div className="overflow-x-auto border border-maroon-50 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-cream-50 text-maroon-900 border-b border-maroon-100 font-bold uppercase tracking-wider">
                            <th className="p-3">Reference ID</th>
                            <th className="p-3">Term/Year</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Method</th>
                            <th className="p-3 text-center">Date</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-maroon-50">
                          {duesPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-cream-50/20 text-maroon-800">
                              <td className="p-3 font-mono text-[10px] text-maroon-900 font-bold">
                                {p.id.slice(0, 10).toUpperCase()}...
                              </td>
                              <td className="p-3 font-semibold text-maroon-950 uppercase">{p.year}</td>
                              <td className="p-3 font-bold">${(p.amountCents / 100).toFixed(2)}</td>
                              <td className="p-3">
                                <Badge className="border border-maroon-100 text-maroon-700 bg-cream-50/40 text-[10px] font-semibold">
                                  {p.method}
                                </Badge>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {p.duesPaidAt
                                  ? new Date(p.duesPaidAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                  : new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  p.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : p.status === "PENDING"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <PortalEmpty
                      icon={Clipboard}
                      illustration={IllustrationLedger}
                      title="No payment history"
                      sub="Your dues receipts and payment records will be listed here once you've paid."
                    />
                  )}
                </div>

              </div>

              {/* Reimbursement CTA — spent your own money for the chapter? */}
              <a
                href="/portal/brothers/reimbursements"
                className="group flex items-center justify-between gap-4 p-5 rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:border-maroon-200 hover:shadow-[0_18px_40px_-20px_rgba(74,17,29,0.35)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-maroon-800 text-cream-50 flex items-center justify-center shadow-sm flex-shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-maroon-900 text-base leading-tight">Submit a reimbursement</h3>
                    <p className="text-xs text-maroon-600 mt-0.5">
                      Paid out of pocket for the chapter? Request it back and track approval status.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-maroon-400 group-hover:text-maroon-700 transition flex-shrink-0" />
              </a>
            </div>
          )}

          {/* TAB 5: ALUMNI DIRECTORY */}
          {activeTab === "alumni" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-xl font-bold text-maroon-900">Alumni Directory</h2>
                <p className="text-xs text-maroon-600">Connect with graduated {terms.membersLower} for career advice, mentorship, and networking.</p>
              </div>

              {/* Filters Panel */}
              <div className="bg-white p-4 rounded-2xl border border-maroon-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-maroon-400" />
                  <input
                    type="text"
                    placeholder="Search by name, company, city..."
                    value={alumniSearch}
                    onChange={(e) => setAlumniSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900 placeholder:text-maroon-400"
                  />
                </div>

                <div>
                  <select
                    value={alumniYearFilter}
                    onChange={(e) => setAlumniYearFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                  >
                    <option value="">All Graduation Years</option>
                    {uniqueGraduationYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={alumniClassFilter}
                    onChange={(e) => setAlumniClassFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                  >
                    <option value="">All Pledge Classes</option>
                    {uniquePledgeClasses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alumni Grid */}
              {filteredAlumni.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAlumni.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] p-5 flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-maroon-200 hover:shadow-[0_18px_40px_-20px_rgba(74,17,29,0.35)]"
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-bold text-maroon-900 text-base leading-tight">
                              {a.preferredName ? `${a.fullName} (${a.preferredName})` : a.fullName}
                            </h3>
                            <span className="text-[11px] font-semibold text-amber-700 block mt-0.5">
                              Pledge Class: {a.pledgeClass || "N/A"} • Graduated {a.graduationYear}
                            </span>
                          </div>
                        </div>

                        {a.bio && (
                          <p className="text-xs text-maroon-600 line-clamp-3 leading-relaxed font-normal italic">
                            &ldquo;{a.bio}&rdquo;
                          </p>
                        )}

                        <div className="space-y-1 text-xs text-maroon-700">
                          {a.employer && (
                            <div className="flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-maroon-400" />
                              <span className="font-semibold text-maroon-900 truncate">
                                {a.jobTitle ? `${a.jobTitle} at ` : ""}{a.employer}
                              </span>
                            </div>
                          )}
                          {(a.city || a.state) && (
                            <div className="flex items-center gap-1.5">
                              <Search className="w-3.5 h-3.5 text-maroon-400" style={{ transform: 'rotate(45deg)' }} />
                              <span>{a.city || "Unknown"}{a.state ? `, ${a.state}` : ""}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-maroon-50 pt-3 flex flex-wrap gap-2 justify-between items-center text-xs">
                        <div className="flex gap-2">
                          {a.email && (
                            <a
                              href={`mailto:${a.email}`}
                              className="w-8 h-8 rounded-lg bg-cream-50 hover:bg-cream-100 flex items-center justify-center text-maroon-700 border border-maroon-100 transition"
                              title="Email Alumnus"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          {a.phone && (
                            <a
                              href={`tel:${a.phone}`}
                              className="w-8 h-8 rounded-lg bg-cream-50 hover:bg-cream-100 flex items-center justify-center text-maroon-700 border border-maroon-100 transition"
                              title="Call Alumnus"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        {a.linkedinUrl && (
                          <a
                            href={a.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-900 font-bold font-mono tracking-wider uppercase text-[10px]"
                          >
                            LinkedIn
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-maroon-100 rounded-2xl shadow-sm">
                  <PortalEmpty
                    icon={Users}
                    illustration={IllustrationSearch}
                    title="No alumni match your filters"
                    sub="Try clearing the search or choosing a different graduation year or pledge class."
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SURVEYS & POLLS */}
          {activeTab === "polls" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-xl font-bold text-maroon-900">Chapter Surveys</h2>
                <p className="text-xs text-maroon-600">Voice your opinion on upcoming social events, budgets, and chapter policy.</p>
              </div>

              {pollList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pollList.map((p) => {
                    const options = parsePollOptions(p.options);
                    const myVote = p.votes.find((v) => v.brotherId === brother.id);
                    const totalVotes = p.votes.length;

                    return (
                      <div
                        key={p.id}
                        className="rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] p-6 space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3.5">
                          <h3 className="font-bold text-maroon-900 text-lg leading-snug">{p.question}</h3>
                          <div className="space-y-2">
                            {options.map((o) => {
                              const optionVotes = p.votes.filter((v) => v.optionId === o.id).length;
                              const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                              const isSelected = myVote?.optionId === o.id;

                              return (
                                <button
                                  key={o.id}
                                  onClick={() => handleVote(p.id, o.id)}
                                  disabled={votingOnPollId === p.id}
                                  className={`w-full text-left p-3 rounded-xl border transition flex flex-col relative overflow-hidden group min-h-[50px] justify-center ${
                                    isSelected
                                      ? "border-maroon-800 bg-maroon-50/20"
                                      : "border-maroon-100 hover:border-maroon-300 hover:bg-cream-50/50"
                                  }`}
                                >
                                  {/* Vote Percentage progress overlay */}
                                  <div
                                    className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-550 ${
                                      isSelected ? "bg-maroon-200/25" : "bg-maroon-100/10"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  ></div>

                                  <div className="flex justify-between items-center z-10 w-full">
                                    <span className={`text-xs flex items-center gap-1.5 ${
                                      isSelected ? "text-maroon-900 font-bold" : "text-maroon-800 font-medium"
                                    }`}>
                                      {isSelected && <Check className="w-4 h-4 text-maroon-800 flex-shrink-0" />}
                                      {o.label}
                                    </span>
                                    <span className="text-[11px] font-extrabold text-maroon-900 font-mono">
                                      {pct}% ({optionVotes})
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="border-t border-maroon-50 pt-3 flex justify-between items-center text-[10px] text-maroon-500 font-semibold uppercase tracking-wider">
                          <span>Total Casts: {totalVotes}</span>
                          <span>
                            {p.closesAt
                              ? `Closes: ${new Date(p.closesAt).toLocaleDateString()}`
                              : "Open Poll"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-maroon-100 rounded-2xl shadow-sm">
                  <PortalEmpty
                    icon={FileText}
                    illustration={IllustrationInbox}
                    title="No active surveys"
                    sub="When officers open a chapter poll, you'll be able to cast your vote right here."
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PROFILE SETTINGS */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-xl font-bold text-maroon-900">Manage {terms.member} Profile</h2>
                <p className="text-xs text-maroon-600">Keep your major, contact info, bio, and headshot updated for chapter registry.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Preview Panel */}
                <div className="p-6 rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] md:col-span-1 flex flex-col items-center justify-between space-y-4">
                  <div className="text-center space-y-3.5 w-full">
                    <span className="text-xs font-semibold uppercase tracking-wider text-maroon-500">Registry Headshot</span>
                    <div className="w-32 h-32 rounded-2xl border border-maroon-100 bg-cream-50 overflow-hidden relative mx-auto flex items-center justify-center shadow-[0_10px_26px_-12px_rgba(74,17,29,0.35)]">
                      {profileForm.headshotUrl ? (
                        <img
                          src={avatarSrc(profileForm.headshotUrl, 256)}
                          alt={brother.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <InitialsAvatar name={brother.name} size={128} rounded="rounded-2xl" className="w-full h-full" />
                      )}
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-cream-50 text-[10px] font-bold">
                          Uploading...
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-maroon-900 text-lg leading-tight">{brother.name}</h4>
                      <Badge className="bg-amber-600 text-white border-none py-0.5 px-2 text-[10px] tracking-wider uppercase">
                        {brother.position || `ACTIVE ${terms.member.toUpperCase()}`}
                      </Badge>
                    </div>

                    <div className="pt-2">
                      <label className="inline-flex items-center gap-1.5 bg-cream-50 hover:bg-cream-100 text-maroon-800 border border-maroon-100 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        Upload New Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="w-full pt-4 border-t border-maroon-50 text-xs text-maroon-600 space-y-2">
                    <div className="flex justify-between">
                      <span>Initiated:</span>
                      <span className="font-semibold text-maroon-900">
                        {brother.initiationDate
                          ? new Date(brother.initiationDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Member Status:</span>
                      <span className="font-semibold text-maroon-900 uppercase">{brother.status}</span>
                    </div>
                  </div>
                </div>

                {/* Editable Profile Form */}
                <div className="p-6 rounded-2xl border border-maroon-100/80 bg-white/85 backdrop-blur-xl ring-1 ring-maroon-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_10px_30px_-16px_rgba(74,17,29,0.22)] md:col-span-2">
                  {profileError && (
                    <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                      {profileError}
                    </div>
                  )}

                  {profileSuccess && (
                    <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                      {profileSuccess}
                    </div>
                  )}

                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="e.g. (555) 555-5555"
                          className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                          Academic Class Year
                        </label>
                        <select
                          value={profileForm.year}
                          onChange={(e) => setProfileForm({ ...profileForm, year: e.target.value })}
                          className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                        >
                          <option value="">Select Year</option>
                          <option value="Freshman">Freshman</option>
                          <option value="Sophomore">Sophomore</option>
                          <option value="Junior">Junior</option>
                          <option value="Senior">Senior</option>
                          <option value="Graduate">Graduate Student</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                          Major/Field of Study
                        </label>
                        <input
                          type="text"
                          value={profileForm.major}
                          onChange={(e) => setProfileForm({ ...profileForm, major: e.target.value })}
                          placeholder="e.g. Mechanical Engineering"
                          className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Biography & Career Goals
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Write a brief bio outlining your current activities, interest areas, big/little linkages, and future career plans."
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900 resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                        Headshot URL (Optional Override)
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/photo.jpg"
                        value={profileForm.headshotUrl}
                        onChange={(e) => setProfileForm({ ...profileForm, headshotUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={savingProfile}
                        className="bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-bold px-6 py-2.5 rounded-xl shadow"
                      >
                        {savingProfile ? "Saving Profile..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <PublicFooter />

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
                  className="p-1 rounded-lg hover:bg-cream-50 text-maroon-500 hover:text-maroon-900 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-maroon-700 leading-relaxed font-normal space-y-2 whitespace-pre-wrap">
                {activeAnnouncement.body}
              </div>

              <div className="border-t border-maroon-50 pt-4 mt-6 flex justify-between items-center text-[10px] font-bold text-maroon-400 uppercase tracking-wider">
                <span>By: {activeAnnouncement.author?.name || "Chapter Officer"} {activeAnnouncement.author?.position ? `(${activeAnnouncement.author.position})` : ""}</span>
                <span>{new Date(activeAnnouncement.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RSVP EDIT MODAL */}
      {activeRsvpEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl border border-maroon-100 shadow-xl overflow-hidden animate-fade-in text-left">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-maroon-500 uppercase tracking-wider block mb-1">
                    Submit Response
                  </span>
                  <h3 className="font-bold text-maroon-900 text-base leading-snug">{activeRsvpEvent.name}</h3>
                </div>
                <button
                  onClick={() => {
                    setActiveRsvpEvent(null);
                    setRsvpNote("");
                  }}
                  className="p-1 rounded-lg hover:bg-cream-50 text-maroon-500 hover:text-maroon-900 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1.5">
                    Your Response Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { status: "GOING", label: "Going", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                      { status: "MAYBE", label: "Maybe", color: "bg-amber-50 border-amber-200 text-amber-800" },
                      { status: "NOT_GOING", label: "Declined", color: "bg-red-50 border-red-200 text-red-800" },
                    ].map((opt) => {
                      const isSel = rsvpStatus === opt.status;
                      return (
                        <button
                          key={opt.status}
                          type="button"
                          onClick={() => setRsvpStatus(opt.status as any)}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                            isSel ? `${opt.color} ring-2 ring-maroon-500` : "bg-cream-50/50 border-maroon-100 text-maroon-600 hover:bg-cream-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-maroon-900 mb-1">
                    Reason / Optional Note
                  </label>
                  <input
                    type="text"
                    maxLength={280}
                    placeholder={
                      rsvpStatus === "NOT_GOING"
                        ? "State your excuse for absence..."
                        : "Add note (dietary restrictions, tardiness details, etc.)"
                    }
                    value={rsvpNote}
                    onChange={(e) => setRsvpNote(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 border border-maroon-100 rounded-xl focus:outline-none focus:border-maroon-500 text-xs text-maroon-900"
                  />
                  <p className="text-[10px] text-maroon-500 mt-1">
                    Notes are visible to chapter officers. For absences, state your excuse clearly.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-maroon-50 flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setActiveRsvpEvent(null);
                    setRsvpNote("");
                  }}
                  variant="ghost"
                  className="text-maroon-700 hover:bg-cream-50 text-xs py-1 h-8 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRsvpSubmit}
                  disabled={rsvpLoading === activeRsvpEvent.id}
                  className="bg-maroon-800 hover:bg-maroon-900 text-cream-50 font-bold px-4 py-1 h-8 rounded-lg text-xs"
                >
                  {rsvpLoading === activeRsvpEvent.id ? "Submitting..." : "Save RSVP"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
