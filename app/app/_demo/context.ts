import type React from "react";
import type { Tenant, FraternityBrand } from "./mock-data";

// Shared context bundle for the interactive demo's surfaces and modals.
//
// The /app demo is one large stateful client component (MobileAppClient). To
// split its UI into a feature folder WITHOUT changing any behavior, the
// orchestrator keeps ALL hooks/state/handlers and passes this single `ctx`
// object to each extracted surface/modal render function. The render functions
// are plain functions of `ctx` (no hooks of their own), so React's hook order,
// fiber identity, and state semantics are exactly as before — the surfaces are
// inlined into the same render scope via `{renderX(ctx)}`.
//
// Types intentionally mirror the original component (lots of `any`) so the
// extraction introduces no new type errors.
export interface DemoContext {
  // ── Core selection / auth ──────────────────────────────────────────────
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  setSelectedTenant: React.Dispatch<React.SetStateAction<Tenant | null>>;
  selectedBrand: FraternityBrand;
  setSelectedBrand: React.Dispatch<React.SetStateAction<FraternityBrand>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  role: "brother" | "alumni";
  setRole: React.Dispatch<React.SetStateAction<"brother" | "alumni">>;
  // Officer lens over the member experience (member = active brother;
  // exec = officer/admin tools). Distinct from `role` (brother vs alumni).
  viewRole: "member" | "exec";
  setViewRole: React.Dispatch<React.SetStateAction<"member" | "exec">>;
  // In-app chapter chooser overlay (pick/create any org and re-skin live).
  showChapterChooser: boolean;
  setShowChapterChooser: React.Dispatch<React.SetStateAction<boolean>>;
  applyBrandToDemo: (brand: FraternityBrand, opts?: { name?: string; school?: string }) => void;
  // Custom-chapter builder ("enter ANY org") form state + apply handler.
  chooserMode: "pick" | "create";
  setChooserMode: React.Dispatch<React.SetStateAction<"pick" | "create">>;
  customName: string;
  setCustomName: React.Dispatch<React.SetStateAction<string>>;
  customLetters: string;
  setCustomLetters: React.Dispatch<React.SetStateAction<string>>;
  customSchool: string;
  setCustomSchool: React.Dispatch<React.SetStateAction<string>>;
  customPrimary: string;
  setCustomPrimary: React.Dispatch<React.SetStateAction<string>>;
  customSecondary: string;
  setCustomSecondary: React.Dispatch<React.SetStateAction<string>>;
  applyCustomChapter: () => void;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  isDemo: boolean;
  setIsDemo: React.Dispatch<React.SetStateAction<boolean>>;

  // ── Side-panel modals ──────────────────────────────────────────────────
  showPricingModal: boolean;
  setShowPricingModal: React.Dispatch<React.SetStateAction<boolean>>;
  showBookingModal: boolean;
  setShowBookingModal: React.Dispatch<React.SetStateAction<boolean>>;
  bookingDate: string;
  setBookingDate: React.Dispatch<React.SetStateAction<string>>;
  bookingTime: string;
  setBookingTime: React.Dispatch<React.SetStateAction<string>>;
  bookingName: string;
  setBookingName: React.Dispatch<React.SetStateAction<string>>;
  bookingEmail: string;
  setBookingEmail: React.Dispatch<React.SetStateAction<string>>;
  bookingSubmitted: boolean;
  setBookingSubmitted: React.Dispatch<React.SetStateAction<boolean>>;

  showForgotPassword: boolean;
  setShowForgotPassword: React.Dispatch<React.SetStateAction<boolean>>;

  // ── 3D tilt / glare ────────────────────────────────────────────────────
  rotateX: number;
  setRotateX: React.Dispatch<React.SetStateAction<number>>;
  rotateY: number;
  setRotateY: React.Dispatch<React.SetStateAction<number>>;
  glarePosition: { x: number; y: number };
  setGlarePosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isHoveringPhone: boolean;
  setIsHoveringPhone: React.Dispatch<React.SetStateAction<boolean>>;
  handlePhoneMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handlePhoneMouseEnter: () => void;
  handlePhoneMouseLeave: () => void;

  // ── Sober-driving / new-member simulator ───────────────────────────────
  isRushActive: boolean;
  setIsRushActive: React.Dispatch<React.SetStateAction<boolean>>;
  simulatedDay: "Friday" | "Saturday" | "Other";
  setSimulatedDay: React.Dispatch<React.SetStateAction<"Friday" | "Saturday" | "Other">>;
  simulatedHour: number;
  setSimulatedHour: React.Dispatch<React.SetStateAction<number>>;
  activeSubTab: "directory" | "schedule";
  setActiveSubTab: React.Dispatch<React.SetStateAction<"directory" | "schedule">>;
  soberAssignments: Record<string, string>;
  setSoberAssignments: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // ── Forgot password (mobile) ───────────────────────────────────────────
  forgotEmail: string;
  setForgotEmail: React.Dispatch<React.SetStateAction<string>>;
  forgotLoading: boolean;
  setForgotLoading: React.Dispatch<React.SetStateAction<boolean>>;
  forgotSuccess: boolean;
  setForgotSuccess: React.Dispatch<React.SetStateAction<boolean>>;

