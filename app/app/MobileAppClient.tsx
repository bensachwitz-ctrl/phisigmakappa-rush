"use client";

import React, { useState, useEffect } from "react";
import {
  School,
  Search,
  User,
  Users,
  Lock,
  Bell,
  Calendar,
  DollarSign,
  CreditCard,
  Settings,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronDown,
  Pin,
  Check,
  X,
  Info,
  Sparkles,
  MapPin,
  Award,
  Clock,
  Heart,
  Mail,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  Globe,
  ThumbsUp,
  MessageSquare,
  Crown,
  KeyRound,
  Trash2,
  ArrowLeft,
  XCircle,
  Key,
  Car,
  Vote,
  Wallet,
  PieChart,
  QrCode,
  Gift,
  Palette,
  ShieldCheck,
  TrendingUp,
  CalendarPlus
} from "lucide-react";

import {
  FRATERNITY_BRANDS,
  DEMO_TENANTS,
  DEMO_CALLOUTS,
  getMockDemoData,
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
import { useIsDesktopViewport } from "@/hooks/use-fine-pointer";
import { WebGLBackground } from "./_demo/WebGLBackground";
import type { DemoContext } from "./_demo/context";
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

export default function MobileAppClient({ initialTenants }: MobileAppClientProps) {
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

  // ── Owner-requested demo controls ────────────────────────────────────────
  // viewRole flips the WHOLE dashboard between the member experience ("member"
  // = active brother: feed/events/dues/directory) and the officer experience
  // ("exec" = roster mgmt, dues mgmt, rush pipeline, announcements, settings).
  // Distinct from `role` (brother vs alumni) which selects member vs alumni
  // data; viewRole layers an officer lens on top of the brother experience.
  const [viewRole, setViewRole] = useState<"member" | "exec">("member");
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

  const handlePhoneMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Phone: no 3D. Bail before touching any tilt/glare state on small viewports.
    if (!isDesktopShowcase) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxTilt = 8;
    const rX = ((centerY - y) / centerY) * maxTilt;
    const rY = ((x - centerX) / centerX) * maxTilt;
    setRotateX(rX);
    setRotateY(rY);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handlePhoneMouseEnter = () => {
    if (!isDesktopShowcase) return;
    setIsHoveringPhone(true);
  };

  const handlePhoneMouseLeave = () => {
    if (!isDesktopShowcase) return;
    setIsHoveringPhone(false);
    setRotateX(0);
    setRotateY(0);
  };
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

  // Cast a secret ballot for one seat: record the viewer's local choice and bump
  // that candidate's tally + the chapter ballot count. Idempotent per seat.
  const castBallot = (seatId: string, candidateId: string) => {
    if (myBallot[seatId]) return;
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
    showToast("Anonymous ballot recorded — your choice is never linked to you.", "success");
  };

  // Add a donation to the live campaign meter.
  const handleDonate = () => {
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
    showToast(`Thank you! $${(donationCents / 100).toFixed(2)} donated via Stripe.`, "success");
    setTimeout(() => setDonationDone(false), 2500);
  };

  // QR check-in → save a brand-new PNM into the recruitment pipeline live.
  const handleQrCheckIn = () => {
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
    showToast(`${newPnm.name} checked in — added to the rush board.`, "success");
  };

  // ── Interactive demo callouts ────────────────────────────────────────────
  // In demo mode we float a small, dismissible "tour" text-box inside the phone
  // that explains the feature on the tab the visitor is currently viewing. It
  // re-appears (with fresh copy) whenever they switch tabs, so exploring the app
  // teaches them what each tool does. A separate "dismissed entirely" flag lets a
  // visitor turn the tour off for the rest of the session.
  const [calloutVisible, setCalloutVisible] = useState(true);
  const [calloutDismissed, setCalloutDismissed] = useState(false);
  // Re-show the per-tab callout each time the active tab changes (unless the
  // visitor turned the tour off). Keyed on activeTab so each tab gets its tip.
  useEffect(() => {
    if (!calloutDismissed) setCalloutVisible(true);
  }, [activeTab, calloutDismissed]);

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
      setDashboardData(getMockDemoData(demoTenant, brand));
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
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // Fetch real portal data when authenticated in non-demo mode
  useEffect(() => {
    if (!token || !selectedTenant || isDemo) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mobile/data?subdomain=${selectedTenant.subdomain}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setDashboardData(data);
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
        setDashboardData(getMockDemoData(t, brand));
        
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
    setDashboardData(getMockDemoData(tenant, brand));
    setLoading(false);
    setActiveTab("feed");
    setShowChapterChooser(false);
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
    showToast(`${brand.name} is live — the whole app just re-skinned.`, "success");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setAuthLoading(true);
    setError(null);

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
        setDashboardData(getMockDemoData(selectedTenant, selectedBrand));
        
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
      const res = await fetch("/api/mobile/auth", {
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
        // biometric unlock next launch, then register this device for push so
        // events/announcements can notify the member. window.GreekStackNative is
        // published by <NativeBridge/> and self-guards via Capacitor.isNativePlatform().
        try {
          await window.GreekStackNative?.saveSession?.({
            token: data.token,
            user: data.user,
            subdomain: selectedTenant.subdomain,
          });
          window.GreekStackNative?.onSignedIn?.();
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
    showToast("Added to your calendar — opens in Google / iCloud / Outlook.", "success");
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
      const res = await fetch("/api/mobile/events/rsvp", {
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
      const res = await fetch("/api/mobile/career/post", {
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

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardData) return;

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardData) return;

    const isAlum = role === "alumni";
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

    // Update in actives roster or alumni roster list so it is reflected in Directory instantly!
    let updatedRoster = { ...dashboardData.roster };
    if (!isAlum) {
      updatedRoster.actives = (updatedRoster.actives || []).map((b: any) => {
        if (b.id === dashboardData.profile.id) {
          return {
            ...b,
            phone: editPhone,
            year: editYear,
            major: editMajor,
          };
        }
        return b;
      });
    } else {
      updatedRoster.alumni = (updatedRoster.alumni || []).map((al: any) => {
        if (al.id === dashboardData.profile.id) {
          return {
            ...al,
            phone: editPhone,
            employer: editCompany,
            jobTitle: editJobTitle,
            city: editCity,
            state: editState,
            bio: editBio,
            linkedinUrl: editLinkedIn,
          };
        }
        return al;
      });
    }

    setDashboardData((prev: any) => ({
      ...prev,
      profile: updatedProfile,
      roster: updatedRoster,
    }));

    showToast("Profile updated successfully!", "success");
    setShowEditProfileModal(false);
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

  // Simulate Check-In door scanner
  const handleSimulateCheckIn = (pnmId: string) => {
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

  // Forgot password handler (Mobile)
  const handleMobileForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSuccess(true);
      showToast("Password reset link sent!", "success");
      setTimeout(() => {
        setForgotSuccess(false);
        setShowForgotPassword(false);
        setForgotEmail("");
      }, 1500);
    }, 1000);
  };

  // Presidential Admin: Add member
  const handleAddMobileMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      showToast("Member name is required.", "error");
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
  const handleRemoveMobileMember = (id: string, name: string, memberType: "actives" | "alumni") => {
    setConfirmModal({
      title: "Remove Member?",
      message: `Are you sure you want to remove ${name} from the roster? This cannot be undone.`,
      onConfirm: () => {
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
  const handleSendMobileResetLink = (email: string | null, name: string) => {
    if (!email) {
      showToast(`No email on file for ${name}.`, "error");
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
    viewRole, setViewRole, showChapterChooser, setShowChapterChooser, applyBrandToDemo,
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
    allChapters, filteredChapters, combinedFeed,
    handleSelectTenant, handleSignIn, handleSignOut, handleAddToCalendar, handleRsvp,
    handlePostJob, resetJobForm, handlePostAnnouncement, handleSaveProfile,
    handleSimulateStripePay, handlePnmVote, handleAddImpression, handleSimulateCheckIn,
    handleMobileForgotSubmit, handleAddMobileMember, handleRemoveMobileMember,
    handleSendMobileResetLink,
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

  // ── Per-role bottom nav (feature 3) ──────────────────────────────────────
  // Member and Officer share the 5 nav SLOTS (so the active-pill geometry is
  // stable) but show different icons/labels + route to different content.
  type TabId = "feed" | "events" | "rush" | "dues" | "directory" | "settings";
  const memberNav: { id: TabId; icon: any; label: string }[] = [
    { id: "feed", icon: Bell, label: "Feed" },
    { id: "events", icon: Calendar, label: "Events" },
    { id: "rush", icon: Users, label: isRushActive ? "Rush" : "Pledges" },
    { id: "dues", icon: role === "brother" ? DollarSign : Heart, label: role === "brother" ? "Dues" : "Giving" },
    { id: "directory", icon: Globe, label: "Network" },
  ];
  const execNav: { id: TabId; icon: any; label: string }[] = [
    { id: "feed", icon: Users, label: "Roster" },
    { id: "events", icon: Bell, label: "Announce" },
    { id: "rush", icon: TrendingUp, label: "Rush" },
    { id: "dues", icon: DollarSign, label: "Dues" },
    { id: "directory", icon: ShieldCheck, label: "Console" },
  ];
  const navItems = viewRole === "exec" ? execNav : memberNav;
  const activeNavIndex = Math.max(0, navItems.findIndex((n) => n.id === activeTab));

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col items-stretch justify-start overflow-hidden pt-14 font-sans text-slate-200 lg:flex-row lg:items-center lg:justify-center lg:gap-8 lg:p-8 lg:pt-8"
      style={{
        // Deep brand-tinted radial wash → near-black, so the shell reads as the
        // chapter's world. Transitions smoothly when the chapter changes.
        background: `radial-gradient(ellipse at 75% 0%, ${brandPrimary}33, transparent 55%), radial-gradient(ellipse at 15% 90%, ${brandSecond}1f, transparent 50%), linear-gradient(160deg, ${brandDeep}, #060810 60%, #04060d)`,
        transition: "background 0.9s cubic-bezier(0.16,1,0.3,1)",
      }}
    >

      {/* Chapter-colored Greek-letter field drifting behind EVERYTHING — the
          signature "picking a chapter transforms the room" effect. Tinted to the
          brand primary, scoped to this container (absolute), reduced-motion-safe
          via the field's own CSS. */}
      <GreekLetterField
        glyphs={brandGlyphs}
        color={brandPrimary}
        position="absolute"
        count={52}
        seed={0x51ed270b}
        className="opacity-[0.55] [&_*]:!opacity-[var(--go,0.12)]"
      />

      {/* 3D WebGL Plexus Background — DESKTOP-ONLY. The component already self-
          gates off under 640px, but we additionally only MOUNT it on the lg+
          showcase layout so phones never even allocate the <canvas> (zero 3D on
          phone, by construction). The flat brand wash + GreekLetterField above
          stays as the clean mobile background. */}
      {isDesktopShowcase && <WebGLBackground />}

      {/* Mobile-Friendly Sticky Top Header (Shown under lg viewports) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between z-[150] select-none">
        <div className="flex items-center gap-2">
          <img src="/brand/greekstack-mark.png?v=2" className="w-8 h-8 rounded-lg object-contain shadow-md" alt="Greekstack Logo" />
          <div>
            <span className="text-xs font-bold text-white tracking-wider uppercase block leading-none">Greekstack App</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{selectedBrand.letters} • {role === "brother" ? "Active" : "Alumnus"}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Website — icon-only on the narrowest phones, labeled from sm+. */}
          <button
            onClick={() => window.location.href = "/"}
            aria-label="Back to website"
            className="press flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[12px] font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
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
          <div className="flex items-center gap-3">
            <img src="/brand/greekstack-mark.png?v=2" className="w-10 h-10 rounded-xl object-contain shadow-md" alt="Greekstack Logo" />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[12px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Interactive Demo
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1.5">Greekstack App</h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Experience the active brother and alumnus mobile application. Browse recruitment, pay dues, view calendar RSVPs, vote on elections, and check chore wheels.
          </p>
        </div>

        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Active Chapter</span>
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
              <Palette className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-white" />
            </button>
          </div>

          {/* Role View toggle — Member ⇄ Officer (feature 3) */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Role View</span>
            <div className="relative grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <span
                aria-hidden="true"
                className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  background: `linear-gradient(135deg, ${brandPrimary}, ${brandSecond})`,
                  transform: viewRole === "exec" ? "translateX(calc(100% + 0.5rem))" : "translateX(0)",
                }}
              />
              <button
                onClick={() => { setViewRole("member"); setActiveTab("feed"); }}
                disabled={!token}
                className={`relative z-10 min-h-[36px] rounded-lg text-[12px] font-bold transition-colors disabled:opacity-50 ${viewRole === "member" ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Member
              </button>
              <button
                onClick={() => { setViewRole("exec"); setActiveTab("feed"); }}
                disabled={!token}
                className={`relative z-10 min-h-[36px] rounded-lg text-[12px] font-bold transition-colors disabled:opacity-50 ${viewRole === "exec" ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Officer
              </button>
            </div>
            <p className="px-0.5 text-[11px] leading-snug text-slate-500">
              {viewRole === "exec"
                ? "Admin tools: roster, dues mgmt, rush pipeline, announcements."
                : "Member experience: feed, events, dues, directory."}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="space-y-3 pt-5 border-t border-white/10">
          <button
            onClick={() => window.location.href = "/"}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Website
          </button>

          {/* Sign in — sends a real chapter member to the live login (this view is
              a demo; existing brothers/alumni log into their actual chapter here). */}
          <button
            onClick={() => window.location.href = "/login"}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign in
          </button>

          <button
            onClick={() => { setShowBookingModal(true); setBookingSubmitted(false); }}
            className="w-full py-2.5 px-4 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Calendar className="w-3.5 h-3.5" /> Book a Meeting
          </button>

          <button
            onClick={() => setShowPricingModal(true)}
            className="w-full py-2.5 px-4 text-xs font-bold text-slate-950 rounded-xl bg-gradient-to-r from-blue-400 via-sky-400 to-amber-300 hover:opacity-95 shadow-[0_4px_20px_-4px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> Launch Chapter Now
          </button>
        </div>
      </div>

      {/* Phone chassis & screen simulator wrapper.
          On <lg the demo is FULL-BLEED (no chassis, fills the viewport below the
          sticky mobile header) so it reads as a real app, not a phone-in-a-phone.
          On lg+ we keep the tilting showcase device frame. */}
      <div
        className="relative z-10 flex shrink-0 select-none items-center justify-center w-full max-w-none flex-1 lg:max-w-md lg:flex-none"
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
          onMouseMove={handlePhoneMouseMove}
          onMouseEnter={handlePhoneMouseEnter}
          onMouseLeave={handlePhoneMouseLeave}
          className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-white rounded-none border-0 lg:h-[820px] lg:rounded-[48px] lg:border-[12px] lg:border-slate-800"
          // Phone (full-bleed real app): NO inline transform/shadow at all — the
          // app fills the device edge-to-edge, flat. Desktop showcase: cursor-
          // tracked 3D tilt + dynamic glare shadow on the chassis.
          style={
            isDesktopShowcase
              ? {
                  transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHoveringPhone ? 1.015 : 1})`,
                  boxShadow: isHoveringPhone
                    ? `${-rotateY * 3.5}px ${rotateX * 3.5 + 24}px 55px -10px rgba(0,0,0,0.9)`
                    : '0 20px 50px -10px rgba(0,0,0,0.55)',
                  transition: isHoveringPhone
                    ? 'transform 0.05s ease-out, box-shadow 0.05s ease-out'
                    : 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
                }
              : undefined
          }
        >
          {/* Glass reflection glare — lg+ only (the device showcase). */}
          <div
            className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay transition-opacity duration-300 hidden lg:block"
            style={{
              opacity: isHoveringPhone ? 0.35 : 0.08,
              background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 65%)`,
            }}
          />

          {/* Dynamic island notch + iOS status bar — lg+ device showcase only. */}
          <div className="hidden lg:flex absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-6 rounded-full bg-black z-50 items-center justify-between px-3 text-[12px] text-slate-500">
            <span className="font-semibold text-slate-400 select-none">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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

          {/* Custom Forgot Password Overlay Modal */}
          {showForgotPassword && renderForgotPasswordModal(ctx)}

          {/* Custom Add Member Overlay Modal (President Console) */}
          {showAddMemberModal && renderAddMemberModal(ctx)}
          
          {/* 1. Onboarding Chapter Selection (pick OR build any chapter) */}
          {!selectedTenant && renderChapterChooser(ctx)}

          {/* In-app chapter switcher overlay — re-skins the live demo without a
              sign-out. Slides up over the running app. */}
          {selectedTenant && token && showChapterChooser && (
            <div className="absolute inset-0 z-[80] flex flex-col bg-white animate-spotlight-in">
              {renderChapterChooser(ctx, { overlay: true })}
            </div>
          )}

          {/* 2. Login Page */}
          {selectedTenant && !token && renderLogin(ctx)}

          {/* 3. Dashboard views */}
          {token && selectedTenant && (
            <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
              
              {/* App Status Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                {/* Tap the brand lockup to swap/build a chapter live */}
                <button
                  onClick={() => { setChooserMode("pick"); setShowChapterChooser(true); }}
                  className="press group flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-2 text-left transition hover:bg-slate-50"
                  aria-label="Switch chapter"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl border text-[13px] font-bold shadow-inner"
                    style={{
                      background: `linear-gradient(140deg, ${selectedBrand.primaryColor}14, ${brandSecond}14)`,
                      borderColor: selectedBrand.primaryColor + "26",
                      color: selectedBrand.primaryColor,
                    }}
                  >
                    {selectedBrand.letters}
                  </div>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1 truncate text-[13px] font-bold leading-tight text-slate-900">
                      <span className="truncate max-w-[140px]">{dashboardData?.chapter?.name || selectedTenant.name}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-slate-600" />
                    </h3>
                    <span className="block max-w-[160px] truncate text-[11px] text-slate-500">
                      {dashboardData?.chapter?.schoolName || selectedTenant.school}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1.5">
                  {isDemo && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[12px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                      Demo
                    </span>
                  )}
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="press flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-slate-700 transition hover:text-slate-900"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    </span>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-slate-600">
                      {viewRole === "exec" ? "Officer" : role === "brother" ? "Member" : "Alumnus"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Role-view toggle (feature 3) — always reachable inside the phone
                  (the desktop sidebar toggle is hidden on mobile). Flips the whole
                  experience between the member app and the officer console. */}
              <div className="relative grid shrink-0 grid-cols-2 gap-1 border-b border-slate-100 bg-white px-3 pb-2.5 pt-2">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-2 left-3 w-[calc(50%-0.875rem)] rounded-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                  style={{
                    background: `linear-gradient(135deg, ${brandPrimary}, ${brandSecond})`,
                    transform: viewRole === "exec" ? "translateX(calc(100% + 0.25rem))" : "translateX(0)",
                  }}
                />
                <button
                  onClick={() => { setViewRole("member"); setActiveTab("feed"); }}
                  className={`press relative z-10 flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors ${viewRole === "member" ? "text-white" : "text-slate-500"}`}
                >
                  <User className="h-4 w-4" /> Member
                </button>
                <button
                  onClick={() => { setViewRole("exec"); setActiveTab("feed"); }}
                  className={`press relative z-10 flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors ${viewRole === "exec" ? "text-white" : "text-slate-500"}`}
                >
                  <Crown className="h-4 w-4" /> Officer
                </button>
              </div>

              {/* Main Scrollable Viewport — compact mobile density (p-3) so cards
                  fit more on screen; a touch roomier on the lg+ showcase. */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 lg:p-4">
                
                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-7 h-7 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                    <span className="text-xs">Connecting securely...</span>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="text-xs text-red-600">{error}</p>
                    <button
                      onClick={() => handleSignOut()}
                      className="text-xs text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      Return to Login
                    </button>
                  </div>
                ) : viewRole === "exec" ? (
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

                    {/* D. DUES TAB (Brothers) or GIVING TAB (Alumni) */}
                    {activeTab === "dues" && renderDuesTab(ctx)}

                    {/* E. DIRECTORY TAB (Actives, Alumni, Careers sub-views) */}
                    {activeTab === "directory" && renderDirectoryTab(ctx)}

                    {/* F. SETTINGS TAB */}
                    {activeTab === "settings" && renderSettingsTab(ctx)}
                  </div>
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
                <div className="absolute inset-x-3 bottom-[4.75rem] z-[60] animate-spring-in">
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
                        <Info className="h-3.5 w-3.5" />
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
                        <button
                          onClick={() => setCalloutDismissed(true)}
                          className="mt-2 text-[12px] font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                        >
                          Turn off tips
                        </button>
                      </div>
                    </div>
                    {/* dismiss just this one (it returns on the next tab) */}
                    <button
                      onClick={() => setCalloutVisible(false)}
                      aria-label="Dismiss tip"
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Persistent Bottom Tab Bar Navigation — data-driven per role,
                  with a spring active-pill that slides between slots + ≥44px
                  touch targets + safe-area padding for the full-bleed mobile shell. */}
              <div className="relative z-10 grid shrink-0 grid-cols-5 items-stretch border-t border-slate-100 bg-white px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]">
                {/* Sliding brand active-pill behind the icons. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-1.5 top-1.5 rounded-2xl transition-transform duration-[380ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
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
                      style={{ color: active ? brandPrimary : "#94A3B8" }}
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
