// Demo data layer for the interactive Greekstack mobile-app preview.
//
// Pure types, brand constants, demo tenants, per-tab callout copy, and the
// `getMockDemoData` builder that seeds the offline demo. Extracted verbatim from
// MobileAppClient.tsx — no behavior change; this is the single source of mock
// data the orchestrator and its surfaces read from.

export interface Tenant {
  id: string;
  subdomain: string;
  name: string | null;
  school: string | null;
  isActive: boolean;
  brandId?: string;
}

export interface MobileAppClientProps {
  initialTenants: Tenant[];
}

export interface FraternityBrand {
  id: string;
  name: string;
  letters: string;
  primaryColor: string;
  primaryHover: string;
  textColor: string;
  accentBg: string;
  accentBorder: string;
  crestEmoji: string;
}

export const FRATERNITY_BRANDS: FraternityBrand[] = [
  {
    id: "phi-sig",
    name: "Phi Sigma Kappa",
    letters: "ΦΣΚ",
    primaryColor: "#C8102E", // Cardinal Red
    primaryHover: "#A00D24",
    textColor: "text-red-600",
    accentBg: "bg-red-50",
    accentBorder: "border-red-100",
    crestEmoji: "🛡️"
  },
  {
    id: "sig-chi",
    name: "Sigma Chi",
    letters: "ΣΧ",
    primaryColor: "#0056B3", // Blue
    primaryHover: "#003F85",
    textColor: "text-blue-600",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-100",
    crestEmoji: "🌟"
  },
  {
    id: "kap-sig",
    name: "Kappa Sigma",
    letters: "ΚΣ",
    primaryColor: "#00875A", // Emerald Green
    primaryHover: "#006644",
    textColor: "text-emerald-600",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-100",
    crestEmoji: "🔑"
  },
  {
    id: "ato",
    name: "Alpha Tau Omega",
    letters: "ΑΤΩ",
    primaryColor: "#0077C8", // Azure Blue
    primaryHover: "#005994",
    textColor: "text-sky-600",
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-100",
    crestEmoji: "⚓"
  },
  {
    id: "sae",
    name: "Sigma Alpha Epsilon",
    letters: "ΣΑΕ",
    primaryColor: "#512888", // Royal Purple
    primaryHover: "#3E1F68",
    textColor: "text-purple-600",
    accentBg: "bg-purple-50",
    accentBorder: "border-purple-100",
    crestEmoji: "🦁"
  },
  {
    id: "beta",
    name: "Beta Theta Pi",
    letters: "ΒΘΠ",
    primaryColor: "#1A82E2", // Sky Blue
    primaryHover: "#1267B7",
    textColor: "text-sky-500",
    accentBg: "bg-sky-50",
    accentBorder: "border-sky-100",
    crestEmoji: "🐉"
  }
];

export const DEMO_TENANTS: Tenant[] = [
  { id: "demo-psk", subdomain: "psk", name: "Phi Sigma Kappa", school: "University of South Carolina", isActive: true, brandId: "phi-sig" },
  { id: "demo-sigchi", subdomain: "sigchi", name: "Sigma Chi", school: "University of South Carolina", isActive: true, brandId: "sig-chi" },
  { id: "demo-kapsig", subdomain: "kapsig", name: "Kappa Sigma", school: "University of South Carolina", isActive: true, brandId: "kap-sig" },
  { id: "demo-ato", subdomain: "ato", name: "Alpha Tau Omega", school: "University of South Carolina", isActive: true, brandId: "ato" },
  { id: "demo-sae", subdomain: "sae", name: "Sigma Alpha Epsilon", school: "University of South Carolina", isActive: true, brandId: "sae" },
  { id: "demo-beta", subdomain: "beta", name: "Beta Theta Pi", school: "University of South Carolina", isActive: true, brandId: "beta" },
];

/**
 * Per-tab explainer copy for the interactive demo tour. As a visitor taps
 * through the bottom tabs, a small dismissible callout surfaces inside the phone
 * describing exactly what that tool does for a real chapter — so the demo isn't
 * just a pretty mockup, it teaches the product feature-by-feature.
 */
export const DEMO_CALLOUTS: Record<
  "feed" | "events" | "rush" | "dues" | "directory" | "settings",
  { title: string; body: string }
