"use client";

import React, { useState, useEffect } from "react";

import {
  IconDashboard,
  IconRecruitment,
  IconMembers,
  IconEvents,
  IconCalendarTool,
  IconDues,
  IconTreasury,
  IconLaunch,
  IconWhiteLabel,
  IconSecurity,
  IconComms,
  IconAdmin,
  IconSpark,
  IconGrowth,
  IconChapter,
  IconAlumni,
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconAward,
  IconBallot,
  IconBell,
  IconBilling,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconCalendarPlus,
  IconCar,
  IconCheck,
  IconCheckCircle,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconClose,
  IconCrown,
  IconGift,
  IconHeart,
  IconInfo,
  IconKey,
  IconLock,
  IconLogIn,
  IconLogOut,
  IconMail,
  IconMap,
  IconMessage,
  IconPhone,
  IconPieChart,
  IconPin,
  IconQrCode,
  IconSchool,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconSubdomain,
  IconThumbsUp,
  IconTrash,
  IconUser,
  IconWallet,
  IconXCircle,
} from "@/components/brand/icons";

import {
  FRATERNITY_BRANDS,
  DEMO_TENANTS,
  DEMO_CALLOUTS,
  getMockDemoData,
  personaPosition,
  brandSecondary,
  glyphsFromBrand,
  darkenHex,
  makeCustomBrand,
  normalizeLetters,
  type Tenant,
  type MobileAppClientProps,
  type FraternityBrand,
} from "./_demo/mock-data";
import { GreekLetterField } from "@/components/site/greek-letter-field";
import { GreekstackLogo } from "@/components/brand/greekstack-logo";
import { ChapterIdentityBackdrop } from "./_demo/ChapterIdentityBackdrop";
import { useIsDesktopViewport } from "@/hooks/use-fine-pointer";
import type { DemoContext, QuickApplyJob } from "./_demo/context";
import {
  buildPickerChapters,
  singleTenantPreselect,
  type PickerChapter,
} from "@/lib/app-picker";
import { subdomainFromHost } from "@/lib/login-routing";
import { apiUrl } from "@/lib/mobile-api-base";
import { renderSchoolChapterPicker } from "./_demo/surfaces/SchoolChapterPickerSurface";
import { renderChapterChooser } from "./_demo/surfaces/ChapterChooserSurface";
import { renderLogin } from "./_demo/surfaces/LoginSurface";
import { renderFeedTab } from "./_demo/surfaces/FeedSurface";
import { renderEventsTab } from "./_demo/surfaces/EventsSurface";
import { renderRushTab } from "./_demo/surfaces/RushSurface";
import { renderDuesTab } from "./_demo/surfaces/DuesSurface";
import { renderDirectoryTab } from "./_demo/surfaces/DirectorySurface";
import { renderSettingsTab } from "./_demo/surfaces/SettingsSurface";
import { renderSpotlight } from "./_demo/surfaces/SpotlightSurface";
import { renderExec } from "./_demo/surfaces/ExecSurface";
import { MobileBillingBanner } from "./_demo/surfaces/MobileBillingBanner";
import { renderBookingModal } from "./_demo/modals/BookingModal";
import { renderPricingModal } from "./_demo/modals/PricingModal";
import { renderToast } from "./_demo/modals/Toast";
import { renderConfirmModal } from "./_demo/modals/ConfirmModal";
import { renderForgotPasswordModal } from "./_demo/modals/ForgotPasswordModal";
import { renderAddMemberModal } from "./_demo/modals/AddMemberModal";
import { renderPnmDetail } from "./_demo/modals/PnmDetailModal";
import { renderPostJobModal } from "./_demo/modals/PostJobModal";
import { renderPostAnnModal } from "./_demo/modals/PostAnnouncementModal";
import { renderEditProfileModal } from "./_demo/modals/EditProfileModal";

/** Browser-only: the chapter subdomain this webview is currently served on (or
 *  null on the apex). Used for single-tenant preselect so a deploy already
 *  serving a chapter host auto-selects that chapter. SSR-safe (returns null). */
function subdomainFromCurrentHost(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return subdomainFromHost(window.location.host);
  } catch {
    return null;
  }
}

