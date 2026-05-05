import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Roster } from "@/components/admin/roster";
import { getCurrentBrother } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { CheckCircle2, AlertCircle, ArrowRight, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
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
  }));

  return (
    <main className="container py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Rush Roster</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {me ? <>Signed in as <span className="text-foreground font-medium">{me.name}</span> · </> : null}
            Manage potential new members. Update status, vote, take notes, send mass email or text.
          </p>
        </div>
      </div>

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

      <Roster initial={serializable as any} brotherName={me?.name || null} />
    </main>
  );
}
