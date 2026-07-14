import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Roster } from "@/components/admin/roster";
import { DashboardInsights, type InsightEvent } from "@/components/admin/dashboard-insights";
import { FirstRunCard, type FirstRunStep } from "@/components/admin/setup-wizard";
import { RushFunnel } from "@/components/admin/rush-funnel";
import { RecentActivity, type RecentEntry } from "@/components/admin/recent-activity";
import { getRecentAudit } from "@/lib/audit";
import { getCurrentBrother } from "@/lib/auth";
import { getCurrentOfficerPermissions, hasPermission } from "@/lib/permissions";
import { getSiteConfig, DEFAULTS } from "@/lib/site-config";
import { IconChip } from "@/components/ui/icon-chip";
import { Reveal } from "@/components/site/reveal";
import { IconAlumni, IconDues, IconDashboard, IconMembers } from "@/components/brand/icons";
import { IconArrowRight as ArrowRight, IconBallot as Vote, IconUser as User, IconLandmark as Landmark, IconFamilyTree as Network, IconDirectory as BookUser, IconBilling as CreditCard, IconGrid as LayoutGrid, IconCalendar as CalendarRange, IconWallet as Wallet } from "@/components/brand/icons";

export const dynamic = "force-dynamic";

// Brand-tinted glass surface — a frosted white card with a 1px brand-tinted
// hairline ring and a layered soft shadow for real depth. Pairs with `.lift`
// for the hover rise. Uses hsl(var(--primary)) so it re-tints per chapter
// (the portal's maroon scale is separate; this is the admin/brand surface).
const GLASS_CARD =
  "lift relative overflow-hidden rounded-2xl border border-brand-red/10 bg-white/80 backdrop-blur-xl " +
  "ring-1 ring-[hsl(var(--primary)/0.06)] shadow-[0_1px_0_0_rgba(255,255,255,0.8)_inset,0_10px_30px_-14px_rgba(11,11,12,0.16),0_28px_56px_-32px_hsl(var(--primary)/0.20)]";