> = {
  feed: {
    title: "Chapter feed",
    body: "Officers broadcast announcements here — pinned when it matters. Every member sees the latest chapter news on their dashboard instead of digging through a group chat.",
  },
  events: {
    title: "Events & calendar",
    body: "Meetings, socials, and service events with RSVP and one-tap roster check-in. Members add any event to their personal Google / iCloud calendar in a tap.",
  },
  rush: {
    title: "Recruitment pipeline",
    body: "Run your whole rush from one board: QR check-in builds the PNM list, brothers vote anonymously, and rushees get TCPA-compliant texts — no spreadsheet, no five group chats.",
  },
  dues: {
    title: "Dues & payments",
    body: "Members pay by card via Stripe; money lands straight in your chapter's account and the ledger reconciles itself. Payment plans and reminders run on their own.",
  },
  directory: {
    title: "Roster & alumni network",
    body: "A searchable directory of actives and alumni by class year — plus gated alumni onboarding and Stripe giving flows that turn graduated brothers into a recurring base.",
  },
  settings: {
    title: "Your profile",
    body: "Each member manages their own profile, privacy, and notifications. Officers get role-scoped access so everyone sees exactly their job — nothing more.",
  },
};

export function getMockDemoData(tenant: Tenant, brand: FraternityBrand) {
  return {
    chapter: {
      subdomain: tenant.subdomain,
      name: `${brand.name} (${brand.letters})`,
      schoolName: tenant.school || "University of South Carolina",
    },
    role: "brother",
    profile: {
      id: "demo-brother-id",
      name: "Alex Mercer",
      email: `alex.mercer@${tenant.subdomain}.edu`,
      phone: "803-555-0144",
      year: "Senior",
      major: "Computer Science",
      position: "President",
      pledgeClass: "Alpha Chi",
      hometown: "Charleston, SC",
      gradYear: "2026",
      status: "ACTIVE",
      duesPaid: false,
    },
    standing: {
      score: 92,
      max: 100,
      pct: 92,
      standing: "GOOD",
      breakdown: [
        { label: "Attendance", pct: 95 },
        { label: "Service Hours", pct: 100 },
        { label: "Dues Status", pct: 0 },
      ]
    },
    dues: {
      config: {
        enabled: true,
        // Per-member chapter dues for the semester (a believable sample amount —
        // NOT the Greekstack platform price). Chapters set their own number in Admin.
        amountCents: 45000,
        year: "2026-fall",
        label: "Active Brother Dues",
        stripePublishableKey: "pk_test_1234",
      },
      payments: [],
      isPaid: false,
    },
    // ── Officer Elections (secret ballot) ────────────────────────────────────
    // One OPEN election with two contested seats. Ballots are anonymous: the demo
    // tracks only WHETHER the viewer has voted per seat and aggregate tallies — no
    // per-voter record, mirroring the real secret-ballot model.
    election: {
      id: "el-2026",
      title: "2026 Executive Board Election",
      status: "OPEN",
      closesAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      totalEligible: 42,
      ballotsCast: 27,
      seats: [
        {
          id: "seat-pres",
          title: "President",
          candidates: [
            { id: "c1", name: "Alex Mercer", year: "Senior", votes: 14, blurb: "Current VP · ran fall rush to a record class" },
            { id: "c2", name: "Daniel Cho", year: "Junior", votes: 9, blurb: "Treasurer · rebuilt the chapter budget" },
          ],
        },
        {
          id: "seat-treas",
          title: "Treasurer",
          candidates: [
            { id: "c3", name: "Marcus Webb", year: "Junior", votes: 11, blurb: "Finance major · dues reconciliation lead" },
            { id: "c4", name: "Ethan Park", year: "Sophomore", votes: 12, blurb: "Built the philanthropy donation drive" },
          ],
        },
      ],
    },
    // ── Treasury / budgets ───────────────────────────────────────────────────
    treasury: {
      balanceCents: 1284750,
      duesCollectedCents: 1890000,
      duesOutstandingCents: 360000,
      budget: [
        { id: "b1", category: "Recruitment", plannedCents: 450000, spentCents: 318000 },
        { id: "b2", category: "Philanthropy", plannedCents: 300000, spentCents: 142500 },
        { id: "b3", category: "Socials", plannedCents: 520000, spentCents: 489000 },
        { id: "b4", category: "Operations", plannedCents: 280000, spentCents: 201400 },
        { id: "b5", category: "Formals", plannedCents: 600000, spentCents: 0 },
      ],
      ledger: [
        { id: "t1", label: "Spring dues batch (Stripe)", amountCents: 412000, kind: "in", date: new Date(Date.now() - 2 * 86400000).toISOString() },
        { id: "t2", label: "Homecoming tailgate catering", amountCents: -86400, kind: "out", date: new Date(Date.now() - 5 * 86400000).toISOString() },
        { id: "t3", label: "Recruitment t-shirts", amountCents: -129900, kind: "out", date: new Date(Date.now() - 9 * 86400000).toISOString() },
        { id: "t4", label: "Alumni donation — J. Holloway '12", amountCents: 50000, kind: "in", date: new Date(Date.now() - 12 * 86400000).toISOString() },
      ],
    },
    // ── Alumni giving ────────────────────────────────────────────────────────
    giving: {
      campaign: "2026 Chapter House Renovation Fund",
      goalCents: 5000000,
      raisedCents: 3120000,
      donorCount: 84,
      recent: [
        { id: "g1", name: "James Holloway '12", amountCents: 50000 },
        { id: "g2", name: "Sarah Kim '15", amountCents: 25000 },
        { id: "g3", name: "Anonymous", amountCents: 100000 },
      ],
    },
    announcements: [
      {
        id: "a1",
        title: "Chapter Meeting Sunday at 7 PM",
        body: "We will be discussing fall rush preparation and voting on the new budget. Attendance is mandatory for all active brothers. Location: Chapter Room.",
        pinned: true,
        createdAt: new Date().toISOString(),
        authorName: "Alex Mercer",
        authorRole: "President",
      },
      {
        id: "a2",
        title: "Community Service Day - Saturday",
        body: "Join us at the local Special Olympics center starting at 9 AM. Wear chapter letters. We need at least 15 brothers to hit our required semester hours.",
        pinned: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        authorName: "Jack Snyder",
        authorRole: "Philanthropy Chair",
      },
    ],
    events: [
      {
        id: "e1",
        name: "Fall Info Session & Coffee",
        description: "First open rush event. Come meet prospective members and share coffee.",
        location: "Russell House Union",
        dressCode: "Casual / Letters",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: null,
        category: "RUSH",
        myRsvp: null,
      },
      {
        id: "e2",
        name: "Formal Chapter Meeting",
        description: "Ritual meeting. Active members only. Budget vote.",
        location: "Chapter Room",
        dressCode: "Formal (Suit & Tie)",
        startsAt: new Date(Date.now() + 172800000).toISOString(),
        endsAt: null,
        category: "CHAPTER",
        myRsvp: { status: "GOING" },
      },
    ],
    roster: {
      actives: [
        {
          id: "demo-brother-id",
          name: "Alex Mercer",
          email: `alex.mercer@${tenant.subdomain}.edu`,
          phone: "803-555-0144",
          year: "Senior",
          major: "Computer Science",
          position: "President",
          pledgeClass: "Alpha Chi",
          headshotUrl: null,
          status: "ACTIVE",
        },
        {
          id: "b2",
          name: "Jack Snyder",
          email: `jack.s@${tenant.subdomain}.edu`,
          phone: "803-555-0291",
          year: "Junior",
          major: "Finance",
          position: "Treasurer",
          pledgeClass: "Beta Alpha",
          headshotUrl: null,
          status: "ACTIVE",
        },
      ],
      alumni: [
        {
          id: "al1",
          name: "Marcus Brody",
          preferredName: "Marc",
          graduationYear: 2020,
          pledgeClass: "Upsilon",
          email: "marcus.brody@google.com",
          phone: "415-555-0921",
          city: "San Francisco",
          state: "CA",
          employer: "Google",
          jobTitle: "Software Engineer Senior",
          linkedinUrl: "https://linkedin.com",
          bio: "Always happy to help younger brothers review resumes and talk tech.",
        },
        {
          id: "al2",
          name: "David Vance",
          preferredName: "Dave",
          graduationYear: 2018,
          pledgeClass: "Sigma",
          email: "d.vance@goldmansachs.com",
          phone: "212-555-0811",
          city: "New York",
          state: "NY",
          employer: "Goldman Sachs",
          jobTitle: "Investment Banking Associate",
          linkedinUrl: "https://linkedin.com",
          bio: "Reach out if you are interested in finance internships or analyst opportunities.",
        },
      ],
    },
    careers: [
      {
        id: "c1",
        title: "Software Engineering Intern (Fall 2026)",
        company: "Google",
        location: "San Francisco, CA (Hybrid)",
        description: "We are looking for a software engineering intern to join our Google Search infrastructure team. You will work on scalable backend APIs using Go/C++ and learn real-world optimization.",
        requirements: "Prior experience with algorithms, data structures, and at least one backend language. Class of 2027 or 2028 preferred.",
        contactName: "Marcus Brody",
        contactEmail: "marcus.brody@google.com",
        contactPhone: "415-555-0921",
        salary: "$45/hr",
        postedById: "al1",
        postedByName: "Marcus Brody",
        postedByRole: "alumni",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: "c2",
        title: "Investment Banking Analyst",
        company: "Goldman Sachs",
        location: "New York, NY",
        description: "Full-time investment banking analyst role. Looking for seniors or recent grads with strong financial modeling skills to join our FIG coverage group.",
        requirements: "Finance, Economics, or math background. Excel modeling knowledge is a plus.",
        contactName: "David Vance",
        contactEmail: "d.vance@goldmansachs.com",
        contactPhone: "212-555-0811",
        salary: "$110,000/yr",
        postedById: "al2",
        postedByName: "David Vance",
        postedByRole: "alumni",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
    pnms: [
      {
        id: "pnm1",
        name: "John Doe",
        email: "john.doe@gmail.com",
        phone: "803-555-0199",
        hometown: "Charleston, SC",
        major: "Finance",
        year: "Freshman",
        highSchoolInfo: "Wando High School",
        backgroundInfo: "High school varsity soccer captain. Interested in business/finance track.",
        linkedinUrl: "https://linkedin.com",
        status: "ACTIVE",
        votesCount: 4,
        votesAverage: 1.5,
        myVote: null,
        impressions: [
          { authorName: "Jack Snyder", tone: "positive", note: "Met him at the info session. Super outgoing and easy to talk to." }
        ],
        attendanceCount: 1
      },
      {
        id: "pnm2",
        name: "Sarah Jenkins",
        email: "sarah.j@outlook.com",
        phone: "803-555-0211",
        hometown: "Columbia, SC",
        major: "Biology",
        year: "Sophomore",
        highSchoolInfo: "Spring Valley High",
        backgroundInfo: "Pre-med track. Volunteered at local hospitals. Sister is an alumna of Delta Delta Delta.",
        linkedinUrl: "",
        status: "ACTIVE",
        votesCount: 3,
        votesAverage: 0.67,
        myVote: null,
        impressions: [
          { authorName: "Alex Mercer", tone: "neutral", note: "Intelligent and polite, but seemed slightly reserved." }
        ],
        attendanceCount: 2
      },
      {
        id: "pnm3",
        name: "Michael Chang",
        email: "mchang@gmail.com",
        phone: "803-555-0155",
        hometown: "Greenville, SC",
        major: "Mechanical Engineering",
        year: "Freshman",
        highSchoolInfo: "Greenville Tech Charter",
        backgroundInfo: "Interested in robotics and engineering club. GPA is 4.0.",
        linkedinUrl: "https://linkedin.com",
        status: "BID_EXTENDED",
        votesCount: 8,
        votesAverage: 1.88,
        myVote: 1,
        impressions: [
          { authorName: "Jack Snyder", tone: "positive", note: "Absolutely solid guy. Smart, humble, and really fits the chapter." },
          { authorName: "Alex Mercer", tone: "positive", note: "Very impressed by his drive. Extending a bid is a no-brainer." }
        ],
        attendanceCount: 2
      },
      {
        id: "pnm4",
        name: "David Smith",
        email: "dsmith@gmail.com",
        phone: "803-555-0322",
        hometown: "Atlanta, GA",
        major: "Marketing",
        year: "Freshman",
        highSchoolInfo: "Lakeside High School",
        backgroundInfo: "Loves golf and outdoor sports. Father is an alumnus.",
        linkedinUrl: "",
        status: "ACTIVE",
        votesCount: 2,
        votesAverage: -0.5,
        myVote: null,
        impressions: [
          { authorName: "Jack Snyder", tone: "concern", note: "Showed up late to the house tour and seemed a bit inattentive." }
        ],
        attendanceCount: 1
      }
    ]
  };
}