  // ── President console: add member ──────────────────────────────────────
  showAddMemberModal: boolean;
  setShowAddMemberModal: React.Dispatch<React.SetStateAction<boolean>>;
  newMemberName: string;
  setNewMemberName: React.Dispatch<React.SetStateAction<string>>;
  newMemberEmail: string;
  setNewMemberEmail: React.Dispatch<React.SetStateAction<string>>;
  newMemberPhone: string;
  setNewMemberPhone: React.Dispatch<React.SetStateAction<string>>;
  newMemberRole: "actives" | "alumni";
  setNewMemberRole: React.Dispatch<React.SetStateAction<"actives" | "alumni">>;
  newMemberPosition: string;
  setNewMemberPosition: React.Dispatch<React.SetStateAction<string>>;
  newMemberGradYear: string;
  setNewMemberGradYear: React.Dispatch<React.SetStateAction<string>>;

  // ── Tab nav / loading ──────────────────────────────────────────────────
  activeTab: "feed" | "events" | "rush" | "dues" | "directory" | "settings";
  setActiveTab: React.Dispatch<React.SetStateAction<"feed" | "events" | "rush" | "dues" | "directory" | "settings">>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  authLoading: boolean;
  setAuthLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  dashboardData: any;
  setDashboardData: React.Dispatch<React.SetStateAction<any>>;

  // ── Search / sub-tab filters ───────────────────────────────────────────
  expandedAnnouncementId: string | null;
  setExpandedAnnouncementId: React.Dispatch<React.SetStateAction<string | null>>;
  rosterSearch: string;
  setRosterSearch: React.Dispatch<React.SetStateAction<string>>;
  rosterTab: "actives" | "alumni" | "careers";
  setRosterTab: React.Dispatch<React.SetStateAction<"actives" | "alumni" | "careers">>;
  rsvpSubmittingId: string | null;
  setRsvpSubmittingId: React.Dispatch<React.SetStateAction<string | null>>;

  // ── Rush tab ───────────────────────────────────────────────────────────
  rushSearch: string;
  setRushSearch: React.Dispatch<React.SetStateAction<string>>;
  rushFilter: "ALL" | "ACTIVE" | "BID_EXTENDED" | "DROPPED";
  setRushFilter: React.Dispatch<React.SetStateAction<"ALL" | "ACTIVE" | "BID_EXTENDED" | "DROPPED">>;
  selectedPnm: any | null;
  setSelectedPnm: React.Dispatch<React.SetStateAction<any | null>>;
  newImpressionNote: string;
  setNewImpressionNote: React.Dispatch<React.SetStateAction<string>>;
  newImpressionTone: "positive" | "neutral" | "concern";
  setNewImpressionTone: React.Dispatch<React.SetStateAction<"positive" | "neutral" | "concern">>;
  userVoteInput: number;
  setUserVoteInput: React.Dispatch<React.SetStateAction<number>>;

  // ── Job posting ────────────────────────────────────────────────────────
  showPostJobModal: boolean;
  setShowPostJobModal: React.Dispatch<React.SetStateAction<boolean>>;
  jobTitle: string;
  setJobTitle: React.Dispatch<React.SetStateAction<string>>;
  jobCompany: string;
  setJobCompany: React.Dispatch<React.SetStateAction<string>>;
  jobLocation: string;
  setJobLocation: React.Dispatch<React.SetStateAction<string>>;
  jobSalary: string;
  setJobSalary: React.Dispatch<React.SetStateAction<string>>;
  jobContactName: string;
  setJobContactName: React.Dispatch<React.SetStateAction<string>>;
  jobContactEmail: string;
  setJobContactEmail: React.Dispatch<React.SetStateAction<string>>;
  jobContactPhone: string;
  setJobContactPhone: React.Dispatch<React.SetStateAction<string>>;
  jobDescription: string;
  setJobDescription: React.Dispatch<React.SetStateAction<string>>;
  jobRequirements: string;
  setJobRequirements: React.Dispatch<React.SetStateAction<string>>;
  postJobError: string | null;
  setPostJobError: React.Dispatch<React.SetStateAction<string | null>>;
  postJobSuccess: boolean;
  setPostJobSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  expandedJobId: string | null;
  setExpandedJobId: React.Dispatch<React.SetStateAction<string | null>>;