export default async function AdminDashboard({ searchParams }: { searchParams?: { view?: string } }) {
  // DEFENSE-IN-DEPTH RBAC (landing page). The admin layout already guarantees
  // the caller is a super-admin OR an officer with ≥1 domain — but this landing
  // dashboard aggregates SENSITIVE cross-domain data that not every officer is
  // entitled to: the rush/PNM pipeline (a recruit's votes, contact info, notes
  // and headshots → rushPipeline) and the alumni network (donations + alumni
  // PII → alumni). A super-admin sees everything (unchanged — that's every
  // /admin login today); a non-super-admin officer only sees the sections they
  // actually hold, and we never even QUERY the data they can't see (data
  // minimization), so a Treasurer can't read PNM votes or alumni gifts off the
  // home screen. We resolve perms ONCE and reuse the flags below. We do NOT gate
  // the page itself (that would lock a single-domain officer out of their home
  // and could loop with the error boundary's "Back to dashboard"); instead each
  // sensitive block renders an in-place "no access" panel.
  const perms = await getCurrentOfficerPermissions();
  const canSeeRush = hasPermission(perms, "rushPipeline", "read");
  const canSeeAlumni = hasPermission(perms, "alumni", "read");
  const canSeeDues = hasPermission(perms, "dues", "read");

  const requestedView = searchParams?.view === "alumni" ? "alumni" : "brothers";
  // If an officer lacks alumni access, never land them on the alumni view (even
  // via ?view=alumni) — fall back to the brothers view they came for.
  const currentView = requestedView === "alumni" && canSeeAlumni ? "alumni" : "brothers";
  let rushes: any[] = [];
  try {
    // Only load the rush pipeline (PNM votes/notes/contact) for an officer who
    // holds rushPipeline:read. Everyone else gets an empty set → the rush UI
    // collapses to its "no access" fallback below.
    if (!canSeeRush) throw new Error("skip");
    rushes = await prisma.rush.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        votes: { select: { value: true, brotherId: true } },
        attendances: { select: { eventId: true } },
      },
    });
  } catch {
    rushes = [];
  }
  // Surface bid token + response state so the roster can show a "Copy bid
  // link" button on PNMs with a live token, and a green/red pill when a
  // response has come in.

  // "Get rush ready" checklist — the 6 things every chapter must populate
  // before the public site reads as a finished product. Status pills + jump-
  // to-fix links so the rush chair sees what's pending the moment they sign in.
  const cfg = await getSiteConfig();
  let publicEventCount = 0;
  let brotherCount = 0;
  try {
    publicEventCount = await prisma.event.count({
      where: { isPrivate: false, startsAt: { gte: new Date() } },
    });
  } catch {}
  try {
    brotherCount = await prisma.brother.count();
  } catch {}

  // ── Aggregates for the DashboardInsights panel ───────────────────────────
  // All queries wrapped in try/catch so the dashboard never blank-screens on a
  // single failed query — every metric falls back to a sensible zero so the
  // rush chair at least sees the page load.
  let totalActiveBrothers = brotherCount;
  let duesPaidCount = 0;
  let votingBrothersLast7Days = 0;
  let upcomingEvents: InsightEvent[] = [];
  try {
    // Schema has no "active" flag — every row in Brother represents an
    // active chapter member (revocations delete the row). Use total count
    // as the participation denominator. The dues-paid headcount is a financial
    // signal, so only compute it for an officer who holds dues:read (or a
    // super-admin) — otherwise it stays 0 and the dues KPI reads as "—".
    [totalActiveBrothers, duesPaidCount] = await Promise.all([
      prisma.brother.count(),
      canSeeDues ? prisma.brother.count({ where: { duesPaid: true } }) : Promise.resolve(0),
    ]);
  } catch {}
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentVoters = await prisma.vote.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { brotherId: true },
      distinct: ["brotherId"],
    });
    votingBrothersLast7Days = recentVoters.length;
  } catch {}
  try {
    const upcoming = await prisma.event.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 5,
      select: { id: true, name: true, startsAt: true, category: true },
    });
    upcomingEvents = upcoming.map((e) => ({
      id: e.id,
      name: e.name,
      startsAt: e.startsAt.toISOString(),
      category: e.category,
    }));
  } catch {}
  // Rush funnel: bid → accepted conversion ratio
  const bidsExtendedCount = rushes.filter((r) => r.status === "BID_EXTENDED" || r.status === "ACCEPTED" || r.status === "DECLINED").length;
  const acceptedCount = rushes.filter((r) => r.status === "ACCEPTED").length;

  // ── Brand readiness ──────────────────────────────────────────────────────
  // Detect whether the chapter has run the /admin/setup wizard. We compare
  // each tracked field against the NEUTRAL white-label default exported from
  // lib/site-config (DEFAULTS) — most are blank, a few carry a generic
  // placeholder. A field counts as "customized" only when the chapter has
  // filled it with a real value that differs from that neutral default/
  // placeholder. Setup is "complete" when ≥80% of fields are customized
  // (gives a chapter latitude to keep e.g. the cardinal principles wording).
  const BRAND_FIELD_KEYS: Array<keyof typeof DEFAULTS> = [
    "chapter.fraternityName",
    "chapter.fraternityShort",
    "chapter.greekLetters",
    "chapter.schoolName",
    "chapter.schoolShort",
    "chapter.charterYear",
    "chapter.appShortTitle",
    "contact.rushEmail",
    "contact.advisorEmail",
    "contact.address",
    "contact.cityState",
    "contact.instagramHandle",
  ];
  const customizedFields = BRAND_FIELD_KEYS.filter((key) => {
    const v = cfg[key];
    // The neutral default/placeholder from site-config. Blank or a value
    // still equal to it counts as "not done".
    const def = String(DEFAULTS[key] ?? "");
    return !!v && v.trim() !== "" && v.trim() !== def.trim();
  }).length;
  const brandReadiness = {
    customizedFields,
    totalFields: BRAND_FIELD_KEYS.length,
    isSetupComplete: customizedFields >= Math.ceil(BRAND_FIELD_KEYS.length * 0.8),
  };

  // Recent chapter activity — last 8 audit entries. Best-effort: if the
  // AuditLog table is unreachable (fresh deploy before db push, network blip)
  // the helper returns []. The component auto-hides on empty so the
  // dashboard layout stays clean.
  const recentEntries: RecentEntry[] = await getRecentAudit(8);

  // ── Unified first-run checklist ──────────────────────────────────────────
  // ONE list that governs the single FirstRunCard's progress meter. It folds
  // the chapter-identity/brand wizard (formerly its own "Finish chapter setup"
  // banner) into the same checklist as the launch-readiness items, so a
  // brand-new admin sees exactly one setup system with one meter. Copy is kept
  // white-label / org-neutral (no fraternity-specific wording).
  const checklist: FirstRunStep[] = [
    {
      label: "Brand your chapter identity",
      ok: brandReadiness.isSetupComplete,
      hint: `Name, school, colors & contact (${brandReadiness.customizedFields}/${brandReadiness.totalFields} fields set). Re-brands page titles, social cards & footer.`,
      href: "/admin/setup",
    },
    {
      label: "Add a real advisor name",
      ok: !!cfg["contact.advisorName"] && cfg["contact.advisorName"] !== "Chapter Advisor",
      hint: 'Replace the "Chapter Advisor" placeholder so parents can identify a real adult.',
      href: "/admin/settings#contact",
    },
    {
      label: "Add a recruitment phone number",
      ok: !!cfg["contact.rushPhone"],
      hint: "A callable phone number - parents expect more than just an email.",
      href: "/admin/settings#contact",
    },
    {
      label: "Fill the executive board roster",
      ok: [1, 2, 3, 4, 5].every((n) => !!cfg[`eboard.${n}.name`] && !!cfg[`eboard.${n}.role`]),
      hint: "Fill every slot or hide the section so the public site doesn't look incomplete.",
      href: "/admin/settings",
    },
    {
      label: "Upload your hero photos",
      ok: ["hero.tile1.slug", "hero.tile2.slug", "hero.tile3.slug"].every(
        (k) => !!cfg[k] && !cfg[k]?.includes("Pending"),
      ),
      hint: "Each of the 3 hero tiles needs an Instagram slug or uploaded photo.",
      href: "/admin/settings",
    },
    {
      label: "Add your first public event",
      ok: publicEventCount > 0,
      hint: "Add at least one public event so the homepage countdown ticks and the schedule isn't a placeholder.",
      href: "/admin/events",
    },
    {
      label: "Build out your member roster",
      ok: brotherCount >= 5,
      hint: "Invite your e-board so they can vote on prospects (aim for at least 5 members).",
      href: "/admin/brothers",
    },
  ];
  const remaining = checklist.filter((c) => !c.ok).length;

  const me = await getCurrentBrother();

  // Alumni View metrics
  let totalAlumni = 0;
  let optedInDirectoryCount = 0;
  let totalDonationsCents = 0;
  let activeAlumniPollsCount = 0;
  let recentAlumniList: any[] = [];
  let recentDonations: any[] = [];

  try {
    // Alumni metrics (donations + alumni PII) are only loaded for an officer who
    // holds alumni:read (or a super-admin). Without it, the alumni view is never
    // rendered (currentView is forced to "brothers" above) and these stay 0.
    if (!canSeeAlumni) throw new Error("skip");
    [totalAlumni, optedInDirectoryCount, activeAlumniPollsCount] = await Promise.all([
      prisma.alumniProfile.count(),
      prisma.alumniProfile.count({ where: { optInDirectory: true } }),
      prisma.poll.count({ where: { audience: "ALUMNI", closedAt: null } }),
    ]);

    // Only PAID donations count as "raised" — PENDING/FAILED/REFUNDED money was
    // never actually collected (or was given back), so summing every row would
    // overstate donations raised (AOTY money-integrity finding).
    const donationsSum = await prisma.alumniDonation.aggregate({
      where: { status: "PAID" },
      _sum: { amountCents: true }
    });
    totalDonationsCents = donationsSum._sum.amountCents || 0;

    recentAlumniList = await prisma.alumniProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    recentDonations = await prisma.alumniDonation.findMany({
      where: { status: "PAID" },
      orderBy: { recordedAt: "desc" },
      take: 5,
      include: { alumni: true },
    });
  } catch (err) {
    console.error("Failed to fetch alumni dashboard metrics", err);
  }

  const serializable = rushes.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    hometown: r.hometown,
    major: r.major,
    year: r.year,
    highSchoolInfo: r.highSchoolInfo,
    backgroundInfo: r.backgroundInfo,
    headshotUrl: r.headshotUrl,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    voteSum: r.votes.reduce((s: number, v: any) => s + v.value, 0),
    voteCount: r.votes.length,
    myVote: me ? r.votes.find((v: any) => v.brotherId === me.id)?.value ?? null : null,
    attendanceCount: r.attendances.length,
    bidToken: r.bidToken,
    bidTokenExpiresAt: r.bidTokenExpiresAt ? r.bidTokenExpiresAt.toISOString() : null,
    bidRespondedAt: r.bidRespondedAt ? r.bidRespondedAt.toISOString() : null,
    bidResponseChoice: r.bidResponseChoice,
  }));

  return (
    <div className="container py-8">
      {/* E-Board View Slider Toggle — frosted glass pill with a brand-tinted
          active chip and a soft layered shadow. */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-2xl bg-white/70 backdrop-blur-xl p-1 border border-brand-red/10 ring-1 ring-[hsl(var(--primary)/0.05)] shadow-[0_8px_24px_-14px_rgba(11,11,12,0.18)]">
          <Link
            href="/admin?view=brothers"
            aria-current={currentView === "brothers" ? "page" : undefined}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30 ${
              currentView === "brothers"
                ? "bg-gradient-to-b from-brand-red to-brand-red-dark text-white shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.55)] font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/60"
            }`}
          >
            Brothers/Rush View
          </Link>
          {/* The Alumni Network view is gated on alumni:read — an officer
              without it never sees the toggle (and ?view=alumni is force-folded
              back to the brothers view above), so they can't reach alumni
              donations/PII from the home screen. Super-admins always see it. */}
          {canSeeAlumni && (
            <Link
              href="/admin?view=alumni"
              aria-current={currentView === "alumni" ? "page" : undefined}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30 ${
                currentView === "alumni"
                  ? "bg-gradient-to-b from-brand-red to-brand-red-dark text-white shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.55)] font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/60"
              }`}
            >
              Alumni Network View
            </Link>
          )}
        </div>
      </div>

      {currentView === "alumni" ? (
        <div className="space-y-8">
          <Reveal as="div" className="relative overflow-hidden rounded-2xl border border-brand-red/10 bg-gradient-to-br from-brand-red-soft/50 via-white to-white p-5 sm:p-6 shadow-[0_10px_30px_-16px_hsl(var(--primary)/0.18)]">
            {/* soft brand orb for depth — decorative */}
            <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand-red/10 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <IconChip icon={IconAlumni} tone="brand" size="lg" className="hidden sm:inline-flex" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Alumni Network Dashboard</h1>
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                  Monitor alumni network metrics, recent registrations, campaign donations, and active polls.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Alumni KPI Cards — brand-tinted glass with a top accent rule, a
              duotone glyph, and an in-view rise that staggers across the row. */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Alumni", value: String(totalAlumni), sub: "Graduated brothers cataloged", icon: IconAlumni },
              { label: "Directory Opt-In", value: String(optedInDirectoryCount), sub: "Visible on public directory", icon: IconMembers },
              { label: "Total Donations", value: `$${(totalDonationsCents / 100).toLocaleString()}`, sub: "Raised from alumni network", icon: IconDues },
              { label: "Active Polls", value: String(activeAlumniPollsCount), sub: "Surveys currently open", icon: Vote },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <Reveal key={kpi.label} delay={i * 70}>
                  <div className={`group ${GLASS_CARD} p-6 h-full`}>
                    <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-red/70 via-brand-red/30 to-transparent opacity-80" />
                    <div className="flex items-center justify-between space-y-0 pb-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                      <IconChip icon={Icon} tone="brand" size="sm" className="transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <div className="text-2xl font-bold tracking-tight tabular-nums">{kpi.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Registrations Card */}
            <Reveal delay={40}>
              <div className={`${GLASS_CARD} p-6 h-full`}>
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2.5">
                  <IconChip icon={User} tone="brand" size="sm" />
                  Recent Alumni Registrations
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-brand-red/15 text-muted-foreground text-xs font-bold uppercase tracking-wide">
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Class</th>
                        <th className="pb-2">Company</th>
                        <th className="pb-2">City/State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {recentAlumniList.length > 0 ? (
                        recentAlumniList.map((a) => (
                          <tr key={a.id} className="hover:bg-brand-red-soft/40 transition-colors">
                            <td className="py-2.5 font-medium">{a.fullName}</td>
                            <td className="py-2.5 tabular-nums">{a.graduationYear}</td>
                            <td className="py-2.5 truncate max-w-[120px]">{a.employer || "N/A"}</td>
                            <td className="py-2.5">{a.city ? `${a.city}, ${a.state || ""}` : "N/A"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-10">
                            <div className="flex flex-col items-center gap-3 text-center">
                              <span className="relative">
                                <span aria-hidden className="absolute inset-0 -z-10 rounded-2xl bg-brand-red/15 blur-2xl" />
                                <IconChip icon={IconAlumni} tone="brand" size="md" />
                              </span>
                              <p className="text-xs text-muted-foreground max-w-[220px]">
                                No alumni have registered yet. New sign-ups appear here as they come in.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>

            {/* Recent Donations Card */}
            <Reveal delay={110}>
              <div className={`${GLASS_CARD} p-6 h-full`}>
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2.5">
                  <IconChip icon={IconDues} tone="brand" size="sm" />
                  Recent Alumni Donations
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-brand-red/15 text-muted-foreground text-xs font-bold uppercase tracking-wide">
                        <th className="pb-2">Alumnus</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Campaign</th>
                        <th className="pb-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {recentDonations.length > 0 ? (
                        recentDonations.map((d) => (
                          <tr key={d.id} className="hover:bg-brand-red-soft/40 transition-colors">
                            <td className="py-2.5 font-medium">{d.alumni?.fullName || "Anonymous"}</td>
                            <td className="py-2.5 font-bold tabular-nums">${(d.amountCents / 100).toFixed(2)}</td>
                            <td className="py-2.5 truncate max-w-[120px]">{d.campaign || "General"}</td>
                            <td className="py-2.5 tabular-nums">{new Date(d.recordedAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-10">
                            <div className="flex flex-col items-center gap-3 text-center">
                              <span className="relative">
                                <span aria-hidden className="absolute inset-0 -z-10 rounded-2xl bg-brand-red/15 blur-2xl" />
                                <IconChip icon={IconDues} tone="brand" size="md" />
                              </span>
                              <p className="text-xs text-muted-foreground max-w-[220px]">
                                No donations recorded yet. Alumni gifts will show up here once they give.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      ) : (
        <>
          <Reveal as="div" className="mb-6 relative overflow-hidden rounded-2xl border border-brand-red/10 bg-gradient-to-br from-brand-red-soft/50 via-white to-white p-5 sm:p-6 shadow-[0_10px_30px_-16px_hsl(var(--primary)/0.18)]">
            <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand-red/10 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <IconChip icon={IconDashboard} tone="brand" size="lg" className="hidden sm:inline-flex" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Rush Roster</h1>
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                  {me ? <>Signed in as <span className="text-foreground font-medium">{me.name}</span> · </> : null}
                  Manage potential new members. Update status, vote, take notes, send mass email or text.
                </p>
              </div>
            </div>
          </Reveal>

          {/* RBAC: the rush KPIs/consensus + funnel + roster all expose PNM data
              (votes, notes, contact info, headshots). They render only for an
              officer who holds rushPipeline:read (or a super-admin — every /admin
              login today). An officer without it (e.g. Treasurer / House Manager)
              gets a friendly in-place panel instead and keeps the Chapter tools
              below, so they're never locked out of their home. */}
          {!canSeeRush && (
            <Reveal as="div" className="mb-6">
              <div className={`${GLASS_CARD} p-8 text-center`}>
                <div className="mx-auto mb-3 w-fit">
                  <IconChip icon={IconDashboard} tone="muted" size="lg" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">Recruitment is handled by another officer</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Your officer role doesn&apos;t include the rush pipeline, so the PNM
                  roster, votes and recruitment metrics aren&apos;t shown here. Use the
                  chapter tools below for the areas you manage.
                </p>
              </div>
            </Reveal>
          )}

          {canSeeRush && (
          <DashboardInsights
            rushes={serializable}
            totalBrothers={brotherCount}
            totalActiveBrothers={totalActiveBrothers}
            votingBrothersLast7Days={votingBrothersLast7Days}
            upcomingEvents={upcomingEvents}
            duesPaidCount={duesPaidCount}
            myBrotherId={me?.id || null}
            bidsExtendedCount={bidsExtendedCount}
            acceptedCount={acceptedCount}
            brandReadiness={brandReadiness}
          />
          )}

          {/* Funnel + recent activity in a 2-column grid on lg screens so the
              dashboard reads top-to-bottom: KPIs → consensus → funnel + activity
              → setup checklist → roster. Stacks on mobile. */}
          {canSeeRush && (rushes.length > 0 || recentEntries.length > 0) && (
            <div className="mb-6 grid lg:grid-cols-2 gap-4">
              {rushes.length > 0 && (
                <Reveal delay={40} className="h-full [&>*]:h-full">
                  <RushFunnel
                    submitted={rushes.length}
                    active={rushes.filter((r) => r.status === "ACTIVE").length}
                    bid={bidsExtendedCount}
                    accepted={acceptedCount}
                  />
                </Reveal>
              )}
              {recentEntries.length > 0 && (
                <Reveal delay={110} className="h-full [&>*]:h-full">
                  <RecentActivity entries={recentEntries} />
                </Reveal>
              )}
            </div>
          )}

          {/* Quick-access tiles for the newer officer tools. They already live
              in the nav + ⌘K palette; surfacing them on the home screen means an
              officer signing in sees the latest sections without hunting. Matches
              the GLASS_CARD + IconChip tile style used across the dashboard. */}
          <Reveal as="div" className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-brand-red" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Chapter tools</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {/* GATE-3 FIX (money nav discovery + no dead tiles): each quick tile
                  is shown only when the caller can actually USE it — mirroring the
                  per-page domain gate — so a Treasurer (payments) sees Treasury but
                  not Billing (super-admin) or Big/Little (admin-only), and a tile
                  never dead-ends a domain-limited officer. Admins (perms.superAdmin)
                  see every tile. `show` defaults true for ungated tiles. */}
              {[
                { href: "/admin/treasury", label: "Treasury", sub: "Budgets, ledgers & expenses", icon: Landmark, show: hasPermission(perms, "payments", "read") },
                { href: "/admin/dues", label: "Dues", sub: "Collect & track dues", icon: Wallet, show: hasPermission(perms, "dues", "read") },
                { href: "/admin/family", label: "Big/Little", sub: "Family tree & pairings", icon: Network, show: !!perms.superAdmin },
                { href: "/admin/directory", label: "Member Directory", sub: "Searchable roster", icon: BookUser, show: hasPermission(perms, "brothers", "read") },
                { href: "/admin/calendar", label: "Calendar", sub: "Events, meetings & dues", icon: CalendarRange, show: hasPermission(perms, "events", "read") },
                { href: "/admin/billing", label: "Billing", sub: "Plan & subscription", icon: CreditCard, show: !!perms.superAdmin },
              ].filter((t) => t.show).map((t, i) => {
                const Icon = t.icon;
                return (
                  <Reveal key={t.href} delay={i * 60}>
                    <Link href={t.href} className={`group ${GLASS_CARD} flex h-full items-center gap-3.5 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30`}>
                      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-red/70 via-brand-red/30 to-transparent opacity-80" />
                      <IconChip icon={Icon} tone="brand" size="md" className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold tracking-tight">{t.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.sub}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brand-red" />
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </Reveal>

          {/* ── Single first-run card ────────────────────────────────────
              The ONE guided onboarding surface. Consolidates the former
              "Get rush ready" checklist AND the separate "Finish chapter
              setup" banner (which used to live in DashboardInsights) into a
              single card with one progress meter, deep-linked steps, one-click
              sample-data controls, and a prominent "Invite your e-board" CTA.
              Auto-hides once every step (including branding) is complete. */}
          {remaining > 0 && (
            <Reveal as="div" className="mb-6">
              <FirstRunCard steps={checklist} brandSetupComplete={brandReadiness.isSetupComplete} />
            </Reveal>
          )}

          {/* The PNM roster carries the most sensitive recruit data (contact
              info, notes, votes, headshots) — gate it on rushPipeline:read. An
              officer without it never receives `serializable` (it's empty) and
              never renders the table. */}
          {canSeeRush && (
          <Roster
            initial={serializable as any}
            brotherName={me?.name || null}
            chapterBrand={{
              fraternityName: cfg["chapter.fraternityName"] || "Your Chapter",
              fraternityShort: cfg["chapter.fraternityShort"] || cfg["chapter.fraternityName"] || "Your Chapter",
              schoolShort: cfg["chapter.schoolShort"] || "",
              chapterAttribution: [
                cfg["chapter.fraternityShort"] || cfg["chapter.fraternityName"] || "Your Chapter",
                cfg["chapter.schoolShort"] || "",
              ].filter(Boolean).join(" "),
              houseAddress: (cfg["contact.address"] || "").split(",")[0].trim(),
            }}
          />
          )}
        </>
      )}
    </div>
  );
}
