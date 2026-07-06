// Light route-segment skeleton for the member portal (/portal/*).
//
// The portal hub + Brothers/Alumni dashboards are `force-dynamic` and read the
// signed-in member's data, so navigation would otherwise flash a blank screen.
// There's no shared portal layout, so this fills the viewport itself: a slim
// nav placeholder, a centered header, and a small grid of card placeholders —
// matching the portal's cream/maroon palette rather than the admin tokens.
//
// Motion is Tailwind `animate-pulse`, which globals.css disables under
// prefers-reduced-motion. Accessible: aria-busy + an sr-only "Loading…".

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-maroon-100 ${className}`} />;
}

export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-cream-50" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Nav placeholder — mirrors the public nav bar height/edges */}
      <div className="border-b border-maroon-100 bg-white/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-3 sm:px-4">
          <Bar className="h-7 w-36" />
          <Bar className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-3 py-8 sm:px-4 sm:py-16">
        {/* Centered header */}
        <div className="mb-10 flex flex-col items-center text-center sm:mb-12">
          <Bar className="h-6 w-20 rounded-full" />
          <Bar className="mt-4 h-9 w-72 max-w-full" />
          <Bar className="mt-3 h-4 w-96 max-w-full" />
        </div>

        {/* Card grid placeholder */}
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-maroon-100 bg-white p-5 shadow-sm sm:p-6"
            >
              <Bar className="h-12 w-12 rounded-xl" />
              <Bar className="mt-4 h-5 w-28" />
              <Bar className="mt-3 h-3 w-full" />
              <Bar className="mt-2 h-3 w-5/6" />
              <Bar className="mt-5 h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
