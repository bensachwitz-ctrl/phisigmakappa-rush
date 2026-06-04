import { prisma } from "@/lib/prisma";
import { TreasuryManager } from "@/components/admin/treasury-manager";
import { IconTreasury } from "@/components/brand/icons/treasury";
import { currentPeriod } from "@/lib/treasury";

export const dynamic = "force-dynamic";

/**
 * Treasurer's command center: budget (plan vs. actual by category) + the
 * reimbursement queue. Server-loads the current term's budget lines and all
 * expenses, then hands off to the client manager for the interactive UI.
 *
 * Auth note: this lives under /admin, which is gated by the admin layout +
 * middleware. The API routes it calls enforce isAdminAuthed() independently, so
 * even a direct fetch can't bypass the session check.
 */
export default async function TreasuryPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const period = (searchParams?.period || "").trim() || currentPeriod();

  let lines: any[] = [];
  try {
    lines = await prisma.budgetLine.findMany({
      where: { period },
      orderBy: [{ category: "asc" }, { label: "asc" }],
    });
  } catch {
    lines = [];
  }

  let expenses: any[] = [];
  try {
    expenses = await prisma.expense.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
  } catch {
    expenses = [];
  }

  // Distinct terms that have budget data — feeds the period selector so the
  // treasurer can flip between fall/spring without typing the tag.
  let periods: string[] = [];
  try {
    const rows = await prisma.budgetLine.findMany({
      distinct: ["period"],
      select: { period: true },
      orderBy: { period: "desc" },
    });
    periods = rows.map((r) => r.period);
  } catch {
    periods = [];
  }
  const allPeriods = Array.from(new Set([currentPeriod(), period, ...periods])).sort((a, b) =>
    b.localeCompare(a)
  );

  const serialExpenses = expenses.map((e) => ({
    id: e.id,
    submittedById: e.submittedById ?? null,
    submittedByName: e.submittedByName ?? null,
    amountCents: e.amountCents,
    category: e.category,
    description: e.description,
    status: e.status,
    receiptUrl: e.receiptUrl ?? null,
    decidedByName: e.decidedByName ?? null,
    decidedAt: e.decidedAt ? e.decidedAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
  }));

  const serialLines = lines.map((l) => ({
    id: l.id,
    category: l.category,
    label: l.label,
    budgetedCents: l.budgetedCents,
    actualCents: l.actualCents,
    period: l.period,
    notes: l.notes ?? null,
  }));

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-phisig-red/10 text-phisig-red ring-1 ring-phisig-red/15"
          aria-hidden="true"
        >
          <IconTreasury className="h-6 w-6" accent="currentColor" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Treasury
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the chapter budget and clear reimbursements — plan vs. actual by category, and a queue for every receipt brothers submit.
          </p>
        </div>
      </div>

      <TreasuryManager
        initialLines={serialLines}
        initialExpenses={serialExpenses}
        initialPeriod={period}
        initialPeriods={allPeriods}
      />
    </main>
  );
}
