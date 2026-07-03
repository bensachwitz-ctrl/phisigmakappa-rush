// Route-segment skeleton for the Brothers dashboard (/portal/brothers/dashboard).
//
// The dashboard is `force-dynamic` and reads the signed-in brother's profile,
// polls, events, service logs and announcements, so navigating here would
// otherwise flash blank (or the generic /portal skeleton, which is shaped for
// the hub's centered card grid, not this tabbed dashboard). This skeleton
// mirrors the real layout: nav → profile header → tab strip → stat row →
// two-column content cards (polls/announcements), in the portal's cream/maroon
// palette.
//
// Motion is Tailwind `animate-pulse`, which globals.css disables under
// prefers-reduced-motion. Accessible: aria-busy + an sr-only "Loading…".

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-maroon-100 ${className}`} />;
}

export default function BrothersDashboardLoading() {
  return (
    <div className="min-h-screen bg-cream-50" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard…</span>

      {/* Nav placeholder */}
      <div className="border-b border-maroon-100 bg-white/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-4">
          <Bar className="h-7 w-40" />
          <div className="flex items-center gap-3">
            <Bar className="h-8 w-20 rounded-lg" />
            <Bar className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        {/* Profile header — avatar + name/role */}
        <div className="mb-6 flex items-center gap-4">
          <Bar className="h-16 w-16 rounded-2xl sm:h-20 sm:w-20" />
          <div className="flex-1">
            <Bar className="h-7 w-56 max-w-full" />
            <Bar className="mt-2 h-4 w-40 max-w-full" />
          </div>
        </div>

        {/* Tab strip */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>

        {/* Stat row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-maroon-100 bg-white p-4 shadow-sm sm:p-5"
            >
              <Bar className="h-8 w-8 rounded-lg" />
              <Bar className="mt-3 h-6 w-16" />
              <Bar className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Two-column content cards (polls / announcements) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="space-y-4 rounded-2xl border border-maroon-100 bg-white p-6 shadow-sm"
            >
              <Bar className="h-5 w-3/4" />
              <div className="space-y-2">
                <Bar className="h-12 w-full rounded-xl" />
                <Bar className="h-12 w-full rounded-xl" />
                <Bar className="h-12 w-5/6 rounded-xl" />
              </div>
              <div className="flex justify-between border-t border-maroon-50 pt-3">
                <Bar className="h-3 w-24" />
                <Bar className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