export default function MobileAppClient({ initialTenants, hasRealChapters: hasRealChaptersProp }: MobileAppClientProps) {
  const [tenants] = useState<Tenant[]>(initialTenants);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<FraternityBrand>(FRATERNITY_BRANDS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [role, setRole] = useState<"brother" | "alumni">("brother");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Quick Apply and Career Notification states
  const [quickApplyJob, setQuickApplyJob] = useState<QuickApplyJob | null>(null);
  const [showGoogleInternshipBanner, setShowGoogleInternshipBanner] = useState(false);
  const [quickApplySubmitting, setQuickApplySubmitting] = useState(false);
  const [quickApplyNote, setQuickApplyNote] = useState("Hi, I'm interested in this role and would love to get a referral from you.");

  // The sample career-referral banner is a DEMO-ONLY showcase prop — it
  // illustrates the careers/referrals surface with a canned example. It must
  // never appear for a real signed-in member (that would be a fabricated job
  // posting), so it is gated strictly to demo mode.
  useEffect(() => {
    if (isDemo && token) {
      const timer = setTimeout(() => {
        setShowGoogleInternshipBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
    setShowGoogleInternshipBanner(false);
  }, [token, isDemo]);

  // ── iOS cold-start School → Chapter picker (entry mode) ───────────────────
  // entryMode decides what the FIRST screen is on mount:
  //   "picker"   — cold start (no ?demo, no saved session): the new
  //                school-grouped picker built from the real Tenant registry.
  //   "showcase" — ?demo=true (or a demo selection): the brand-grouped chooser
  //                + auto-demo showcase (the pre-existing behavior).
  //   "session"  — a restored localStorage session goes straight to the dash.
  // Starts as "picker" so SSR/first-paint is the clean entry; the mount effect
  // flips it to showcase/session as appropriate (so ?demo + saved sessions are
  // never a regression). `pickerStep` drives the two-step picker flow.
  const [entryMode, setEntryMode] = useState<"picker" | "showcase" | "session">("picker");
  const [pickerStep, setPickerStep] = useState<"school" | "chapter">("school");
  const [pickerSchool, setPickerSchool] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const hasRealChapters = hasRealChaptersProp ?? initialTenants.length > 0;

  // ── Owner-requested demo controls ────────────────────────────────────────
  // viewRole flips the WHOLE dashboard between the member experience ("member"
  // = active brother: feed/events/dues/directory) and the officer experience
  // ("exec" = roster mgmt, dues mgmt, rush pipeline, announcements, settings).
  // Distinct from `role` (brother vs alumni) which selects member vs alumni
  // data; viewRole layers an officer lens on top of the brother experience.
  const [viewRole, setViewRole] = useState<"member" | "exec">("member");
  // Owner round-7: the demo is framed as "the real app, seen as different
  // people" — a single VIEW SWITCHER (left rail on desktop, header menu on
  // mobile) replaces the old Member/Officer toggle inside the phone. The
  // mobile menu's open state lives here.
  const [showViewMenu, setShowViewMenu] = useState(false);
  // When true, the chapter chooser overlay is shown so the visitor can pick a
  // different org (or build a custom one) WITHOUT signing out of the demo.
  const [showChapterChooser, setShowChapterChooser] = useState(false);
  // Custom-chapter builder form (the "enter ANY org" path). Lives in the
  // orchestrator so the stateless chooser surface can read/write it via ctx.
  const [chooserMode, setChooserMode] = useState<"pick" | "create">("pick");
  const [customName, setCustomName] = useState("");
  const [customLetters, setCustomLetters] = useState("");
  const [customSchool, setCustomSchool] = useState("");
  const [customPrimary, setCustomPrimary] = useState("#512888");
  const [customSecondary, setCustomSecondary] = useState("#C9A227");

  // Demo Side Panel Modals & States
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  // Forgot password mobile states
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // 3D Perspective Tilt & Glare States — these power the DESKTOP showcase device
  // frame ONLY. On a phone the demo is the full-bleed real mobile app with ZERO
  // 3D (no tilt, no glare, no perspective). isDesktopShowcase gates every 3D
  // effect to the lg+ layout that actually renders the chassis.
  const isDesktopShowcase = useIsDesktopViewport();
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHoveringPhone, setIsHoveringPhone] = useState(false);

  // Sober Driving & New Member Simulator States
  const [isRushActive, setIsRushActive] = useState(true);
  const [simulatedDay, setSimulatedDay] = useState<"Friday" | "Saturday" | "Other">("Friday");
  const [simulatedHour, setSimulatedHour] = useState<number>(23); // 11 PM
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "schedule">("directory");
  const [soberAssignments, setSoberAssignments] = useState<Record<string, string>>({
    "Friday-22": "pnm3", // Michael Chang (Friday 10pm-12am)
    "Friday-00": "pnm1", // John Doe (Friday 12am-2am)
    "Saturday-22": "pnm2", // Sarah Jenkins (Saturday 10pm-12am)
    "Saturday-00": "pnm4", // David Smith (Saturday 12am-2am)
  });

  // Owner round-5 ("the demo moves too much — people need to INTERACT with it"):
  // the cursor-tracked 3D tilt + moving glare made the phone — the very surface
  // the visitor is reading and tapping — shift under the pointer. All three
  // handlers are now inert no-ops (kept so the demo ctx contract is unchanged);
  // the chassis renders flat with a static shadow + static glare.
  const handlePhoneMouseMove = (_e: React.MouseEvent<HTMLDivElement>) => {};
  const handlePhoneMouseEnter = () => {};
  const handlePhoneMouseLeave = () => {};
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Presidential Admin Console states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"actives" | "alumni">("actives");
  const [newMemberPosition, setNewMemberPosition] = useState("");
  const [newMemberGradYear, setNewMemberGradYear] = useState(new Date().getFullYear().toString());
  
  // Tab navigation states
  const [activeTab, setActiveTab] = useState<"feed" | "events" | "rush" | "dues" | "directory" | "settings">("feed");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Search & sub-tab filters
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterTab, setRosterTab] = useState<"actives" | "alumni" | "careers">("actives");
  const [rsvpSubmittingId, setRsvpSubmittingId] = useState<string | null>(null);

  // Rush tab states
  const [rushSearch, setRushSearch] = useState("");
  const [rushFilter, setRushFilter] = useState<"ALL" | "ACTIVE" | "BID_EXTENDED" | "DROPPED">("ALL");
  const [selectedPnm, setSelectedPnm] = useState<any | null>(null);
  const [newImpressionNote, setNewImpressionNote] = useState("");
  const [newImpressionTone, setNewImpressionTone] = useState<"positive" | "neutral" | "concern">("positive");
  const [userVoteInput, setUserVoteInput] = useState<number>(0);

  // Job posting form state
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobContactName, setJobContactName] = useState("");
  const [jobContactEmail, setJobContactEmail] = useState("");
  const [jobContactPhone, setJobContactPhone] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [postJobError, setPostJobError] = useState<string | null>(null);
  const [postJobSuccess, setPostJobSuccess] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Dynamic Custom Demo Features States
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    // Native shell only (no-op on web): fire a matching notification haptic so a
    // success/error reads in the hand, not just the eye.
    try {
      window.GreekStackNative?.hapticNotify?.(type === "error" ? "error" : "success");
    } catch {
      /* ignore — web has no haptics */
    }
  };
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [showPostAnnModal, setShowPostAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annPinned, setAnnPinned] = useState(false);
  const [postAnnSuccess, setPostAnnSuccess] = useState(false);
  const [jobCrossPost, setJobCrossPost] = useState(true);

  // ── New interactive demo surfaces (Elections · Treasury · Giving · QR · Theme)
  // A modal "spotlight" surface lets the demo showcase every feature without
  // overloading the 5-slot bottom nav. Each is fully stateful (votes mutate
  // tallies, the QR check-in adds a PNM, donations move the campaign meter).
  const [spotlight, setSpotlight] = useState<
    null | "elections" | "treasury" | "giving" | "qr" | "theme"
  >(null);
  // Secret-ballot local state: which candidate the viewer chose per seat (never
  // sent anywhere — anonymity is the whole point). Tallies live in dashboardData.
  const [myBallot, setMyBallot] = useState<Record<string, string>>({});
  const [donationCents, setDonationCents] = useState<number>(2500);
  const [donationDone, setDonationDone] = useState(false);
  // QR check-in: a tiny new-PNM form that drops the rushee straight into the
  // pipeline so the funnel updates live, mirroring the real public check-in page.
  const [qrName, setQrName] = useState("");
  const [qrMajor, setQrMajor] = useState("");
  const [qrYear, setQrYear] = useState("Freshman");
  const [qrCheckedIn, setQrCheckedIn] = useState<string[]>([]);

  // Cast a secret ballot for one seat. Idempotent per seat.
  //   • DEMO: mutate the local tally (no backend) so the showcase is interactive.
  //   • REAL: POST to /api/mobile/elections/vote (tenant-bound, member-gated, one
  //     ballot per seat enforced server-side) and replace the local election +
  //     myBallot with the SERVER's refreshed truth — no fabricated tally.
  const castBallot = async (seatId: string, candidateId: string) => {
    if (myBallot[seatId]) return;

    if (isDemo) {
      setMyBallot((prev) => ({ ...prev, [seatId]: candidateId }));
      setDashboardData((prev: any) => {
        if (!prev?.election) return prev;
        const firstVote = Object.keys(myBallot).length === 0;
        return {
          ...prev,
          election: {
            ...prev.election,
            ballotsCast: prev.election.ballotsCast + (firstVote ? 1 : 0),
            seats: prev.election.seats.map((s: any) =>
              s.id !== seatId
                ? s
                : {
                    ...s,
                    candidates: s.candidates.map((c: any) =>
                      c.id === candidateId ? { ...c, votes: c.votes + 1 } : c
                    ),
                  }
            ),
          },
        };
      });
      showToast("Anonymous ballot recorded. Your choice is never linked to you.", "success");
      return;
    }

    // REAL session — record the vote against the backend.
    if (!selectedTenant || !token) return;
    try {
      const res = await fetch(apiUrl("/api/mobile/elections/vote"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subdomain: selectedTenant.subdomain, seatId, candidateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        // Adopt the server's refreshed tally + this voter's own choices.
        setDashboardData((prev: any) =>
          prev ? { ...prev, election: data.election, myBallot: data.myBallot } : prev,
        );
        setMyBallot(data.myBallot || {});
        showToast("Anonymous ballot recorded. Your choice is never linked to you.", "success");
      } else if (res.status === 401) {
        handleSignOut();
      } else if (res.status === 409) {
        // Already voted (e.g. on another device) — sync local state to match.
        setMyBallot((prev) => ({ ...prev, [seatId]: candidateId }));
        showToast(data.error || "You have already voted for this seat.", "info");
      } else {
        showToast(data.error || "Couldn't record your vote. Try again.", "error");
      }
    } catch {
      showToast("Couldn't reach the chapter to record your vote. Try again.", "error");
    }
  };

  // Add a donation to the live campaign meter. DEMO-ONLY: the Giving spotlight is
  // gated to the demo (no real Stripe campaign-donation flow ships yet), so this
  // mutates the demo's local meter and NEVER claims a real Stripe charge. On any
  // non-demo session this is a guarded no-op (defense in depth — the surface is
  // already isDemo-gated, but the handler must not toast a charge that did not
  // happen either).
  const handleDonate = () => {
    if (!isDemo) return;
    setDashboardData((prev: any) => {
      if (!prev?.giving) return prev;
      return {
        ...prev,
        giving: {
          ...prev.giving,
          raisedCents: prev.giving.raisedCents + donationCents,
          donorCount: prev.giving.donorCount + 1,
          recent: [
            { id: `g-${Date.now()}`, name: `${prev.profile?.name || "You"} (just now)`, amountCents: donationCents },
            ...prev.giving.recent,
          ].slice(0, 5),
        },
      };
    });
    setDonationDone(true);
    // Demo-honest copy — this is a sample campaign, not a real Stripe charge.
    showToast(`Thanks! $${(donationCents / 100).toFixed(2)} added to the sample campaign.`, "success");
    setTimeout(() => setDonationDone(false), 2500);
  };

  // QR check-in → add a brand-new PNM to the recruitment pipeline. DEMO-ONLY: the
  // QR spotlight is gated to the demo, so this mutates the demo's local pipeline
  // and never claims a real save. Guarded no-op on a non-demo session (defense in
  // depth — no "added to the rush board" toast for an action that didn't persist).
  const handleQrCheckIn = () => {
    if (!isDemo) return;
    if (!qrName.trim()) return;
    const id = `pnm-${Date.now()}`;
    const newPnm = {
      id,
      name: qrName.trim(),
      major: qrMajor.trim() || "Undeclared",
      year: qrYear,
      hometown: "—",
      phone: "(803) 555-0100",
      status: "ACTIVE",
      attendanceCount: 1,
      votesAverage: 0,
      votesCount: 0,
    };
    setDashboardData((prev: any) => ({
      ...prev,
      pnms: [newPnm, ...(prev?.pnms || [])],
    }));
    setQrCheckedIn((prev) => [qrName.trim(), ...prev]);
    setQrName("");
    setQrMajor("");
    showToast(`${newPnm.name} checked in and added to the rush board.`, "success");
  };

  // ── Interactive demo callouts ────────────────────────────────────────────
  // In demo mode we float a small, dismissible "tour" text-box inside the phone
  // that explains the feature on the tab the visitor is currently viewing. It
  // re-appears (with fresh copy) whenever they switch tabs, so exploring the app
  // teaches them what each tool does. A separate "dismissed entirely" flag lets a
  // visitor turn the tour off for the rest of the session.
  const [calloutVisible, setCalloutVisible] = useState(true);
  const [calloutDismissed, setCalloutDismissed] = useState(false);
  // One-time Officer-console welcome (shows the first time the visitor flips
  // the role toggle to Officer; doubles as the demo's conversion beat).
  const [execTipSeen, setExecTipSeen] = useState(false);
  // Re-show the per-tab callout each time the active tab changes (unless the
  // visitor turned the tour off). Keyed on activeTab so each tab gets its tip.
  useEffect(() => {
    if (!calloutDismissed) setCalloutVisible(true);
  }, [activeTab, calloutDismissed]);

  // Native shell only (no-op on web): a selection tick when the member switches
  // bottom-nav tabs, so the app feels native in-hand. Skips the very first mount
  // (no tick on initial render).
  const didMountTabHaptic = React.useRef(false);
  useEffect(() => {
    if (!didMountTabHaptic.current) {
      didMountTabHaptic.current = true;
      return;
    }
    try {
      window.GreekStackNative?.hapticSelection?.();
    } catch {
      /* ignore — web has no haptics */
    }
  }, [activeTab]);

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editHometown, setEditHometown] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLinkedIn, setEditLinkedIn] = useState("");

  useEffect(() => {
    if (showEditProfileModal && dashboardData?.profile) {
      const p = dashboardData.profile;
      setEditPhone(p.phone || "");
      setEditHometown(p.hometown || "");
      setEditYear(p.year || "");
      setEditMajor(p.major || "");
      setEditCompany(p.employer || "");
      setEditJobTitle(p.jobTitle || "");
      setEditCity(p.city || "");
      setEditState(p.state || "");
      setEditBio(p.bio || "");
      setEditLinkedIn(p.linkedinUrl || "");
    }
  }, [showEditProfileModal, dashboardData]);

  // ── Picker chapter set (real + demo merged, deduped) ──────────────────────
  // Built once from the registry rows passed by app/app/page.tsx. Real chapters
  // win over same-subdomain demos so the canonical live Phi-Sig appears "Live".
  // This is the SOURCE for the cold-start School → Chapter picker.
  const pickerChapters = React.useMemo<PickerChapter[]>(
    () => buildPickerChapters(initialTenants as any),
    [initialTenants],
  );

  // Combine real and demo chapters for picker
  const allChapters = React.useMemo(() => {
    const dbTenants = tenants.map(t => {
      // Deduce matching brand or fallback
      let bId = "phi-sig";
      const nameLower = (t.name || t.subdomain).toLowerCase();
      if (nameLower.includes("sigma chi")) bId = "sig-chi";
      else if (nameLower.includes("kappa sigma")) bId = "kap-sig";
      else if (nameLower.includes("alpha tau")) bId = "ato";
      else if (nameLower.includes("sae") || nameLower.includes("epsilon")) bId = "sae";
      else if (nameLower.includes("beta")) bId = "beta";
      return { ...t, brandId: bId };
    });
    // Remove database items that match demo subdomains to prevent duplicates
    const filteredDb = dbTenants.filter(t => !DEMO_TENANTS.some(dt => dt.subdomain === t.subdomain));
    return [...DEMO_TENANTS, ...filteredDb];
  }, [tenants]);

  // Load session or check URL params for ?demo=true onboarding bypass
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      // ?demo=true → the brand-grouped showcase (existing behavior), NOT the
      // cold-start school picker. Mark the entry mode so the render branch shows
      // the ChapterChooser/auto-demo instead of the school picker.
      setEntryMode("showcase");
      const demoTenant = DEMO_TENANTS[0]; // Phi Sigma Kappa
      const brand = FRATERNITY_BRANDS[0];
      const demoUser = {
        id: "demo-user-id",
        email: "alex.mercer@sc.edu",
        role: "brother",
        brotherId: "demo-brother-id",
        subdomain: demoTenant.subdomain,
        chapterName: demoTenant.name,
        schoolName: demoTenant.school
      };

      setSelectedTenant(demoTenant);
      setSelectedBrand(brand);
      setToken("demo-token-12345");
      setUser(demoUser);
      setRole("brother");
      setIsDemo(true);
      setDashboardData(getMockDemoData(demoTenant, brand, viewRole === "exec" ? "exec" : role === "alumni" ? "alumni" : "member"));
      // ?pick=1 — the landing page's "see YOUR chapter" deep link: open the
      // chapter chooser overlay immediately over the running demo, so the very
      // first thing the visitor does is make the app theirs (one action from
      // arrival → reskin moment). Dismissible via the chooser's Close button.
      if (params.get("pick") === "1") {
        setChooserMode("pick");
        setShowChapterChooser(true);
      }
      setLoading(false);
      return;
    }

    const savedToken = localStorage.getItem("gs_mobile_token");
    const savedUser = localStorage.getItem("gs_mobile_user");
    const savedTenant = localStorage.getItem("gs_mobile_tenant");
    const savedBrand = localStorage.getItem("gs_mobile_brand");

    if (savedToken && savedUser && savedTenant) {
      try {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setRole(parsedUser.role);
        setSelectedTenant(JSON.parse(savedTenant));
        setIsDemo(parsedUser.id.startsWith("demo-") || parsedUser.brotherId?.startsWith("demo-") || parsedUser.alumniId?.startsWith("demo-"));
        if (savedBrand) {
          setSelectedBrand(JSON.parse(savedBrand));
        }
        // A restored session goes straight to the dashboard — never the picker.
        setEntryMode("session");
      } catch (e) {
        localStorage.clear();
      }
    } else {
      // ── COLD START (Step 0) ──────────────────────────────────────────────
      // No ?demo, no saved session → the new School → Chapter picker is the
      // first screen. Single-tenant preselect (Step 6): if exactly one REAL
      // chapter exists (or the deploy is already serving a chapter host), skip
      // straight into that chapter's login so the existing one-tap Phi-Sig
      // single-tenant flow is never a regression.
      setEntryMode("picker");
      const currentSub = subdomainFromCurrentHost();
      const sole = singleTenantPreselect(pickerChapters, currentSub);
      if (sole && sole.source === "real") {
        applyPickerChapter(sole, { skipAdvance: true });
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load saved demo data from localStorage on initialization
  useEffect(() => {
    if (isDemo && selectedTenant) {
      const savedBallots = localStorage.getItem(`gs_demo_ballots_${selectedTenant.id}`);
      if (savedBallots) {
        try {
          setMyBallot(JSON.parse(savedBallots));
        } catch {}
      }
      const savedDbData = localStorage.getItem(`gs_demo_dashboard_${selectedTenant.id}`);
      if (savedDbData) {
        try {
          const restored = JSON.parse(savedDbData);
          // member/exec consistency: the restored snapshot carries whatever
          // persona the visitor LAST viewed (e.g. "President" after exploring the
          // Exec board). On a fresh /app?demo=true entry the view switcher resets
          // to the member persona, so a blind restore would render President while
          // "Active brother" is selected — the inconsistency this fixes. Reconcile
          // profile.position to the CURRENT persona (derived from viewRole/role)
          // so the selected persona and the rendered position can never disagree.
          // Demo-display only — never forges a REAL session's server position.
          const currentPersona = viewRole === "exec" ? "exec" : role === "alumni" ? "alumni" : "member";
          if (restored?.profile) {
            restored.profile = { ...restored.profile, position: personaPosition(currentPersona) };
          }
          setDashboardData(restored);
        } catch {}
      }
    }
    // viewRole/role are read to align the restored persona; this effect only
    // re-runs on demo/tenant change (a persona switch already re-skins position
    // via setViewPersona, so it must NOT re-read localStorage here and clobber
    // in-session ballots/donations).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, selectedTenant]);

  // Persist demo state changes
  useEffect(() => {
    if (isDemo && selectedTenant && Object.keys(myBallot).length > 0) {
      localStorage.setItem(`gs_demo_ballots_${selectedTenant.id}`, JSON.stringify(myBallot));
    }
  }, [myBallot, isDemo, selectedTenant]);

  useEffect(() => {
    if (isDemo && selectedTenant && dashboardData) {
      localStorage.setItem(`gs_demo_dashboard_${selectedTenant.id}`, JSON.stringify(dashboardData));
    }
  }, [dashboardData, isDemo, selectedTenant]);

  // ── Refetch the real dashboard payload (used after exec writes persist) ────
  // A thin, side-effect-light reload of /api/mobile/data so an officer's
  // add/remove/announce shows the SERVER's new truth (not just local state).
  // No loading spinner flip — it's a background refresh after a successful
  // write that already toasted. Demo sessions short-circuit (they mutate local
  // state directly). Safe to call any time we hold a real token + tenant.
  const refetchDashboardData = React.useCallback(async () => {
    if (!token || !selectedTenant || isDemo) return;
    try {
      const res = await fetch(
        apiUrl(`/api/mobile/data?subdomain=${selectedTenant.subdomain}`),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        setDashboardData(data);
        if (data.myBallot && typeof data.myBallot === "object") {
          setMyBallot(data.myBallot);
        }
        try {
          void window.GreekStackNative?.cacheLastView?.(data);
        } catch {
          /* ignore */
        }
      } else if (res.status === 401) {
        handleSignOut();
      }
    } catch {
      /* keep the current view on a transient refetch failure */
    }
    // handleSignOut is stable for the component's lifetime; intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTenant, isDemo]);

  // Fetch real portal data when authenticated in non-demo mode
  useEffect(() => {
    if (!token || !selectedTenant || isDemo) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // apiUrl() keeps this same-origin on web ("/api/mobile/data") but
        // rewrites it to the absolute platform origin in the bundled native
        // app, where a relative path would hit capacitor://localhost instead
        // of the hosted backend.
        const res = await fetch(apiUrl(`/api/mobile/data?subdomain=${selectedTenant.subdomain}`), {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setDashboardData(data);
          // Seed the local ballot map from the SERVER's record of this member's
          // own cast ballots so the elections spotlight shows their "Voted" state
          // correctly on load (the server is the source of truth, not local).
          if (data.myBallot && typeof data.myBallot === "object") {
            setMyBallot(data.myBallot);
          }
          // Native shell only (no-op on web): snapshot the last good view so the
          // app can show the chapter offline on the next cold launch.
          try {
            void window.GreekStackNative?.cacheLastView?.(data);
          } catch {
            /* ignore */
          }
        } else {
          setError(data.error || "Failed to load chapter data.");
          if (res.status === 401) {
            handleSignOut();
          }
        }
      } catch (err) {
        // Native shell only: fall back to the cached last view when offline so
        // the member still sees their chapter instead of a dead error screen.
        let recovered = false;
        try {
          const cached = await window.GreekStackNative?.readLastView?.();
          if (cached?.data) {
            setDashboardData(cached.data);
            recovered = true;
          }
        } catch {
          /* ignore — web has no cache */
        }
        if (!recovered) setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, selectedTenant, isDemo]);

  // Handle tenant selection in picker
  const handleSelectTenant = (t: Tenant) => {
    const brand = FRATERNITY_BRANDS.find(b => b.id === t.brandId) || FRATERNITY_BRANDS[0];
    setSelectedTenant(t);
    setSelectedBrand(brand);
    
    // Auto-login logic for demo chapters to keep it fast
    if (t.id.startsWith("demo-")) {
      setIsDemo(true);
      setLoading(true);
      setTimeout(() => {
        const demoUser = {
          id: "demo-user-id",
          email: `alex.mercer@${t.subdomain}.edu`,
          role: "brother",
          brotherId: "demo-brother-id",
          subdomain: t.subdomain,
          chapterName: t.name,
          schoolName: t.school
        };
        setToken("demo-token-12345");
        setUser(demoUser);
        setRole("brother");
        setDashboardData(getMockDemoData(t, brand, viewRole === "exec" ? "exec" : role === "alumni" ? "alumni" : "member"));
        
        localStorage.setItem("gs_mobile_token", "demo-token-12345");
        localStorage.setItem("gs_mobile_user", JSON.stringify(demoUser));
        localStorage.setItem("gs_mobile_tenant", JSON.stringify(t));
        localStorage.setItem("gs_mobile_brand", JSON.stringify(brand));
        
        setLoading(false);
      }, 300);
    } else {
      setIsDemo(false);
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  // ── iOS cold-start picker: route a chosen School→Chapter selection ────────
  // A DEMO chapter routes into the instant mock auto-login (the showcase still
  // works with zero backend). A REAL chapter sets the tenant + its resolved
  // brand and leaves `token` null so the themed LoginSurface renders and then
  // POSTs to the tenant-bound /api/mobile/auth — NO cross-origin redirect, so
  // the Bearer token stays on the apex /app webview (routing decision: pass the
  // subdomain as a parameter, per the subdomain registry architecture).
  const applyPickerChapter = (c: PickerChapter, opts?: { skipAdvance?: boolean }) => {
    const tenant: Tenant = {
      id: c.id,
      subdomain: c.subdomain,
      name: c.name,
      school: c.school,
      isActive: true,
      domain: c.domain,
      brandId: c.brand.id,
    };
    setSelectedBrand(c.brand);

    if (c.source === "demo") {
      // Instant demo auto-login — mirrors handleSelectTenant's demo path so the
      // showcase is reachable straight from the school picker with no backend.
      setSelectedTenant(tenant);
      setIsDemo(true);
      setLoading(true);
      setTimeout(() => {
        const demoUser = {
          id: "demo-user-id",
          email: `alex.mercer@${c.subdomain}.edu`,
          role: "brother",
          brotherId: "demo-brother-id",
          subdomain: c.subdomain,
          chapterName: c.name,
          schoolName: c.school,
        };
        setToken("demo-token-12345");
        setUser(demoUser);
        setRole("brother");
        setDashboardData(getMockDemoData(tenant, c.brand, viewRole === "exec" ? "exec" : role === "alumni" ? "alumni" : "member"));
        try {
          localStorage.setItem("gs_mobile_token", "demo-token-12345");
          localStorage.setItem("gs_mobile_user", JSON.stringify(demoUser));
          localStorage.setItem("gs_mobile_tenant", JSON.stringify(tenant));
          localStorage.setItem("gs_mobile_brand", JSON.stringify(c.brand));
        } catch {
          /* best-effort */
        }
        setLoading(false);
      }, 300);
      return;
    }

    // REAL chapter → themed login (token stays null → renderLogin runs).
    setIsDemo(false);
    setToken(null);
    setUser(null);
    setError(null);
    setSelectedTenant(tenant);
  };

  // Picker selection handler handed to the surface via ctx.
  const handlePickPickerChapter = (c: PickerChapter) => applyPickerChapter(c);

  // "Just exploring? See a live demo" — enter the brand-grouped showcase from
  // the school picker. Switches entry mode and auto-logs into the Phi-Sig demo
  // (same destination as ?demo=true), without a navigation.
  const enterDemoShowcase = () => {
    setEntryMode("showcase");
    const demoTenant = DEMO_TENANTS[0];
    const brand = FRATERNITY_BRANDS[0];
    const demoUser = {
      id: "demo-user-id",
      email: "alex.mercer@sc.edu",
      role: "brother",
      brotherId: "demo-brother-id",
      subdomain: demoTenant.subdomain,
      chapterName: demoTenant.name,
      schoolName: demoTenant.school,
    };
    setSelectedTenant(demoTenant);
    setSelectedBrand(brand);
    setToken("demo-token-12345");
    setUser(demoUser);
    setRole("brother");
    setIsDemo(true);
    setDashboardData(getMockDemoData(demoTenant, brand, "member"));
    setLoading(false);
  };

  // ── Apply a chosen brand to the live demo without a full re-login ─────────
  // Powers the in-app chapter chooser (feature 1): pick a preset OR build a
  // custom org, and the ENTIRE demo re-skins to it instantly. Builds a demo
  // tenant around the brand, re-seeds the mock data, and closes the chooser.
  const applyBrandToDemo = (brand: FraternityBrand, opts?: { name?: string; school?: string }) => {
    const name = opts?.name || brand.name;
    const school = opts?.school || "University of South Carolina";
    const sub = (name || brand.id).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "chapter";
    const tenant: Tenant = {
      id: `demo-${sub}`,
      subdomain: sub,
      name,
      school,
      isActive: true,
      brandId: brand.id,
    };
    const demoUser = {
      id: "demo-user-id",
      email: `alex.mercer@${sub}.edu`,
      role: "brother",
      brotherId: "demo-brother-id",
      subdomain: sub,
      chapterName: name,
      schoolName: school,
    };
    setSelectedTenant(tenant);
    setSelectedBrand(brand);
    setToken("demo-token-12345");
    setUser(demoUser);
    setRole("brother");
    setIsDemo(true);
    setDashboardData(getMockDemoData(tenant, brand, viewRole === "exec" ? "exec" : role === "alumni" ? "alumni" : "member"));
    setLoading(false);
    setActiveTab("feed");
    setShowChapterChooser(false);
    // Celebrate the reskin — THE demo moment. Toast + success haptic (native
    // shell) so picking your chapter lands as an event, not a silent swap.
    showToast(`${brand.letters} ${name} is live. The whole app just became yours.`, "success");
    try {
      localStorage.setItem("gs_mobile_token", "demo-token-12345");
      localStorage.setItem("gs_mobile_user", JSON.stringify(demoUser));
      localStorage.setItem("gs_mobile_tenant", JSON.stringify(tenant));
      localStorage.setItem("gs_mobile_brand", JSON.stringify(brand));
    } catch {
      /* localStorage best-effort in the demo */
    }
  };

  // Build + apply a brand-new custom chapter from the chooser's "create" form.
  const applyCustomChapter = () => {
    const letters = normalizeLetters(customLetters) || "ΦΣΚ";
    const brand = makeCustomBrand({
      name: customName,
      letters,
      primaryColor: customPrimary,
      secondaryColor: customSecondary,
    });
    applyBrandToDemo(brand, {
      name: customName.trim() || "Your Chapter",
      school: customSchool.trim() || "Your University",
    });
    // applyBrandToDemo already fires the celebration toast — a second one here
    // immediately overwrote it (taste pass: one event, one toast).
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setAuthLoading(true);
    setError(null);
    // Native shell only (no-op on web): a light tap confirms the primary action.
    try {
      window.GreekStackNative?.hapticImpact?.("light");
    } catch {
      /* ignore */
    }

    if (isDemo) {
      setTimeout(() => {
        const demoUser = {
          id: "demo-user-id",
          email: email || `user@${selectedTenant.subdomain}.edu`,
          role: role,
          brotherId: role === "brother" ? "demo-brother-id" : null,
          alumniId: role === "alumni" ? "demo-alumni-id" : null,
          subdomain: selectedTenant.subdomain,
          chapterName: selectedTenant.name,
          schoolName: selectedTenant.school
        };
        setToken("demo-token-12345");
        setUser(demoUser);
        setDashboardData(getMockDemoData(selectedTenant, selectedBrand, role === "alumni" ? "alumni" : viewRole === "exec" ? "exec" : "member"));
        
        localStorage.setItem("gs_mobile_token", "demo-token-12345");
        localStorage.setItem("gs_mobile_user", JSON.stringify(demoUser));
        localStorage.setItem("gs_mobile_tenant", JSON.stringify(selectedTenant));
        localStorage.setItem("gs_mobile_brand", JSON.stringify(selectedBrand));
        
        setEmail("");
        setPassword("");
        setAuthLoading(false);
      }, 500);
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/mobile/auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: selectedTenant.subdomain,
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setToken(data.token);
        setUser(data.user);

        localStorage.setItem("gs_mobile_token", data.token);
        localStorage.setItem("gs_mobile_user", JSON.stringify(data.user));
        localStorage.setItem("gs_mobile_tenant", JSON.stringify(selectedTenant));
        localStorage.setItem("gs_mobile_brand", JSON.stringify(selectedBrand));

        // Native shell only (no-ops on web): persist the session on-device for
        // biometric unlock next launch. window.GreekStackNative is published by
        // <NativeBridge/> and self-guards via Capacitor.isNativePlatform().
        try {
          await window.GreekStackNative?.saveSession?.({
            token: data.token,
            user: data.user,
            subdomain: selectedTenant.subdomain,
          });
        } catch {
          /* native-only; ignore on web */
        }

        setEmail("");
        setPassword("");
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch (err) {
      setError("Server connection failed. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    // Native shell only (no-op on web): drop the on-device session too.
    try {
      void window.GreekStackNative?.clearSession?.();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setSelectedTenant(null);
    setDashboardData(null);
    setError(null);
    setIsDemo(false);
    setActiveTab("feed");
    setRosterSearch("");
    setRushSearch("");
    setSelectedPnm(null);
  };

  // ── Account deletion (Apple 5.1.1(v) blocker) ─────────────────────────────
  // The signed-in member can delete their OWN PortalUser account (+ cascade)
  // from the Profile screen. Confirm → DELETE /api/mobile/account → sign out →
  // back to the picker. Demo sessions never hit the API (there's no real
  // account to delete) — they just confirm + reset to the picker so the flow is
  // visible to a reviewer. App Store requires an in-app account-deletion path.
  const [accountDeleting, setAccountDeleting] = useState(false);
  const handleDeleteAccount = () => {
    setConfirmModal({
      title: "Delete your account?",
      message:
        "This permanently deletes your Greek Stack account and your member data for this chapter. This cannot be undone.",
      onConfirm: async () => {
        // Demo: no real account — just demonstrate the flow back to the picker.
        if (isDemo) {
          showToast("Account deleted. (Demo — nothing was changed.)", "success");
          handleSignOut();
          return;
        }
        if (!selectedTenant || !token || accountDeleting) return;
        setAccountDeleting(true);
        try {
          window.GreekStackNative?.hapticNotify?.("warning");
        } catch {
          /* ignore */
        }
        try {
          const res = await fetch(
            apiUrl(`/api/mobile/account?subdomain=${selectedTenant.subdomain}`),
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            showToast("Your account has been deleted.", "success");
            handleSignOut(); // clears local + native session, returns to picker
          } else {
            showToast(
              data.error || "Couldn't delete your account. Try again or contact your chapter.",
              "error",
            );
          }
        } catch {
          showToast("Network error deleting your account. Try again.", "error");
        } finally {
          setAccountDeleting(false);
        }
      },
    });
  };

  // Add-to-calendar: build a real RFC-5545 .ics file in the browser and trigger a
  // download so the member can drop the event straight into Google / iCloud /
  // Outlook — exactly what the live app does (no server round-trip needed).
  const handleAddToCalendar = (e: any) => {
    const dt = (iso: string) =>
      new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const start = dt(e.startsAt);
    const end = dt(e.endsAt || new Date(new Date(e.startsAt).getTime() + 2 * 3600000).toISOString());
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Greekstack//Demo//EN",
      "BEGIN:VEVENT",
      `UID:${e.id}@greekstack.demo`,
      `DTSTAMP:${dt(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${(e.name || "Chapter Event").replace(/\n/g, " ")}`,
      `LOCATION:${(e.location || "").replace(/\n/g, " ")}`,
      `DESCRIPTION:${(e.description || "").replace(/\n/g, " ")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    try {
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(e.name || "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* download is best-effort in the demo */
    }
    showToast("Added to your calendar. Opens in Google, iCloud, or Outlook.", "success");
  };

  const handleRsvp = async (eventId: string, status: "GOING" | "MAYBE" | "NOT_GOING") => {
    if (!selectedTenant || !token) return;

    if (isDemo) {
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        const updatedEvents = prev.events.map((e: any) => {
          if (e.id === eventId) {
            return { ...e, myRsvp: { status } };
          }
          return e;
        });
        return { ...prev, events: updatedEvents };
      });
      return;
    }

    setRsvpSubmittingId(eventId);

    try {
      const res = await fetch(apiUrl("/api/mobile/events/rsvp"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subdomain: selectedTenant.subdomain,
          eventId,
          status,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setDashboardData((prev: any) => {
          if (!prev) return prev;
          const updatedEvents = prev.events.map((e: any) => {
            if (e.id === eventId) {
              return { ...e, myRsvp: { status } };
            }
            return e;
          });
          return { ...prev, events: updatedEvents };
        });
      }
    } catch (err) {
      console.error("RSVP failed:", err);
    } finally {
      setRsvpSubmittingId(null);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !token) return;

    setPostJobError(null);
    setPostJobSuccess(false);

    const jobData = {
      title: jobTitle,
      company: jobCompany,
      location: jobLocation,
      salary: jobSalary,
      contactName: jobContactName,
      contactEmail: jobContactEmail,
      contactPhone: jobContactPhone,
      description: jobDescription,
      requirements: jobRequirements,
    };

    if (isDemo) {
      const mockJob = {
        id: `demo-job-${Date.now()}`,
        ...jobData,
        postedByName: user.name || "Alex Mercer",
        postedByRole: role,
        createdAt: new Date().toISOString(),
      };

      // Create a teaser announcement if cross-post is enabled
      const newAnnouncements = [...(dashboardData?.announcements || [])];
      if (jobCrossPost) {
        newAnnouncements.unshift({
          id: `demo-ann-job-${Date.now()}`,
          title: `Career Opp: ${jobTitle} at ${jobCompany}`,
          body: `${user.name || "Alex Mercer"} (${role === "alumni" ? "Alumnus" : "President"}) posted a new career opportunity: ${jobTitle} in ${jobLocation || "Remote"}. Qualification: ${jobRequirements || "None specified"}. Check details and apply in the Careers Directory!`,
          pinned: false,
          createdAt: new Date().toISOString(),
          authorName: user.name || "Alex Mercer",
          authorRole: role === "alumni" ? "Alumni" : "President",
        });
      }

      setDashboardData((prev: any) => ({
        ...prev,
        careers: [mockJob, ...(prev.careers || [])],
        announcements: newAnnouncements
      }));

      showToast("Job opportunity posted!", "success");
      setPostJobSuccess(true);
      resetJobForm();
      setTimeout(() => {
        setPostJobSuccess(false);
        setShowPostJobModal(false);
      }, 1000);
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/mobile/career/post"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subdomain: selectedTenant.subdomain,
          ...jobData
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setDashboardData((prev: any) => ({
          ...prev,
          careers: [data.job, ...(prev.careers || [])]
        }));
        showToast("Job opportunity posted!", "success");
        setPostJobSuccess(true);
        resetJobForm();
        setTimeout(() => {
          setPostJobSuccess(false);
          setShowPostJobModal(false);
        }, 1000);
      } else {
        setPostJobError(data.error || "Failed to post job listing.");
      }
    } catch (err) {
      setPostJobError("Network error. Please try again.");
    }
  };

  const resetJobForm = () => {
    setJobTitle("");
    setJobCompany("");
    setJobLocation("");
    setJobSalary("");
    setJobContactName("");
    setJobContactEmail("");
    setJobContactPhone("");
    setJobDescription("");
    setJobRequirements("");
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardData) return;
    if (!annTitle.trim() || !annBody.trim()) {
      showToast("Add a title and a message.", "error");
      return;
    }

    // REAL officer session → persist via the shared route contract
    // /api/mobile/exec/announce (server re-gates on capabilities.exec), then
    // refetch so the new post shows the server's canonical row.
    if (!isDemo) {
      if (!selectedTenant || !token) return;
      try {
        const res = await fetch(apiUrl("/api/mobile/exec/announce"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subdomain: selectedTenant.subdomain,
            title: annTitle.trim(),
            body: annBody.trim(),
            pinned: annPinned,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setPostAnnSuccess(true);
          setAnnTitle("");
          setAnnBody("");
          setAnnPinned(false);
          showToast("Announcement published!", "success");
          await refetchDashboardData();
          setTimeout(() => {
            setPostAnnSuccess(false);
            setShowPostAnnModal(false);
          }, 1000);
        } else if (res.status === 403) {
          showToast("Only chapter officers can post announcements.", "error");
        } else {
          showToast(data.error || "Couldn't publish the announcement. Try again.", "error");
        }
      } catch {
        showToast("Network error publishing announcement. Try again.", "error");
      }
      return;
    }

    const mockAnn = {
      id: `demo-ann-${Date.now()}`,
      title: annTitle.trim(),
      body: annBody.trim(),
      pinned: annPinned,
      createdAt: new Date().toISOString(),
      authorName: user.name || "Alex Mercer",
      authorRole: role === "alumni" ? "Alumni" : "President",
    };

    setDashboardData((prev: any) => {
      const updatedAnn = [mockAnn, ...(prev.announcements || [])];
      return {
        ...prev,
        announcements: updatedAnn
      };
    });

    setPostAnnSuccess(true);
    setAnnTitle("");
    setAnnBody("");
    setAnnPinned(false);
    showToast("Announcement published!", "success");
    setTimeout(() => {
      setPostAnnSuccess(false);
      setShowPostAnnModal(false);
    }, 1000);
  };

  const [savingProfile, setSavingProfile] = useState(false);
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardData) return;

    const isAlum = role === "alumni";

    // The optimistic local mutation applied to dashboardData on success — shared
    // by the demo path (local-only) and the real path (after the server confirms).
    const applyLocal = () => {
      const updatedProfile = {
        ...dashboardData.profile,
        phone: editPhone,
        hometown: editHometown,
        year: editYear,
        major: editMajor,
        ...(isAlum ? {
          employer: editCompany,
          jobTitle: editJobTitle,
          city: editCity,
          state: editState,
          bio: editBio,
          linkedinUrl: editLinkedIn,
        } : {})
      };

      let updatedRoster = { ...dashboardData.roster };
      if (!isAlum) {
        updatedRoster.actives = (updatedRoster.actives || []).map((b: any) =>
          b.id === dashboardData.profile.id
            ? { ...b, phone: editPhone, year: editYear, major: editMajor }
            : b,
        );
      } else {
        updatedRoster.alumni = (updatedRoster.alumni || []).map((al: any) =>
          al.id === dashboardData.profile.id
            ? {
                ...al,
                phone: editPhone,
                employer: editCompany,
                jobTitle: editJobTitle,
                city: editCity,
                state: editState,
                bio: editBio,
                linkedinUrl: editLinkedIn,
              }
            : al,
        );
      }

      setDashboardData((prev: any) => ({
        ...prev,
        profile: updatedProfile,
        roster: updatedRoster,
      }));
    };

    // DEMO: local-only showcase (honest — there is no real backend session). The
    // toast is fine because nothing is claimed to persist server-side.
    if (isDemo) {
      applyLocal();
      showToast("Profile updated successfully!", "success");
      setShowEditProfileModal(false);
      return;
    }

    // REAL member: persist via the wired endpoint. Success toast ONLY on res.ok;
    // a fabricated "updated" toast for a write that never happened is exactly the
    // anti-fabrication failure this is fixing. Only safe self-editable fields are
    // sent — the server independently rejects anything else.
    if (!selectedTenant || !token) return;
    setSavingProfile(true);
    try {
      const payload: Record<string, string> = isAlum
        ? {
            phone: editPhone,
            employer: editCompany,
            jobTitle: editJobTitle,
            city: editCity,
            state: editState,
            bio: editBio,
            linkedinUrl: editLinkedIn,
          }
        : {
            phone: editPhone,
            year: editYear,
            major: editMajor,
            hometown: editHometown,
          };
      const res = await fetch(apiUrl("/api/mobile/account"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subdomain: selectedTenant.subdomain, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        applyLocal();
        showToast("Profile updated successfully!", "success");
        setShowEditProfileModal(false);
      } else {
        showToast(data.error || "Couldn't save your profile. Try again.", "error");
      }
    } catch {
      showToast("Network error saving your profile. Try again.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Simulated Stripe Payment process
  const handleSimulateStripePay = () => {
    showToast("Securing connection to Stripe Connect...", "info");
    setTimeout(() => {
      setDashboardData((prev: any) => {
        if (!prev) return prev;
        const newPayment = {
          id: `demo-pay-${Date.now()}`,
          amountCents: prev.dues?.config?.amountCents || 45000,
          year: prev.dues?.config?.year || "2026-fall",
          status: "PAID",
          method: "STRIPE",
          createdAt: new Date().toISOString(),
          notes: "Online Payment Settled via Stripe Passthrough"
        };
        return {
          ...prev,
          profile: { ...prev.profile, duesPaid: true },
          dues: {
            ...prev.dues,
            isPaid: true,
            payments: [newPayment, ...(prev.dues.payments || [])]
          }
        };
      });
      showToast("Payment Complete! Stripe Connect reconciled successfully.", "success");
    }, 1000);
  };

  // ── REAL dues checkout (blocker) ──────────────────────────────────────────
  // A signed-in member taps "Pay online with Stripe" → we POST to the shared
  // route contract POST /api/dues/checkout (Bearer + subdomain so it resolves
  // the brother + chapter cross-origin from the native shell) and OPEN the
  // returned Stripe Checkout URL. On native, window.open(_blank) hands the URL
  // to the system browser / SFSafariViewController (Capacitor routes external
  // https there); on web it's a same-tab redirect. Dues are a real-world
  // membership paid via the chapter's Stripe — NOT Apple IAP. We never touch
  // card data and never auto-charge (the member completes the flow in Stripe).
  const [duesCheckoutLoading, setDuesCheckoutLoading] = useState(false);
  const handleStartDuesCheckout = async () => {
    // Demo sessions have no real Stripe — keep the offline simulation.
    if (isDemo) {
      handleSimulateStripePay();
      return;
    }
    if (!selectedTenant || !token || duesCheckoutLoading) return;
    setDuesCheckoutLoading(true);
    try {
      window.GreekStackNative?.hapticImpact?.("light");
    } catch {
      /* ignore */
    }
    showToast("Opening secure Stripe checkout…", "info");
    try {
      const res = await fetch(apiUrl("/api/dues/checkout"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // subdomain in the body so the cross-origin native call resolves the
        // chapter the same way the other mobile routes do (the route reads the
        // verified session + this subdomain, never a client-trusted amount).
        body: JSON.stringify({ subdomain: selectedTenant.subdomain }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.url) {
        // Open Stripe Checkout. _blank → system browser on native; same-origin
        // redirect on web. The member finishes payment in Stripe, not in-app.
        try {
          const w = window.open(data.url, "_blank");
          if (!w) window.location.href = data.url; // popup-blocked fallback (web)
        } catch {
          window.location.href = data.url;
        }
      } else if (res.status === 409) {
        // Already paid — reflect it so the surface flips to "settled".
        setDashboardData((prev: any) =>
          prev?.dues ? { ...prev, dues: { ...prev.dues, isPaid: true } } : prev,
        );
        showToast(data.error || "You're already marked paid for this term.", "info");
      } else {
        showToast(
          data.error || "Online dues aren't available right now. Pay via your treasurer.",
          "error",
        );
      }
    } catch {
      showToast("Couldn't reach Stripe. Check your connection and try again.", "error");
    } finally {
      setDuesCheckoutLoading(false);
    }
  };

  // Vote on PNM in Rush tab (Simulation)
  const handlePnmVote = (pnmId: string, score: number) => {
    if (!isDemo) {
      showToast("Voting on PNMs is available in offline demo mode.", "info");
      return;
    }
    
    setDashboardData((prev: any) => {
      if (!prev || !prev.pnms) return prev;
      const updatedPnms = prev.pnms.map((p: any) => {
        if (p.id === pnmId) {
          const hadPrior = p.myVote !== null;
          const delta = score - (p.myVote || 0);
          const newVotesCount = p.votesCount + (hadPrior ? 0 : 1);
          const newVotesSum = (p.votesAverage * p.votesCount) + delta;
          const newAvg = parseFloat((newVotesSum / newVotesCount).toFixed(2));
          
          const updated = {
            ...p,
            myVote: score,
            votesCount: newVotesCount,
            votesAverage: newAvg
          };
          if (selectedPnm && selectedPnm.id === pnmId) {
            setSelectedPnm(updated);
          }
          return updated;
        }
        return p;
      });
      return { ...prev, pnms: updatedPnms };
    });
    showToast(`Vote (${score > 0 ? '+' : ''}${score}) registered successfully.`, "success");
  };

  // Add impression note on PNM (Simulation)
  const handleAddImpression = (e: React.FormEvent, pnmId: string) => {
    e.preventDefault();
    if (!newImpressionNote.trim()) return;

    if (!isDemo) {
      showToast("Adding impressions is supported in offline demo mode.", "info");
      return;
    }

    const newNote = {
      authorName: user.name || "Alex Mercer",
      tone: newImpressionTone,
      note: newImpressionNote.trim()
    };

    setDashboardData((prev: any) => {
      if (!prev || !prev.pnms) return prev;
      const updatedPnms = prev.pnms.map((p: any) => {
        if (p.id === pnmId) {
          const updated = {
            ...p,
            impressions: [...p.impressions, newNote]
          };
          if (selectedPnm && selectedPnm.id === pnmId) {
            setSelectedPnm(updated);
          }
          return updated;
        }
        return p;
      });
      return { ...prev, pnms: updatedPnms };
    });

    setNewImpressionNote("");
    showToast("Vibe note added to PNM card.", "success");
  };

  // Simulate Check-In door scanner — DEMO ONLY. For a real member there is no
  // persistence pipeline behind this, so claiming "Checked in successfully!" would
  // fabricate a result. Gate it to demo with an honest info toast otherwise
  // (mirrors handlePnmVote / handleAddImpression).
  const handleSimulateCheckIn = (pnmId: string) => {
    if (!isDemo) {
      showToast("Door check-in is available in offline demo mode.", "info");
      return;
    }
    setDashboardData((prev: any) => {
      if (!prev || !prev.pnms) return prev;
      const updatedPnms = prev.pnms.map((p: any) => {
        if (p.id === pnmId) {
          const updated = {
            ...p,
            attendanceCount: p.attendanceCount + 1
          };
          if (selectedPnm && selectedPnm.id === pnmId) {
            setSelectedPnm(updated);
          }
          return updated;
        }
        return p;
      });
      return { ...prev, pnms: updatedPnms };
    });
    showToast("Checked in successfully! Attendance count updated.", "success");
  };

  // Forgot password handler (Mobile) — wired to the REAL rate-limited endpoint
  // POST /api/portal/forgot-password. The endpoint is anti-enumeration (it always
  // returns ok:true when the email shape is valid, whether or not an account
  // exists), so success is shown ONLY on res.ok — never a setTimeout that fakes a
  // "sent" toast for a request that never happened. Demo sessions have no real
  // backend, so they keep the local-only confirmation, honestly framed.
  const handleMobileForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    if (isDemo) {
      setForgotLoading(true);
      setTimeout(() => {
        setForgotLoading(false);
        setForgotSuccess(true);
        showToast("Demo mode: reset link not actually sent.", "info");
        setTimeout(() => {
          setForgotSuccess(false);
          setShowForgotPassword(false);
          setForgotEmail("");
        }, 1500);
      }, 600);
      return;
    }

    if (!selectedTenant) {
      showToast("Select your chapter first.", "error");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch(apiUrl("/api/portal/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: selectedTenant.subdomain,
          email: forgotEmail.trim().toLowerCase(),
          role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setForgotSuccess(true);
        showToast(
          "If your email is registered, a password reset link has been sent.",
          "success",
        );
        setTimeout(() => {
          setForgotSuccess(false);
          setShowForgotPassword(false);
          setForgotEmail("");
        }, 1500);
      } else {
        showToast(data.error || "Couldn't send a reset link. Try again.", "error");
      }
    } catch {
      showToast("Network error sending the reset link. Try again.", "error");
    } finally {
      setForgotLoading(false);
    }
  };

  // Presidential Admin: Add member
  // Demo → mutate local mock roster (offline showcase). REAL officer session →
  // POST the shared route contract /api/mobile/exec/roster {action:'add'} so the
  // change PERSISTS server-side (capabilities.exec recomputed on the server; a
  // non-officer is 403'd there regardless of any client flag), then refetch so
  // the roster reflects the server's truth.
  const handleAddMobileMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      showToast("Member name is required.", "error");
      return;
    }

    if (!isDemo) {
      if (!selectedTenant || !token) return;
      try {
        const res = await fetch(apiUrl("/api/mobile/exec/roster"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subdomain: selectedTenant.subdomain,
            action: "add",
            roster: newMemberRole,
            name: newMemberName.trim(),
            email: newMemberEmail.trim() || null,
            phone: newMemberPhone.trim() || null,
            position: newMemberRole === "actives" ? newMemberPosition.trim() || null : null,
            graduationYear:
              newMemberRole === "alumni"
                ? parseInt(newMemberGradYear, 10) || new Date().getFullYear()
                : null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          showToast(`${newMemberName.trim()} added to the roster.`, "success");
          setNewMemberName("");
          setNewMemberEmail("");
          setNewMemberPhone("");
          setNewMemberPosition("");
          setNewMemberRole("actives");
          setShowAddMemberModal(false);
          await refetchDashboardData();
        } else if (res.status === 403) {
          showToast("Only chapter officers can add members.", "error");
        } else {
          showToast(data.error || "Couldn't add the member. Try again.", "error");
        }
      } catch {
        showToast("Network error adding member. Try again.", "error");
      }
      return;
    }

    const newId = `demo-member-${Date.now()}`;
    const newMember: any = {
      id: newId,
      name: newMemberName.trim(),
      email: newMemberEmail.trim() || null,
      phone: newMemberPhone.trim() || null,
      pledgeClass: "Beta Gamma",
      status: "ACTIVE",
    };

    if (newMemberRole === "actives") {
      newMember.position = newMemberPosition.trim() || "Member";
      newMember.year = "Sophomore";
      newMember.major = "Business Administration";
    } else {
      newMember.graduationYear = parseInt(newMemberGradYear, 10) || new Date().getFullYear();
      newMember.employer = "Self-Employed";
      newMember.jobTitle = "Consultant";
      newMember.city = "Los Angeles";
      newMember.state = "CA";
      newMember.bio = "Happy to connect with actives!";
    }

    setDashboardData((prev: any) => {
      if (!prev) return prev;
      const updatedRoster = { ...prev.roster };
      if (newMemberRole === "actives") {
        updatedRoster.actives = [...(updatedRoster.actives || []), newMember];
      } else {
        updatedRoster.alumni = [...(updatedRoster.alumni || []), newMember];
      }
      return {
        ...prev,
        roster: updatedRoster,
      };
    });

    showToast(`${newMemberName} added to directory.`, "success");

    // Reset form
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberPhone("");
    setNewMemberPosition("");
    setNewMemberRole("actives");
    setShowAddMemberModal(false);
  };

  // Presidential Admin: Remove member
  // Demo → drop from the local mock roster. REAL officer session → confirm,
  // then POST /api/mobile/exec/roster {action:'remove'} (server re-gates on
  // capabilities.exec) and refetch so the removal persists.
  const handleRemoveMobileMember = (id: string, name: string, memberType: "actives" | "alumni") => {
    setConfirmModal({
      title: "Remove Member?",
      message: `Are you sure you want to remove ${name} from the roster? This cannot be undone.`,
      onConfirm: async () => {
        if (!isDemo) {
          if (!selectedTenant || !token) return;
          try {
            const res = await fetch(apiUrl("/api/mobile/exec/roster"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                subdomain: selectedTenant.subdomain,
                action: "remove",
                roster: memberType,
                memberId: id,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok) {
              showToast(`${name} removed from the roster.`, "success");
              await refetchDashboardData();
            } else if (res.status === 403) {
              showToast("Only chapter officers can remove members.", "error");
            } else {
              showToast(data.error || "Couldn't remove the member. Try again.", "error");
            }
          } catch {
            showToast("Network error removing member. Try again.", "error");
          }
          return;
        }

        setDashboardData((prev: any) => {
          if (!prev) return prev;
          const updatedRoster = { ...prev.roster };
          if (memberType === "actives") {
            updatedRoster.actives = (updatedRoster.actives || []).filter((b: any) => b.id !== id);
          } else {
            updatedRoster.alumni = (updatedRoster.alumni || []).filter((al: any) => al.id !== id);
          }
          return {
            ...prev,
            roster: updatedRoster,
          };
        });
        showToast(`${name} removed from roster.`, "success");
      }
    });
  };

  // Presidential Admin: Send reset link
  // Demo → just toast. REAL officer session → POST /api/mobile/exec/reset, which
  // actually sends the member a password-reset email (server re-gates on
  // capabilities.exec).
  const handleSendMobileResetLink = async (email: string | null, name: string) => {
    if (!email) {
      showToast(`No email on file for ${name}.`, "error");
      return;
    }
    if (!isDemo) {
      if (!selectedTenant || !token) return;
      showToast(`Sending a reset link to ${email}…`, "info");
      try {
        const res = await fetch(apiUrl("/api/mobile/exec/reset"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subdomain: selectedTenant.subdomain, email }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          showToast(`Password reset link sent to ${email}.`, "success");
        } else if (res.status === 403) {
          showToast("Only chapter officers can send reset links.", "error");
        } else {
          showToast(data.error || "Couldn't send the reset link. Try again.", "error");
        }
      } catch {
        showToast("Network error sending reset link. Try again.", "error");
      }
      return;
    }
    showToast(`Password reset link sent to ${email}`, "success");
  };

  // Filters for chapter list search
  const filteredChapters = allChapters.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.school && t.school.toLowerCase().includes(q)) ||
      t.subdomain.toLowerCase().includes(q)
    );
  });

  // Merge announcements and career opportunities into a unified Feed
  const combinedFeed = React.useMemo(() => {
    if (!dashboardData) return [];
    
    const rawAnnouncements = (dashboardData.announcements || []).map((a: any) => ({
      ...a,
      feedType: "announcement" as const,
      sortDate: new Date(a.createdAt)
    }));
    
    const rawCareers = (dashboardData.careers || []).map((c: any) => ({
      ...c,
      feedType: "career" as const,
      sortDate: new Date(c.createdAt),
      title: `Career Post: ${c.title}`
    }));
    
    return [...rawAnnouncements, ...rawCareers].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.sortDate.getTime() - a.sortDate.getTime();
    });
  }, [dashboardData]);

  // Single context bundle handed to every extracted demo surface/modal render
  // function. All state/handlers live here in the orchestrator; the surfaces are
  // plain functions of `ctx` (no hooks), inlined via `{renderX(ctx)}`, so render
  // behavior is byte-identical to the previous inline JSX.
  const ctx: DemoContext = {
    tenants, selectedTenant, setSelectedTenant, selectedBrand, setSelectedBrand,
    searchQuery, setSearchQuery, role, setRole, email, setEmail, password, setPassword,
    token, setToken, user, setUser, isDemo, setIsDemo,
    viewRole, setViewRole,
    quickApplyJob, setQuickApplyJob,
    // Server-enforced exec gate mirror (demo OR capabilities.exec). Computed
    // inline so the surfaces can render/enable officer-only writes only when the
    // server cleared this session; every write is ALSO re-gated server-side.
    execAllowed: isDemo || dashboardData?.capabilities?.exec === true,
    showChapterChooser, setShowChapterChooser, applyBrandToDemo,
    chooserMode, setChooserMode, customName, setCustomName, customLetters, setCustomLetters,
    customSchool, setCustomSchool, customPrimary, setCustomPrimary, customSecondary, setCustomSecondary,
    applyCustomChapter,
    showPricingModal, setShowPricingModal, showBookingModal, setShowBookingModal,
    bookingDate, setBookingDate, bookingTime, setBookingTime, bookingName, setBookingName,
    bookingEmail, setBookingEmail, bookingSubmitted, setBookingSubmitted,
    showForgotPassword, setShowForgotPassword,
    rotateX, setRotateX, rotateY, setRotateY, glarePosition, setGlarePosition,
    isHoveringPhone, setIsHoveringPhone,
    handlePhoneMouseMove, handlePhoneMouseEnter, handlePhoneMouseLeave,
    isRushActive, setIsRushActive, simulatedDay, setSimulatedDay, simulatedHour, setSimulatedHour,
    activeSubTab, setActiveSubTab, soberAssignments, setSoberAssignments,
    forgotEmail, setForgotEmail, forgotLoading, setForgotLoading, forgotSuccess, setForgotSuccess,
    showAddMemberModal, setShowAddMemberModal, newMemberName, setNewMemberName,
    newMemberEmail, setNewMemberEmail, newMemberPhone, setNewMemberPhone,
    newMemberRole, setNewMemberRole, newMemberPosition, setNewMemberPosition,
    newMemberGradYear, setNewMemberGradYear,
    activeTab, setActiveTab, loading, setLoading, authLoading, setAuthLoading,
    error, setError, dashboardData, setDashboardData,
    expandedAnnouncementId, setExpandedAnnouncementId, rosterSearch, setRosterSearch,
    rosterTab, setRosterTab, rsvpSubmittingId, setRsvpSubmittingId,
    rushSearch, setRushSearch, rushFilter, setRushFilter, selectedPnm, setSelectedPnm,
    newImpressionNote, setNewImpressionNote, newImpressionTone, setNewImpressionTone,
    userVoteInput, setUserVoteInput,
    showPostJobModal, setShowPostJobModal, jobTitle, setJobTitle, jobCompany, setJobCompany,
    jobLocation, setJobLocation, jobSalary, setJobSalary, jobContactName, setJobContactName,
    jobContactEmail, setJobContactEmail, jobContactPhone, setJobContactPhone,
    jobDescription, setJobDescription, jobRequirements, setJobRequirements,
    postJobError, setPostJobError, postJobSuccess, setPostJobSuccess, expandedJobId, setExpandedJobId,
    toast, setToast, showToast, confirmModal, setConfirmModal,
    showPostAnnModal, setShowPostAnnModal, annTitle, setAnnTitle, annBody, setAnnBody,
    annPinned, setAnnPinned, postAnnSuccess, setPostAnnSuccess, jobCrossPost, setJobCrossPost,
    spotlight, setSpotlight, myBallot, setMyBallot, donationCents, setDonationCents,
    donationDone, setDonationDone, qrName, setQrName, qrMajor, setQrMajor,
    qrYear, setQrYear, qrCheckedIn, setQrCheckedIn,
    castBallot, handleDonate, handleQrCheckIn,
    calloutVisible, setCalloutVisible, calloutDismissed, setCalloutDismissed,
    showEditProfileModal, setShowEditProfileModal, editPhone, setEditPhone,
    editHometown, setEditHometown, editYear, setEditYear, editMajor, setEditMajor,
    editCompany, setEditCompany, editJobTitle, setEditJobTitle, editCity, setEditCity,
    editState, setEditState, editBio, setEditBio, editLinkedIn, setEditLinkedIn,
    pickerStep, setPickerStep, pickerSchool, setPickerSchool, pickerQuery, setPickerQuery,
    pickerChapters, hasRealChapters, handlePickPickerChapter, enterDemoShowcase,
    allChapters, filteredChapters, combinedFeed,
    handleSelectTenant, handleSignIn, handleSignOut, handleAddToCalendar, handleRsvp,
    handlePostJob, resetJobForm, handlePostAnnouncement, handleSaveProfile, savingProfile,
    handleSimulateStripePay, handleStartDuesCheckout, duesCheckoutLoading,
    handlePnmVote, handleAddImpression, handleSimulateCheckIn,
    handleMobileForgotSubmit, handleAddMobileMember, handleRemoveMobileMember,
    handleSendMobileResetLink,
    handleDeleteAccount, accountDeleting,
  };

  // ── Full-screen chapter theming (feature 2) ──────────────────────────────
  // The entire demo shell shifts to the chosen chapter's colors, with their
  // Greek letters drifting behind everything. Derived once per render from the
  // selected brand so picking a chapter dramatically, visibly transforms the
  // whole experience.
  const brandPrimary = selectedBrand.primaryColor;
  const brandSecond = brandSecondary(selectedBrand);
  const brandDeep = darkenHex(brandPrimary, 0.62);
  const brandGlyphs = glyphsFromBrand(selectedBrand.letters);

  // ── View personas (owner round-7) ─────────────────────────────────────────
  // The demo shows the REAL app; the only demo control is "who am I viewing it
  // as". Three personas map onto the existing role/viewRole state pair:
  //   member → active brother experience (feed/events/rush/dues/network)
  //   exec   → exec-board console (roster/announce/rush pipeline/dues/settings)
  //   alumni → alumnus experience (feed/events/giving/network/profile)
  type ViewPersona = "member" | "exec" | "alumni";
  const viewPersona: ViewPersona =
    viewRole === "exec" ? "exec" : role === "alumni" ? "alumni" : "member";

  // ── SERVER-ENFORCED exec gate (market-critical RBAC) ──────────────────────
  // For a REAL (non-demo) session the exec lens is allowed ONLY when the API
  // said so: `capabilities.exec` is computed server-side from the verified
  // session role + the member's admin-set Brother.position (which the member
  // cannot edit on their own row). A regular member can NOT flip into exec by
  // poking client state — and even if they did, the API never served exec-only
  // data to them. The DEMO is a sales showcase with no real session, so it
  // keeps free persona switching (so a prospect can OFFER themselves the exec
  // showcase from the persona switcher).
  const execAllowed = isDemo || dashboardData?.capabilities?.exec === true;

  // member/exec leak fix (owner: "why is exec tools on member"): `execAllowed`
  // means the exec lens is OFFERABLE — but in the member persona we must not
  // bleed exec affordances into the member screen. The header toggle below is an
  // exec control; for a REAL cleared officer it always toggles, but in the DEMO
  // it only acts as an exec toggle once the visitor has ALREADY chosen the exec
  // persona (so they can flip back) — the canonical way into exec in the demo is
  // the explicit "Viewing as → Exec board" switcher, never a button sitting on
  // the member view. `execActive` = the exec lens is currently SELECTED.
  const execActive = viewPersona === "exec";
  // The header control should behave as an exec toggle only when the exec lens is
  // genuinely in play for THIS persona: a real officer (execAllowed && !isDemo)
  // may toggle from anywhere; the demo only exposes the toggle while already in
  // the exec persona, keeping the member persona free of exec controls.
  const execToggleActive = execActive || (execAllowed && !isDemo);

  // dues-visibility fix (owner: "dues is hiding if they do not have them set
  // up"): the Dues surface must reflect whether the chapter ACTUALLY enabled
  // online dues — never be force-shown just because we're in the demo. For a
  // REAL session the authority is the server flag `capabilities.duesEnabled`
  // (computed from the chapter's `dues.enabled` SiteConfig, fail-closed). In the
  // DEMO there is no server capability object, so we read the demo chapter's own
  // dues config (`dues.config.enabled`) — so a demo chapter without dues set up
  // hides the surface exactly like a real one would, instead of always showing.
  const duesVisible = isDemo
    ? dashboardData?.dues?.config?.enabled === true
    : dashboardData?.capabilities?.duesEnabled === true;

  const setViewPersona = (p: ViewPersona) => {
    if (p === viewPersona) {
      setShowViewMenu(false);
      return;
    }
    // Hard gate: a non-officer real member can never enter the exec lens. (The
    // exec persona is also hidden from the switcher below, so this is belt-and-
    // suspenders against a stale/forced click.)
    if (p === "exec" && !execAllowed) {
      setShowViewMenu(false);
      return;
    }
    if (p === "exec") {
      setRole("brother");
      setViewRole("exec");
    } else if (p === "alumni") {
      setRole("alumni");
      setViewRole("member");
    } else {
      setRole("brother");
      setViewRole("member");
    }

    // Demo-only: re-skin the mock profile's position so the showcase reads as
    // the chosen persona. NEVER done for a real session — forging a member's
    // position client-side would be exactly the privilege-escalation this gate
    // exists to prevent. A real session's position comes only from the server.
    if (isDemo && dashboardData?.profile) {
      setDashboardData((prev: any) => {
        if (!prev || !prev.profile) return prev;
        return {
          ...prev,
          profile: {
            // member/exec fix: only the EXEC persona is an officer ("President").
            // The plain member persona must read as a member — previously it
            // fell through to "President" too, mislabeling a regular brother as
            // an officer in the demo header.
            ...prev.profile,
            position: personaPosition(p)
          }
        };
      });
    }

    setActiveTab("feed");
    setShowViewMenu(false);
  };
  // Sub-lines are SHORT on purpose: the rail cards are 240px of text width and
  // the owner's round-7 screenshot caught the long middot strings truncating
  // into orphan ellipses ("…net…", "…p…"). Three words max — they must fit.
  const VIEW_PERSONAS: { id: ViewPersona; icon: any; label: string; sub: string }[] = [
    { id: "member", icon: IconMembers, label: "Active brother", sub: "Feed, events and dues" },
    { id: "exec", icon: IconSecurity, label: "Exec board", sub: "Roster, treasury and posts" },
    { id: "alumni", icon: IconAlumni, label: "Alumnus", sub: "Network, giving and jobs" },
  ];
  // The switcher only OFFERS the exec persona to someone the server cleared for
  // it (real officer, or the demo showcase). A regular member never sees the
  // "Exec board" option — it isn't in their menu and the gate above blocks it.
  const visiblePersonas = VIEW_PERSONAS.filter((p) => p.id !== "exec" || execAllowed);
  const personaShortLabel =
    viewPersona === "exec" ? "Exec view" : viewPersona === "alumni" ? "Alumni view" : "Member view";

  // ── Per-persona bottom nav (feature 3) ────────────────────────────────────
  // All personas share the 5 nav SLOTS (so the active-pill geometry is
  // stable) but show different icons/labels + route to different content.
  type TabId = "feed" | "events" | "rush" | "dues" | "directory" | "settings";
  const memberNav: { id: TabId; icon: any; label: string }[] = [
    { id: "feed", icon: IconComms, label: "Feed" },
    { id: "events", icon: IconEvents, label: "Events" },
    { id: "rush", icon: IconRecruitment, label: isRushActive ? "Rush" : "Pledges" },
    // Dues tab appears ONLY when the chapter has dues enabled (server flag). When
    // disabled, the slot is dropped here AND the API serves no dues data — the
    // surface simply does not exist for that chapter. The "Network" slot fills in
    // so the bottom nav stays a clean set rather than a gap.
    ...(duesVisible ? [{ id: "dues" as TabId, icon: IconDues, label: "Dues" }] : []),
    { id: "directory", icon: IconWhiteLabel, label: "Network" },
  ];
  const alumniNav: { id: TabId; icon: any; label: string }[] = [
    { id: "feed", icon: IconComms, label: "Feed" },
    { id: "events", icon: IconEvents, label: "Events" },
    ...(duesVisible ? [{ id: "dues" as TabId, icon: IconSpark, label: "Giving" }] : []),
    { id: "directory", icon: IconWhiteLabel, label: "Network" },
    { id: "settings", icon: IconChapter, label: "Profile" },
  ];
  const execNav: { id: TabId; icon: any; label: string }[] = [
    { id: "feed", icon: IconMembers, label: "Roster" },
    { id: "events", icon: IconComms, label: "Announce" },
    { id: "rush", icon: IconGrowth, label: "Rush" },
    ...(duesVisible ? [{ id: "dues" as TabId, icon: IconDues, label: "Dues" }] : []),
    { id: "directory", icon: IconSecurity, label: "Console" },
  ];
  const navItems = viewRole === "exec" ? execNav : role === "alumni" ? alumniNav : memberNav;
  const activeNavIndex = Math.max(0, navItems.findIndex((n) => n.id === activeTab));

  return (
    <div
      // `isolate` keeps the shell's explicit z-stack self-contained. Owner
      // round-8 layering contract: background z-0 → letters/identity z-1 →
      // all content z-10+. Nothing ambient lives at negative z anymore (a
      // negative-z child under any opaque background = invisible).
      className="relative isolate flex min-h-[100dvh] w-full flex-col items-stretch justify-start overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top))] font-sans text-slate-200 lg:flex-row lg:items-center lg:justify-center lg:gap-8 lg:p-8 lg:pt-8"
    >
      {/* BACKGROUND layer (z-0): deep brand-tinted radial wash → near-black,
          so the shell reads as the chapter's world. Transitions smoothly when
          the chapter changes. Lives on its own z-0 div so the z-1 letter
          field + identity backdrop are guaranteed to paint OVER it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[-10]"
        style={{
          background: `radial-gradient(ellipse at 75% 0%, ${brandPrimary}33, transparent 55%), radial-gradient(ellipse at 15% 90%, ${brandSecond}1f, transparent 50%), linear-gradient(160deg, ${brandDeep}, #060810 60%, #04060d)`,
          transition: "background 0.9s cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {/* Chapter IDENTITY in the room itself — drifting school wordmark up
          top, letter monogram low-left, and the school name rendered BIG in
          the bottom-right corner, all tinted to the chapter's colors.
          Re-keyed per tenant so a reskin cross-fades the whole backdrop to
          the new school along with the letter field (the "tailored to YOU"
          moment). Static — zero continuous motion. */}
      <ChapterIdentityBackdrop
        key={selectedTenant ? `${selectedTenant.id}-${selectedBrand.id}` : "none"}
        school={selectedTenant?.school}
        letters={selectedBrand.letters}
        primary={brandPrimary}
        secondary={brandSecond}
      />

      {/* Chapter-colored Greek-letter field behind EVERYTHING — the signature
          "picking a chapter transforms the room" effect. Owner round-7: the
          letters must visibly FLOAT IN FROM THE SIDES of the screen across the
          dark area around the phone + rail, so `fromSides` makes every letter
          enter at the left/right edge, drift the full way across at a stately
          1.5× slower pace, and exit the far side. The raw brand color (often a
          deep red/purple) vanishes on the near-black shell, so it's mixed
          toward light slate — light, chapter-tinted letters on dark. Scoped to
          this container (absolute); reduced-motion → static scattered field
          via the field's own CSS. */}
      <GreekLetterField
        glyphs={brandGlyphs}
        color={`color-mix(in srgb, ${brandPrimary} 42%, #dbe3ee)`}
        position="absolute"
        fromSides
        count={26}
        seed={0x51ed270b}
      />

      {/* The 3D WebGL plexus that used to render behind the lg+ showcase was
          REMOVED (owner round-5: the demo "moves too much"). The calm brand
          wash + whisper letter field + static chapter-identity backdrop carry
          the atmosphere with zero continuous canvas animation. */}

      {/* Mobile-Friendly Sticky Top Header (Shown under lg viewports) */}
      {/* Fixed top chrome. h-14 content height + an env(safe-area-inset-top) pad
          so on a notched iPhone in the native shell (contentInset: never) the bar
          clears the status bar / Dynamic Island instead of rendering under it.
          box-content keeps the 3.5rem content height exact above the inset. */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 box-content pt-[env(safe-area-inset-top)] bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-[150] select-none">
        <div className="flex items-center gap-2">
          <GreekstackLogo title="Greekstack" className="w-8 h-8 shadow-md" />
          <div>
            <span className="text-xs font-bold text-white tracking-wider uppercase block leading-none">Greekstack App</span>
            {/* Mobile view switcher trigger — the phone below is the REAL app;
                this (demo chrome) is where you change who you're viewing it as. */}
            <button
              onClick={() => setShowViewMenu((v) => !v)}
              disabled={!token}
              aria-expanded={showViewMenu}
              aria-haspopup="menu"
              aria-label={`Change view (currently ${personaShortLabel})`}
              className="press mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-300 transition hover:text-white disabled:opacity-60"
            >
              {selectedBrand.letters} · {personaShortLabel}
              <IconChevronDown
                className={`h-3 w-3 transition-transform motion-reduce:transition-none ${showViewMenu ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
        {/* Mobile view menu — anchored under the header. */}
        {showViewMenu && token && (
          <>
            <button
              aria-label="Close view menu"
              onClick={() => setShowViewMenu(false)}
              className="fixed inset-0 z-[151] cursor-default bg-transparent"
            />
            <div
              role="menu"
              aria-label="View the app as"
              className="absolute left-3 top-[calc(100%+0.375rem)] z-[152] w-64 animate-spring-in rounded-2xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl"
            >
              {visiblePersonas.map((p) => {
                const active = viewPersona === p.id;
                const PIcon = p.icon;
                return (
                  <button
                    key={p.id}
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => setViewPersona(p.id)}
                    className={`press flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                      active ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                      style={
                        active
                          ? { background: `linear-gradient(140deg, ${brandPrimary}, ${brandSecond})` }
                          : { background: "rgba(255,255,255,0.08)" }
                      }
                    >
                      <PIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] font-bold leading-tight ${active ? "text-white" : "text-slate-300"}`}>
                        {p.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-slate-400">{p.sub}</span>
                    </span>
                    {active && <IconCheck className="h-4 w-4 shrink-0 text-white/80" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5">
          {/* Website — icon-only on the narrowest phones, labeled from sm+. */}
          <button
            onClick={() => window.location.href = "/"}
            aria-label="Back to website"
            className="press flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[12px] font-semibold text-white transition hover:bg-white/10"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">Website</span>
          </button>
          {/* Sign in — a real chapter member taps here to log into their live
              account (this screen is the demo). */}
          <button
            onClick={() => window.location.href = "/login"}
            className="press hidden h-9 items-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-[12px] font-semibold text-white transition hover:bg-white/10 xs:flex"
          >
            Sign in
          </button>
          <button
            onClick={() => setShowPricingModal(true)}
            className="press h-9 rounded-lg px-3 text-[12px] font-bold text-white shadow-sm transition hover:opacity-95"
            style={{ background: `linear-gradient(135deg, ${brandPrimary}, ${brandSecond})` }}
          >
            Launch
          </button>
        </div>
      </div>

      {/* Dynamic styling injector matching selected brand */}
      <style dangerouslySetInnerHTML={{ __html: `
        .brand-focus:focus {
          border-color: ${selectedBrand.primaryColor} !important;
          box-shadow: 0 0 0 2px ${selectedBrand.primaryColor}20 !important;
          outline: none !important;
        }
      `}} />

      {/* Decorative background orbs — brand-tinted so they reinforce the chosen
          chapter's color rather than fighting it. */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full blur-[110px] transition-colors duration-700"
        style={{ backgroundColor: brandPrimary + "22" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full blur-[130px] transition-colors duration-700"
        style={{ backgroundColor: brandSecond + "1a" }}
      />

      {/* Interactive Booking Modal */}
      {showBookingModal && renderBookingModal(ctx)}

      {/* Interactive Pricing / Launch Modal */}
      {showPricingModal && renderPricingModal(ctx)}

      {/* Desktop Sidebar (Left of the phone mockup) */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] p-6 space-y-6 shadow-2xl relative z-10 text-left">
        <div className="space-y-2">
          {/* Owner round-7: the spark-glyph "INTERACTIVE DEMO" pill read as
              slop — the lockup is now just title + a quiet text-only line.
              Hierarchy: logo · name (title) · what-this-is (support). */}
          <div className="flex items-center gap-3">
            {/* Inline SVG brand mark (was a raw PNG <img> that could 404 / fail to
                decode on a flaky mobile connection and show a broken-image icon).
                GreekstackLogo paints the canonical vector with no network fetch, so
                it always renders. */}
            <GreekstackLogo title="Greekstack" className="w-10 h-10 rounded-xl shadow-md" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Greekstack App</h2>
              <p className="mt-0.5 text-[12px] font-semibold leading-tight text-slate-400">Interactive demo</p>
            </div>
          </div>
          {/* Two short sentences, no dash flourishes; the three persona cards
              below already name the roles, so the copy doesn't repeat them. */}
          <p className="text-xs text-slate-400 leading-relaxed">
            This is the real app your chapter gets. Pick who you&apos;re viewing
            it as and the phone updates to match.
          </p>
        </div>

        {/* Giant Dynamic Chapter Letters Display Card */}
        <div 
          className="relative overflow-hidden rounded-2xl border p-5 text-center shadow-lg transition-all duration-500"
          style={{ 
            borderColor: `${brandPrimary}33`,
            background: `linear-gradient(135deg, ${brandPrimary}15, ${brandSecond}08)`
          }}
        >
          <div 
            className="absolute inset-0 opacity-10 blur-xl transition-all duration-500"
            style={{ background: `radial-gradient(circle, ${brandPrimary} 0%, ${brandSecond} 100%)` }}
          />
          <span 
            className="block text-6xl font-black tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] select-none font-serif"
            style={{ 
              background: `linear-gradient(135deg, #ffffff 40%, ${brandSecond} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            {selectedBrand.letters}
          </span>
          <span className="mt-2 block text-xs font-bold uppercase tracking-wider text-slate-300 leading-none">
            {selectedBrand.name}
          </span>
          <span className="mt-1 block text-[10px] font-medium text-slate-400 leading-none">
            {selectedTenant?.school || "University of South Carolina"}
          </span>
        </div>

        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Active Chapter</span>
            <button
              onClick={() => { setChooserMode("pick"); setShowChapterChooser(true); }}
              disabled={!token}
              className="group flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-white shadow-sm"
                  style={{ background: `linear-gradient(140deg, ${brandPrimary}, ${brandSecond})` }}
                >
                  {selectedBrand.letters}
                </span>
                <span className="truncate text-[13px] font-semibold text-slate-200">{selectedBrand.name}</span>
              </span>
              <IconWhiteLabel className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-white" />
            </button>
          </div>

          {/* View switcher (owner round-7) — the demo's main control. Instead
              of a Member/Admin toggle framing, the LEFT rail picks WHO you're
              viewing the real app as; the phone always shows the true product. */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Viewing as</span>
            <div className="space-y-1.5" role="radiogroup" aria-label="View the app as">
              {visiblePersonas.map((p) => {
                const active = viewPersona === p.id;
                const PIcon = p.icon;
                return (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setViewPersona(p.id)}
                    disabled={!token}
                    className={`press group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-50 ${
                      active
                        ? "border-white/25 bg-white/[0.09]"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-colors duration-300"
                      style={
                        active
                          ? { background: `linear-gradient(140deg, ${brandPrimary}, ${brandSecond})` }
                          : { background: "rgba(255,255,255,0.08)" }
                      }
                    >
                      <PIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] font-bold leading-tight ${active ? "text-white" : "text-slate-300"}`}>
                        {p.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-slate-400">{p.sub}</span>
                    </span>
                    {active && <IconCheck className="h-4 w-4 shrink-0 text-white/80" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="space-y-3 pt-5 border-t border-white/10">
          <button
            onClick={() => window.location.href = "/"}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <IconArrowLeft className="w-3.5 h-3.5" /> Back to website
          </button>

          {/* Sign in — sends a real chapter member to the live login (this view is
              a demo; existing brothers/alumni log into their actual chapter here). */}
          <button
            onClick={() => window.location.href = "/login"}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <IconLogIn className="w-3.5 h-3.5" /> Sign in
          </button>

          <button
            onClick={() => { setShowBookingModal(true); setBookingSubmitted(false); }}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <IconCalendar className="w-3.5 h-3.5" /> Book a meeting
          </button>

          <button
            onClick={() => setShowPricingModal(true)}
            className="w-full py-2.5 px-4 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-blue-400 via-sky-400 to-amber-300 hover:opacity-95 shadow-[0_4px_20px_-4px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 transition"
          >
            Launch your chapter
          </button>
        </div>
      </div>

      {/* Phone chassis & screen simulator wrapper.
          On <lg the demo is FULL-BLEED (no chassis, fills the viewport below the
          sticky mobile header) so it reads as a real app, not a phone-in-a-phone.
          On lg+ we keep the tilting showcase device frame. */}
      <div
        // <lg: items-stretch so the full-bleed app ALWAYS fills the viewport —
        // with items-center a short surface (e.g. the exec Roster) floated in
        // the middle and exposed a band of shell background above the app.
        // lg+: back to items-center for the showcase chassis.
        className="relative z-10 flex shrink-0 select-none items-stretch justify-center w-full max-w-none flex-1 lg:max-w-md lg:flex-none lg:items-center"
        // Perspective context is DESKTOP-ONLY — on a phone there is no 3D, so we
        // don't even establish a perspective (avoids a stray GPU 3D layer that
        // can subtly misrender the full-bleed app).
        style={isDesktopShowcase ? { perspective: "1000px" } : undefined}
      >
        {/* Physical side buttons — lg+ only (the showcase device). */}
        <div className="hidden lg:block absolute -left-[11px] top-[140px] w-[3px] h-[40px] bg-slate-800 rounded-l-md" />
        <div className="hidden lg:block absolute -left-[11px] top-[190px] w-[3px] h-[40px] bg-slate-800 rounded-l-md" />
        <div className="hidden lg:block absolute -right-[11px] top-[160px] w-[3px] h-[60px] bg-slate-800 rounded-r-md" />

        <div
          // <lg: the % height chain (h-full) can resolve to auto inside the
          // stretched flex wrapper, letting a short surface end mid-screen with
          // shell background below it — the dvh-based min-height guarantees the
          // white app always reaches the bottom of the viewport.
          className="relative z-10 flex h-full min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] w-full flex-col overflow-hidden bg-white rounded-none border-0 lg:h-[820px] lg:min-h-0 lg:rounded-[48px] lg:border-[12px] lg:border-slate-800"
          // Phone (full-bleed real app): NO inline shadow at all. Desktop
          // showcase: a STATIC grounding shadow — the old cursor-tracked tilt
          // and dynamic glare moved the surface people interact with (owner
          // round-5), so the chassis is now perfectly still.
          style={
            isDesktopShowcase
              ? { boxShadow: '0 20px 50px -10px rgba(0,0,0,0.55)' }
              : undefined
          }
        >
          {/* Static glass sheen — lg+ only. Fixed position + opacity (no cursor
              tracking) so the screen never shimmers while someone is reading. */}
          <div
            className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay hidden lg:block"
            style={{
              opacity: 0.08,
              background: 'radial-gradient(circle at 30% 12%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 65%)',
            }}
          />

          {/* Dynamic island notch + iOS status bar — lg+ device showcase only. */}
          <div className="hidden lg:flex absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-6 rounded-full bg-black z-50 items-center justify-between px-3 text-[12px] text-slate-500">
            <span className="font-semibold text-slate-400 select-none">9:41</span>
            <div className="flex items-center gap-1">
              {/* Static status dot — no pulse; the demo keeps ambient motion near zero. */}
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>

          {/* Top iOS Status Bar Area — lg+ only; on mobile the real OS status bar
              + our sticky header already cap the screen. */}
          <div className="hidden lg:block h-10 shrink-0 bg-white" />

        {/* Client Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative text-slate-900 bg-slate-50">
          
          {/* Custom iOS-style Toast Notification */}
          {toast && renderToast(ctx)}

          {/* Custom Sleek Confirmation Modal */}
          {confirmModal && renderConfirmModal(ctx)}

          {/* iOS-style Alert Banner */}
          {showGoogleInternshipBanner && (
            <div
              className="absolute top-2 left-2 right-2 z-[999] p-3 rounded-2xl bg-slate-900/95 text-white border border-white/10 shadow-2xl flex gap-3 items-center cursor-pointer animate-spring-in select-none"
              onClick={() => {
                setShowGoogleInternshipBanner(false);
                setActiveTab("feed");
                const googleJob = combinedFeed.find((f: any) => f.feedType === "career" && f.company?.toLowerCase().includes("google"));
                if (googleJob) {
                  setExpandedAnnouncementId(googleJob.id);
                }
              }}
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white shrink-0">
                <IconBriefcase className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">New Opportunity</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGoogleInternshipBanner(false);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <IconClose className="h-3 w-3" />
                  </button>
                </div>
                <h4 className="text-xs font-bold leading-tight truncate">Google Internship Posted</h4>
                <p className="text-[10px] text-slate-300 leading-none mt-0.5">Click to view referral details &amp; quick apply</p>
              </div>
            </div>
          )}

          {/* Quick Apply Modal */}
          {quickApplyJob && (
            <div className="absolute inset-0 bg-black/60 z-[998] flex items-end justify-center animate-fade-in" onClick={() => setQuickApplyJob(null)}>
              <div className="w-full bg-white rounded-t-[32px] p-6 space-y-4 max-h-[85%] overflow-y-auto animate-slide-up shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 uppercase tracking-wider">
                    Quick Apply referral
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                    {quickApplyJob.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">{quickApplyJob.company} · {quickApplyJob.location}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                    <input
                      type="text"
                      disabled
                      value={dashboardData?.profile?.name || "Member"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={dashboardData?.profile?.email || email || "member@usc.edu"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                    <input
                      type="text"
                      disabled
                      value={editPhone || "(213) 555-0199"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cover Note for {quickApplyJob.contactName}</label>
                    <textarea
                      value={quickApplyNote}
                      onChange={(e) => setQuickApplyNote(e.target.value)}
                      className="w-full h-20 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center">
                    <span className="text-[11px] font-semibold text-slate-500">📄 resume_pdf_exported.pdf (Attached)</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setQuickApplyJob(null)}
                    disabled={quickApplySubmitting}
                    className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setQuickApplySubmitting(true);
                      await new Promise((resolve) => setTimeout(resolve, 1200));
                      setQuickApplySubmitting(false);
                      setQuickApplyJob(null);
                      showToast(`Application successfully sent to ${quickApplyJob.contactName}!`, "success");
                    }}
                    disabled={quickApplySubmitting}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-md"
                  >
                    {quickApplySubmitting ? (
                      <>
                        <IconClock className="w-3.5 h-3.5 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <IconCheck className="w-3.5 h-3.5" /> Submit Application
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Forgot Password Overlay Modal */}
          {showForgotPassword && renderForgotPasswordModal(ctx)}

          {/* Custom Add Member Overlay Modal (President Console) */}
          {showAddMemberModal && renderAddMemberModal(ctx)}
          
          {/* 1a. COLD-START School → Chapter picker (Step 0) — the first screen
                  the iOS shell lands on with no ?demo + no saved session. Built
                  from the real Tenant registry (merged with demo chapters). */}
          {!selectedTenant && entryMode === "picker" && renderSchoolChapterPicker(ctx)}

          {/* 1b. Showcase onboarding chooser (pick OR build any chapter) — the
                  brand-grouped demo entry, now reached via ?demo=true or the
                  picker's "See a live demo" link. Also the Create/preview-your-
                  chapter branch for visitors whose chapter isn't live yet. */}
          {!selectedTenant && entryMode !== "picker" && renderChapterChooser(ctx)}

          {/* In-app chapter switcher overlay — re-skins the live demo without a
              sign-out. Slides up over the running app. */}
          {selectedTenant && token && showChapterChooser && (
            <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-[80] flex flex-col bg-white animate-spotlight-in lg:absolute lg:inset-0">
              {renderChapterChooser(ctx, { overlay: true })}
            </div>
          )}

          {/* 2. Login Page */}
          {selectedTenant && !token && renderLogin(ctx)}

          {/* 3. Dashboard views */}
          {token && selectedTenant && (
            <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
              
              {/* App Status Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 py-2.5">
                {/* Tap the brand lockup to swap/build a chapter live */}
                <button
                  onClick={() => { setChooserMode("pick"); setShowChapterChooser(true); }}
                  className="press group flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-2 text-left transition hover:bg-slate-50"
                  aria-label="Switch or customize chapter"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl text-[13px] font-bold text-white shadow-sm transition-colors duration-500"
                    style={{ background: `linear-gradient(140deg, ${brandPrimary}, ${brandSecond})` }}
                  >
                    {selectedBrand.letters}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-bold leading-tight text-slate-900">
                      <span className="truncate">{dashboardData?.chapter?.name || selectedTenant.name}</span>
                    </h3>
                    <span className="flex items-center gap-1 text-[11px] font-semibold leading-tight" style={{ color: brandPrimary }}>
                      <IconWhiteLabel className="h-3 w-3 shrink-0" /> Tap to change chapter
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1.5">
                  {isDemo && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                      Demo
                    </span>
                  )}
                  <button
                    onClick={() => {
                      // SERVER-ENFORCED + persona-honest: the header acts as an
                      // exec toggle only when the exec lens is genuinely in play
                      // for this persona (`execToggleActive` — a real cleared
                      // officer, or the demo while already in the exec persona).
                      // On the member screen it is NOT an exec affordance; a tap
                      // opens settings, so exec tools never bleed into the member
                      // view. A regular member can never flip the lens.
                      if (execToggleActive) {
                        const nextRole = viewRole === "exec" ? "member" : "exec";
                        setViewRole(nextRole);
                        setActiveTab("feed");
                        showToast(`Switched to ${nextRole === "exec" ? "Officer / Exec" : "Active Member"} view`, "success");
                      } else {
                        setActiveTab("settings");
                      }
                    }}
                    aria-label={execToggleActive ? "Toggle Exec/Member dashboard view" : "Account settings"}
                    className="press flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-slate-700 transition hover:text-slate-900"
                  >
                    {/* Static "online" dot — the ping ripple was a persistent
                        attention-grabber in the chrome (owner: demo moves too much). */}
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      {viewRole === "exec"
                        ? "Exec"
                        : role === "brother"
                        ? (execToggleActive && dashboardData?.profile?.position ? dashboardData.profile.position : "Member")
                        : "Alumnus"}
                    </span>
                  </button>
                </div>
              </div>

              {/* The old in-phone Member/Officer toggle row was REMOVED (owner
                  round-7): the phone shows the REAL app, full stop. Switching
                  who you view it as lives in the demo chrome — the left rail on
                  desktop, the header's view menu on mobile. */}

              {/* Main Scrollable Viewport — compact mobile density (p-3) so cards
                  fit more on screen; a touch roomier on the lg+ showcase. At <lg
                  the bottom padding clears the FIXED tab bar (+ safe area). */}
              <div className="flex-1 overflow-y-auto p-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] space-y-3 lg:p-4 lg:pb-4">
                
                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                    <span className="text-xs">Connecting securely...</span>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-center space-y-3">
                    <IconAlert className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="text-xs text-red-600">{error}</p>
                    <button
                      onClick={() => handleSignOut()}
                      className="text-xs text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      Return to Login
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Advisory PLATFORM-billing banner — mirrors the web admin's
                        soft-gate so the member sees the same "trial ends / past
                        due" heads-up. REAL sessions only (the demo has no real
                        subscription); fed by the /api/mobile/data `billing` block
                        (getEntitlement). Never blocks — advisory only. Officers
                        get the actionable CTA. */}
                    {!isDemo && dashboardData?.billing && (
                      <MobileBillingBanner
                        billing={dashboardData.billing}
                        // Server-enforced: only an exec-cleared session sees the
                        // actionable "manage billing" CTA (alumni/non-officers get
                        // the advisory banner without it).
                        canManage={execAllowed}
                      />
                    )}

                    {viewRole === "exec" ? (
                  /* ── OFFICER / EXEC EXPERIENCE (feature 3) ─────────────────
                     The same 5 nav slots become officer tools; each routes to a
                     live, interactive admin surface. Keyed on activeTab so tab
                     swaps cross-fade like the member view. */
                  <div key={`exec-${activeTab}`} className="animate-spotlight-in">
                    {activeTab === "feed" && renderExec(ctx, "roster")}
                    {activeTab === "events" && renderExec(ctx, "announce")}
                    {activeTab === "rush" && renderExec(ctx, "rush")}
                    {activeTab === "dues" && renderExec(ctx, "dues")}
                    {activeTab === "directory" && renderExec(ctx, "settings")}
                    {activeTab === "settings" && renderSettingsTab(ctx)}
                  </div>
                ) : (
                  <div key={`member-${activeTab}`} className="animate-spotlight-in">
                    {/* A. FEED TAB (Combined News + Job Listings) */}
                    {activeTab === "feed" && renderFeedTab(ctx)}

                    {/* B. EVENTS TAB */}
                    {activeTab === "events" && renderEventsTab(ctx)}

                    {/* C. RUSH TAB (Brother-only PNM Database / Pledges view) */}
                    {activeTab === "rush" && role === "brother" && renderRushTab(ctx)}

                    {/* D. DUES TAB (Brothers) or GIVING TAB (Alumni). The brother
                        dues surface is gated on the chapter's dues flag (the nav
                        slot is also removed when disabled); alumni GIVING is a
                        separate donations feature and is unaffected. */}
                    {activeTab === "dues" && (role === "alumni" || duesVisible) && renderDuesTab(ctx)}

                    {/* E. DIRECTORY TAB (Actives, Alumni, Careers sub-views) */}
                    {activeTab === "directory" && renderDirectoryTab(ctx)}

                    {/* F. SETTINGS TAB */}
                    {activeTab === "settings" && renderSettingsTab(ctx)}
                  </div>
                    )}
                  </>
                )}

              </div>

              {/* Rush PNM detail slide drawer */}
              {selectedPnm && renderPnmDetail(ctx)}

              {/* Posting Career Opportunity Modal */}
              {showPostJobModal && renderPostJobModal(ctx)}

              {/* Posting Announcement Modal (President Alex Mercer / Brother officers) */}
              {showPostAnnModal && renderPostAnnModal(ctx)}

              {/* Edit Profile & Professional Info Modal */}
              {showEditProfileModal && renderEditProfileModal(ctx)}

              {/* ════════════════════════════════════════════════════════════════
                  FEATURE SPOTLIGHT — full interactive surfaces for every remaining
                  feature (Elections · Treasury · QR check-in · Giving · Branding).
                  Slides up over the content area; each mutates real local state so
                  the demo proves the WHOLE product works, with a "what this does"
                  callout at the top of each. ═══════════════════════════════════ */}
              {spotlight && renderSpotlight(ctx)}

              {/* Interactive demo callout — a small, dismissible text-box that
                  explains the tool on the current tab. Only in demo mode; floats
                  just above the bottom tab bar so it points at the nav the visitor
                  is exploring. Re-appears with fresh copy on every tab switch
                  until the visitor turns the tour off. */}
              {isDemo && viewRole === "member" && calloutVisible && !calloutDismissed && DEMO_CALLOUTS[activeTab] && (
                <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[45] animate-spring-in lg:absolute lg:inset-x-3 lg:bottom-[4.75rem] lg:z-[60]">
                  <div className="relative rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-3 pr-9 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.45)]">
                    {/* little pointer down toward the tab bar */}
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1.5 left-8 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white/95"
                    />
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: selectedBrand.primaryColor }}
                      >
                        <IconInfo className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-900">
                          {DEMO_CALLOUTS[activeTab].title}
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            What this does
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                          {DEMO_CALLOUTS[activeTab].body}
                        </p>
                        {/* Guided next step — turns the passive tips into a tour:
                            each callout offers the next tab in the journey, and
                            the final beat hands off to the Officer view. */}
                        {(() => {
                          // Alumni never see the rush pipeline, so their tour skips it.
                          const TOUR_ORDER: readonly TabId[] =
                            role === "alumni"
                              ? (["feed", "events", "dues", "directory"] as const)
                              : (["feed", "rush", "dues", "events", "directory"] as const);
                          const i = TOUR_ORDER.indexOf(activeTab as TabId);
                          const next = i >= 0 && i < TOUR_ORDER.length - 1 ? TOUR_ORDER[i + 1] : null;
                          const nextLabel = next ? navItems.find((n) => n.id === next)?.label : null;
                          return (
                            <div className="mt-2 flex items-center gap-3">
                              {next && nextLabel ? (
                                <button
                                  onClick={() => setActiveTab(next)}
                                  className="press inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 text-[12px] font-bold text-white shadow-sm transition hover:opacity-95"
                                  style={{ backgroundColor: selectedBrand.primaryColor }}
                                >
                                  Next: {nextLabel} <IconChevronRight className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setViewPersona("exec")}
                                  className="press inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 text-[12px] font-bold text-white shadow-sm transition hover:opacity-95"
                                  style={{ backgroundColor: selectedBrand.primaryColor }}
                                >
                                  <IconCrown className="h-3.5 w-3.5" /> See the exec view
                                </button>
                              )}
                              <button
                                onClick={() => setCalloutDismissed(true)}
                                className="text-[12px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                              >
                                Turn off tips
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {/* dismiss just this one (it returns on the next tab) */}
                    <button
                      onClick={() => setCalloutVisible(false)}
                      aria-label="Dismiss tip"
                      className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <IconClose className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* One-time Officer-console welcome — fires the first time the
                  visitor flips to Officer (usually via the tour's hand-off).
                  Explains what changed AND carries the demo's conversion beat:
                  by this point they've seen the whole member app, so 'launch'
                  is the natural next step. */}
              {isDemo && viewRole === "exec" && !execTipSeen && !calloutDismissed && (
                <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[45] animate-spring-in lg:absolute lg:inset-x-3 lg:bottom-[4.75rem] lg:z-[60]">
                  <div className="relative rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-3 pr-9 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.45)]">
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1.5 left-8 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white/95"
                    />
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: selectedBrand.primaryColor }}
                      >
                        <IconCrown className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900">
                          You&apos;re viewing as the exec board
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-600">
                          Same five tabs, now admin tools — roster, announcements, the rush pipeline,
                          dues management, and chapter settings. Change views any time from the switcher.
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() => { setExecTipSeen(true); setShowPricingModal(true); }}
                            className="press inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 text-[12px] font-bold text-white shadow-sm transition hover:opacity-95"
                            style={{ background: `linear-gradient(135deg, ${brandPrimary}, ${brandSecond})` }}
                          >
                            Launch your chapter for free
                          </button>
                          <button
                            onClick={() => setExecTipSeen(true)}
                            className="text-[12px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                          >
                            Keep exploring
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setExecTipSeen(true)}
                      aria-label="Dismiss tip"
                      className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <IconClose className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Persistent Bottom Tab Bar Navigation — data-driven per role,
                  with a spring active-pill that slides between slots + ≥44px
                  touch targets + safe-area padding for the full-bleed mobile shell.
                  At <lg the full-bleed document can grow taller than the viewport
                  (min-h chains don't bound the inner flex column), so the bar is
                  FIXED to the real viewport bottom — always visible at scrollY=0.
                  On the lg+ phone-frame showcase it stays in-flow (relative). */}
              <div className="fixed bottom-0 left-0 right-0 z-[40] grid grid-cols-5 items-stretch border-t border-slate-100 bg-white px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:z-10 lg:shrink-0">
                {/* Sliding brand active-pill behind the icons. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-1.5 top-1.5 rounded-2xl transition-transform duration-380 ease-gs-bounce motion-reduce:transition-none"
                  style={{
                    width: "calc(20% - 0.5rem)",
                    left: "0.25rem",
                    transform: `translateX(calc(${activeNavIndex} * (100% + 0.5rem)))`,
                    backgroundColor: brandPrimary + "14",
                  }}
                />
                {navItems.map((n) => {
                  const Icon = n.icon;
                  const active = activeTab === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setActiveTab(n.id)}
                      aria-current={active ? "page" : undefined}
                      className="press relative z-10 flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors"
                      // a11y (AA): inactive label uses slate-500 (#64748b = 4.76:1 on
                      // white), not slate-400 (#94A3B8 = 2.56:1, fails AA). This is the
                      // App Store deliverable's PRIMARY nav; the 11px-bold label is below
                      // the large-text exception so it must clear 4.5:1. Active/inactive
                      // hierarchy still reads via brand color + strokeWidth + sliding pill.
                      style={{ color: active ? brandPrimary : "#64748b" }}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
                      <span className="text-[11px] font-bold leading-none">{n.label}</span>
                    </button>
                  );
                })}
              </div>

            </div>
          )}

        </div>

        {/* Home Screen bar — lg+ device showcase only. */}
        <div className="hidden lg:block h-6 shrink-0 bg-white relative">
          <div className="w-32 h-1 rounded-full bg-slate-300 absolute bottom-1.5 left-1/2 -translate-x-1/2" />
        </div>
      </div>
    </div>
  </div>
);
}