  // ── Toast / confirm ────────────────────────────────────────────────────
  toast: { message: string; type: "success" | "info" | "error" } | null;
  setToast: React.Dispatch<React.SetStateAction<{ message: string; type: "success" | "info" | "error" } | null>>;
  showToast: (message: string, type?: "success" | "info" | "error") => void;
  confirmModal: { title: string; message: string; onConfirm: () => void } | null;
  setConfirmModal: React.Dispatch<React.SetStateAction<{ title: string; message: string; onConfirm: () => void } | null>>;

  // ── Post announcement ──────────────────────────────────────────────────
  showPostAnnModal: boolean;
  setShowPostAnnModal: React.Dispatch<React.SetStateAction<boolean>>;
  annTitle: string;
  setAnnTitle: React.Dispatch<React.SetStateAction<string>>;
  annBody: string;
  setAnnBody: React.Dispatch<React.SetStateAction<string>>;
  annPinned: boolean;
  setAnnPinned: React.Dispatch<React.SetStateAction<boolean>>;
  postAnnSuccess: boolean;
  setPostAnnSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  jobCrossPost: boolean;
  setJobCrossPost: React.Dispatch<React.SetStateAction<boolean>>;

  // ── Spotlight surfaces (elections/treasury/giving/qr/theme) ────────────
  spotlight: null | "elections" | "treasury" | "giving" | "qr" | "theme";
  setSpotlight: React.Dispatch<React.SetStateAction<null | "elections" | "treasury" | "giving" | "qr" | "theme">>;
  myBallot: Record<string, string>;
  setMyBallot: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  donationCents: number;
  setDonationCents: React.Dispatch<React.SetStateAction<number>>;
  donationDone: boolean;
  setDonationDone: React.Dispatch<React.SetStateAction<boolean>>;
  qrName: string;
  setQrName: React.Dispatch<React.SetStateAction<string>>;
  qrMajor: string;
  setQrMajor: React.Dispatch<React.SetStateAction<string>>;
  qrYear: string;
  setQrYear: React.Dispatch<React.SetStateAction<string>>;
  qrCheckedIn: string[];
  setQrCheckedIn: React.Dispatch<React.SetStateAction<string[]>>;
  castBallot: (seatId: string, candidateId: string) => void;
  handleDonate: () => void;
  handleQrCheckIn: () => void;

  // ── Interactive callouts ───────────────────────────────────────────────
  calloutVisible: boolean;
  setCalloutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  calloutDismissed: boolean;
  setCalloutDismissed: React.Dispatch<React.SetStateAction<boolean>>;

  // ── Edit profile ───────────────────────────────────────────────────────
  showEditProfileModal: boolean;
  setShowEditProfileModal: React.Dispatch<React.SetStateAction<boolean>>;
  editPhone: string;
  setEditPhone: React.Dispatch<React.SetStateAction<string>>;
  editHometown: string;
  setEditHometown: React.Dispatch<React.SetStateAction<string>>;
  editYear: string;
  setEditYear: React.Dispatch<React.SetStateAction<string>>;
  editMajor: string;
  setEditMajor: React.Dispatch<React.SetStateAction<string>>;
  editCompany: string;
  setEditCompany: React.Dispatch<React.SetStateAction<string>>;
  editJobTitle: string;
  setEditJobTitle: React.Dispatch<React.SetStateAction<string>>;
  editCity: string;
  setEditCity: React.Dispatch<React.SetStateAction<string>>;
  editState: string;
  setEditState: React.Dispatch<React.SetStateAction<string>>;
  editBio: string;
  setEditBio: React.Dispatch<React.SetStateAction<string>>;
  editLinkedIn: string;
  setEditLinkedIn: React.Dispatch<React.SetStateAction<string>>;

  // ── Derived values ─────────────────────────────────────────────────────
  allChapters: Tenant[];
  filteredChapters: Tenant[];
  combinedFeed: any[];

  // ── Handlers ───────────────────────────────────────────────────────────
  handleSelectTenant: (t: Tenant) => void;
  handleSignIn: (e: React.FormEvent) => Promise<void>;
  handleSignOut: () => void;
  handleAddToCalendar: (e: any) => void;
  handleRsvp: (eventId: string, status: "GOING" | "MAYBE" | "NOT_GOING") => Promise<void>;
  handlePostJob: (e: React.FormEvent) => Promise<void>;
  resetJobForm: () => void;
  handlePostAnnouncement: (e: React.FormEvent) => void;
  handleSaveProfile: (e: React.FormEvent) => void;
  handleSimulateStripePay: () => void;
  handlePnmVote: (pnmId: string, score: number) => void;
  handleAddImpression: (e: React.FormEvent, pnmId: string) => void;
  handleSimulateCheckIn: (pnmId: string) => void;
  handleMobileForgotSubmit: (e: React.FormEvent) => void;
  handleAddMobileMember: (e: React.FormEvent) => void;
  handleRemoveMobileMember: (id: string, name: string, memberType: "actives" | "alumni") => void;
  handleSendMobileResetLink: (email: string | null, name: string) => void;
}
