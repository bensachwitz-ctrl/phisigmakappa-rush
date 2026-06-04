// Instant route-segment skeleton for the authenticated admin app.
//
// Every /admin/* page is `force-dynamic` + DB-backed, so without this the
// admin chrome would hold a blank body while the server query runs. This
// `loading.tsx` is shown the moment a user navigates, inside the persistent
// AdminShell (nav stays put), and is swapped for real content on first paint.
//
// It sketches the dominant admin layout: a page header (icon + title + subtitle)
// → a 4-up KPI strip → a two-column content row → a list/table block. Neutral,
// brand-token-based (bg-card / border-border / bg-muted / phisig tokens), and
// motion comes from Tailwind's `animate-pulse`, which globals.css already
// neutralizes under prefers-reduced-motion.

/** A single neutral shimmer block. `animate-pulse` is reduced-motion-safe via globals.css. */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3">
        <Bar className="h-3 w-24" />
        <Bar className="h-8 w-8 rounded-lg" />
      </div>
      <Bar className="h-7 w-16" />
      <Bar className="mt-2 h-3 w-28" />
    </div>
  );
}

export default function AdminLoading() {
  return (
    <main
      className="container py-8"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Screen-reader announcement — sighted users see the skeleton, AT users
          hear that the page is loading rather than landing in dead air. */}
      <span className="sr-only">Loading…</span>

      {/* Page header — icon chip + title + subtitle */}
      <div className="mb-6 flex items-start gap-4">
        <Bar className="hidden h-12 w-12 rounded-xl sm:block" />
        <div className="min-w-0 flex-1">
          <Bar className="h-8 w-56 max-w-full" />
          <Bar className="mt-2 h-4 w-80 max-w-full" />
        </div>
      </div>

      {/* KPI strip — mirrors the dashboard's 4-up metric grid */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      {/* Two-column content row (funnel / activity panels) */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Bar className="h-5 w-40" />
            <div className="mt-5 space-y-3">
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-5/6" />
              <Bar className="h-3 w-4/6" />
              <Bar className="h-3 w-3/6" />
            </div>
          </div>
        ))}
      </div>

      {/* List / table block — a header row + several record rows */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <Bar className="h-5 w-32" />
          <Bar className="h-8 w-24 rounded-lg" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Bar className="h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bar className="h-4 w-1/3" />
                <Bar className="h-3 w-1/2" />
              </div>
              <Bar className="hidden h-6 w-16 rounded-full sm:block" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
