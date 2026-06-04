import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Roster } from "@/components/admin/roster";
import { DashboardInsights, type InsightEvent } from "@/components/admin/dashboard-insights";
import { RushFunnel } from "@/components/admin/rush-funnel";
import { RecentActivity, type RecentEntry } from "@/components/admin/recent-activity";
import { getRecentAudit } from "@/lib/audit";
import { getCurrentBrother } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { IconChip } from "@/components/ui/icon-chip";
import { CheckCircle2, AlertCircle, ArrowRight, Sparkles, GraduationCap, Gift, Building, Calendar, Vote, User, LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }: { searchParams?: { view?: string } }) {
  const currentView = searchParams?.view === "alumni" ? "alumni" : "brothers";
  let rushes: any[] = [];
  try {
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
    // as the participation denominator.
    [totalActiveBrothers, duesPaidCount] = await Promise.all([
      prisma.brother.count(),
      prisma.brother.count({ where: { duesPaid: true } }),
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
  // each tracked field against the reference Phi Sig USC default — any field
  // the chapter has overridden (even to a different string) counts as
  // "customized". Setup is "complete" when ≥80% of fields are non-default
  // (gives a chapter latitude to keep e.g. the cardinal principles wording).
  const BRAND_FIELDS: Array<[string, string]> = [
    ["chapter.fraternityName", "Phi Sigma Kappa"],
    ["chapter.fraternityShort", "Phi Sig"],
    ["chapter.greekLetters", "Gamma Triton"],
    ["chapter.schoolName", "University of South Carolina"],
    ["chapter.schoolShort", "USC"],
    ["chapter.charterYear", "1975"],
    ["chapter.appShortTitle", "Phi Sig USC"],
    ["contact.rushEmail", "rush@phisig-usc.com"],
    ["contact.advisorEmail", "advisor@phisig-usc.com"],
    ["contact.address", "1525 College Street"],
    ["contact.cityState", "Columbia, SC 29208"],
    ["contact.instagramHandle", "@phisig_usc"],
  ];
  const customizedFields = BRAND_FIELDS.filter(([key, def]) => {
    const v = cfg[key];
    return v && v.trim() !== "" && v !== def;
  }).length;
  const brandReadiness = {
    customizedFields,
    totalFields: BRAND_FIELDS.length,
    isSetupComplete: customizedFields >= Math.ceil(BRAND_FIELDS.length * 0.8),
  };

  // Recent chapter activity — last 8 audit entries. Best-effort: if the
  // AuditLog table is unreachable (fresh deploy before db push, network blip)
  // the helper returns []. The component auto-hides on empty so the
  // dashboard layout stays clean.
  const recentEntries: RecentEntry[] = await getRecentAudit(8);

  const checklist = [
    {
      label: "Real chapter advisor name",
      ok: !!cfg["contact.advisorName"] && cfg["contact.advisorName"] !== "Chapter Advisor",
      hint: 'Replace the "Chapter Advisor" placeholder so parents can identify a real adult.',
      href: "/admin/settings#contact",
    },
    {
      label: "Rush phone number",
      ok: !!cfg["contact.rushPhone"],
      hint: "A callable phone number — parents expect more than just an email.",
      href: "/admin/settings#contact",
    },
    {
      label: "E-board roster (5 slots)",
      ok: [1, 2, 3, 4, 5].every((n) => !!cfg[`eboard.${n}.name`] && !!cfg[`eboard.${n}.role`]),
      hint: "Fill every slot or hide the section so the public site doesn't look incomplete.",
      href: "/admin/settings",
    },
    {
      label: "Hero photos uploaded",
      ok: ["hero.tile1.slug", "hero.tile2.slug", "hero.tile3.slug"].every(
        (k) => !!cfg[k] && !cfg[k]?.includes("Pending"),
      ),
      hint: "Each of the 3 hero tiles needs an Instagram slug or uploaded photo.",
      href: "/admin/settings",
    },
    {
      label: "First public rush event",
      ok: publicEventCount > 0,
      hint: "Add at least one public event so the homepage countdown ticks and the schedule isn't a placeholder.",
      href: "/admin/events",
    },
    {
      label: "Brothers directory populated",
      ok: brotherCount >= 5,
      hint: "Invite the e-board so they can vote on PNMs (need ≥5 brothers in the directory).",
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
    [totalAlumni, optedInDirectoryCount, activeAlumniPollsCount] = await Promise.all([
      prisma.alumniProfile.count(),
      prisma.alumniProfile.count({ where: { optInDirectory: true } }),
      prisma.poll.count({ where: { audience: "ALUMNI", closedAt: null } }),
    ]);

    const donationsSum = await prisma.alumniDonation.aggregate({
      _sum: { amountCents: true }
    });
    totalDonationsCents = donationsSum._sum.amountCents || 0;

    recentAlumniList = await prisma.alumniProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    recentDonations = await prisma.alumniDonation.findMany({
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
    <main className="container py-8">
      {/* E-Board View Slider Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl bg-muted p-1 border border-border">
          <Link
            href="/admin?view=brothers"
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === "brothers" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Brothers/Rush View
          </Link>
          <Link
            href="/admin?view=alumni"
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === "alumni" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Alumni Network View
          </Link>
        </div>
      </div>

      {currentView === "alumni" ? (
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <IconChip icon={GraduationCap} tone="brand" size="lg" className="hidden sm:inline-flex" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Alumni Network Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor alumni network metrics, recent registrations, campaign donations, and active polls.
              </p>
            </div>
          </div>

          {/* Alumni KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lift rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total Alumni</p>
                <IconChip icon={GraduationCap} tone="brand" size="sm" />
              </div>
              <div className="text-2xl font-bold">{totalAlumni}</div>
              <p className="text-xs text-muted-foreground mt-1">Graduated brothers cataloged</p>
            </div>

            <div className="lift rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Directory Opt-In</p>
                <IconChip icon={Building} tone="brand" size="sm" />
              </div>
              <div className="text-2xl font-bold">{optedInDirectoryCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Visible on public directory</p>
            </div>

            <div className="lift rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total Donations</p>
                <IconChip icon={Gift} tone="brand" size="sm" />
              </div>
              <div className="text-2xl font-bold">${(totalDonationsCents / 100).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Raised from alumni network</p>
            </div>

            <div className="lift rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Active Polls</p>
                <IconChip icon={Vote} tone="brand" size="sm" />
              </div>
              <div className="text-2xl font-bold">{activeAlumniPollsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Surveys currently open</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Registrations Card */}
            <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2.5">
                <IconChip icon={User} tone="brand" size="sm" />
                Recent Alumni Registrations
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs font-bold uppercase">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Class</th>
                      <th className="pb-2">Company</th>
                      <th className="pb-2">City/State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentAlumniList.length > 0 ? (
                      recentAlumniList.map((a) => (
                        <tr key={a.id} className="hover:bg-muted/50 transition">
                          <td className="py-2.5 font-medium">{a.fullName}</td>
                          <td className="py-2.5">{a.graduationYear}</td>
                          <td className="py-2.5 truncate max-w-[120px]">{a.employer || "N/A"}</td>
                          <td className="py-2.5">{a.city ? `${a.city}, ${a.state || ""}` : "N/A"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8">
                          <div className="flex flex-col items-center gap-2.5 text-center">
                            <IconChip icon={User} tone="muted" size="md" />
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

            {/* Recent Donations Card */}
            <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2.5">
                <IconChip icon={Gift} tone="brand" size="sm" />
                Recent Alumni Donations
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs font-bold uppercase">
                      <th className="pb-2">Alumnus</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Campaign</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentDonations.length > 0 ? (
                      recentDonations.map((d) => (
                        <tr key={d.id} className="hover:bg-muted/50 transition">
                          <td className="py-2.5 font-medium">{d.alumni?.fullName || "Anonymous"}</td>
                          <td className="py-2.5 font-bold">${(d.amountCents / 100).toFixed(2)}</td>
                          <td className="py-2.5 truncate max-w-[120px]">{d.campaign || "General"}</td>
                          <td className="py-2.5">{new Date(d.recordedAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8">
                          <div className="flex flex-col items-center gap-2.5 text-center">
                            <IconChip icon={Gift} tone="muted" size="md" />
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
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-end justify-between">
            <div className="flex items-start gap-4">
              <IconChip icon={LayoutDashboard} tone="brand" size="lg" className="hidden sm:inline-flex" />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Rush Roster</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {me ? <>Signed in as <span className="text-foreground font-medium">{me.name}</span> · </> : null}
                  Manage potential new members. Update status, vote, take notes, send mass email or text.
                </p>
              </div>
            </div>
          </div>

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

          {/* Funnel + recent activity in a 2-column grid on lg screens so the
              dashboard reads top-to-bottom: KPIs → consensus → funnel + activity
              → setup checklist → roster. Stacks on mobile. */}
          {(rushes.length > 0 || recentEntries.length > 0) && (
            <div className="mb-6 grid lg:grid-cols-2 gap-4">
              {rushes.length > 0 && (
                <RushFunnel
                  submitted={rushes.length}
                  active={rushes.filter((r) => r.status === "ACTIVE").length}
                  bid={bidsExtendedCount}
                  accepted={acceptedCount}
                />
              )}
              {recentEntries.length > 0 && (
                <RecentActivity entries={recentEntries} />
              )}
            </div>
          )}

          {remaining > 0 && (
            <div className="mb-6 rounded-2xl border border-phisig-red/20 bg-gradient-to-br from-phisig-red-soft/40 via-white to-white p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-phisig-red text-white shrink-0">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold tracking-tight">
                    Get rush ready — {remaining} item{remaining === 1 ? "" : "s"} pending
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Wrap these up so the public site reads as a finished product to parents and freshmen.
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {checklist.map((c) => (
                  <li
                    key={c.label}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                      c.ok
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-amber-200 bg-amber-50/40"
                    }`}
                  >
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${c.ok ? "text-emerald-900" : "text-amber-900"}`}>
                        {c.label}
                      </p>
                      {!c.ok && (
                        <p className="text-xs text-amber-800/80 mt-0.5">{c.hint}</p>
                      )}
                    </div>
                    {!c.ok && (
                      <Link
                        href={c.href}
                        className="inline-flex items-center gap-1 text-xs font-medium text-phisig-red hover:underline shrink-0"
                      >
                        Fix <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
        </>
      )}
    </main>
  );
}
