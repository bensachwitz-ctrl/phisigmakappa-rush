"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type MobileAppClientType from "./MobileAppClient";
import NativeBridge from "./NativeBridge";

// Lazy/dynamic boundary for the flagship interactive demo.
//
// MobileAppClient is a very large client component (the full stateful product
// preview — the WebGL plexus background was removed in a later pass; the weight
// is now the demo's stateful surfaces + modals). Statically importing it pulled
// the entire bundle into the initial payload of the marketing-reached /app route.
// Splitting it behind next/dynamic gives it its own chunk that streams in after
// the shell, so the route's first paint isn't blocked on the heavy demo JS.
//
// ssr is kept ON so the existing server-rendered markup (and SEO/LCP text) is
// preserved exactly — this is purely a code-splitting boundary, not an SSR/CSR
// behavior change. A lightweight branded skeleton shows during the brief client
// hydration/chunk-load window.
const MobileAppClient = dynamic(() => import("./MobileAppClient"), {
  loading: () => (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950 via-slate-950 to-slate-950"
      aria-busy="true"
      aria-label="Loading interactive demo"
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src="/brand/greekstack-mark.png?v=2"
          className="w-12 h-12 rounded-xl object-contain opacity-90 motion-safe:animate-pulse"
          alt="Greekstack"
        />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-blue-500/80 to-sky-400/80 motion-safe:animate-pulse" />
        </div>
        <span className="text-xs font-medium tracking-wide text-slate-400">
          Loading the live demo…
        </span>
      </div>
    </div>
  ),
});

export default function DemoLoader(
  props: ComponentProps<typeof MobileAppClientType>,
) {
  return (
    <>
      {/* Native (Capacitor) value layer — push, biometric session, deep links,
          offline cache. Renders nothing and is fully inert on web. */}
      <NativeBridge />
      <MobileAppClient {...props} />
    </>
  );
}
