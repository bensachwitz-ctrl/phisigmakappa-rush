import * as React from "react";
import { chapterLiveState } from "@/lib/chapter-live-guard";

/**
 * Shared "chapter not serving" status pages + the go-live gate that renders them,
 * used by app/page.tsx AND every other public chapter surface. Centralised here so
 * the gated state a suspended / launching-soon chapter shows is IDENTICAL
 * everywhere (the bug that shipped: only "/" was gated, so /schedule, /alumni,
 * /parents, /bid, /check-in kept serving a suspended or not-yet-live chapter). The
 * gate DECISION (chapterLiveState) is pure logic in lib/chapter-live-guard; this
 * file owns the JSX that maps a state to a page.
 *
 * Both pages are brand-NEUTRAL and render NO chapter data, so a suspended or
 * not-yet-published chapter never leaks its identity or member PII.
 */

/**
 * Returns a React element to render INSTEAD of the page when this chapter is NOT
 * live (pending-billing → launching-soon page; operator-suspended → neutral
 * inactive page), or null when the chapter IS live OR on the apex — in which case
 * the caller renders its own page (each public page keeps its own apex handling).
 * Call this at the TOP of a public chapter server component:
 *   `const gate = await chapterLiveGate(); if (gate) return gate;`
 */
export async function chapterLiveGate(): Promise<React.ReactElement | null> {
  const state = await chapterLiveState();
  if (state === "pending-billing") return <ChapterLaunchingSoonPage />;
  if (state === "suspended") return <ChapterInactivePage />;
  return null; // "live" or "apex" → render the page normally
}

/**
 * Shown in place of a chapter site when the operator has suspended that chapter
 * (registry isActive=false and NOT pending-billing). Kept brand-neutral — a
 * suspended chapter must not leak its identity or any data, and the platform
 * should look intentional, not broken.
 */
export function ChapterInactivePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          This chapter is not currently active
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This chapter&apos;s site is temporarily unavailable. If you&apos;re a chapter
          administrator, please contact Greekstack support to restore access.
        </p>
      </div>
    </div>
  );
}

/**
 * Shown in place of a chapter site when the chapter is provisioned but its PUBLIC
 * subdomain has NOT gone live yet because billing is still pending (a card-free
 * monthly signup — see the CARD-REQUIRED-TO-PUBLISH gate in app/api/onboard).
 * Distinct from ChapterInactivePage (operator hard-suspend): the founder simply
 * needs to add a payment method to publish, so the copy is upbeat + points them to
 * /admin/billing (which stays reachable — the gate only covers PUBLIC chapter
 * routes). Brand-neutral on the Greekstack platform look; no chapter data is
 * rendered, so a not-yet-live chapter never leaks member PII before it publishes.
 */
export function ChapterLaunchingSoonPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M12 3v10" />
            <path d="m8 7 4-4 4 4" />
            <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          This chapter&apos;s site is launching soon
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Billing setup is in progress. The public site goes live as soon as the
          chapter adds a payment method.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Chapter administrator?{" "}
          <a
            href="/admin/billing"
            className="font-medium text-blue-600 underline-offset-2 hover:underline"
          >
            Finish billing setup to publish
          </a>
          .
        </p>
      </div>
    </div>
  );
}
