import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSubdomain, getRegistrySubdomain, isTenantActive, getTenantClient } from "@/lib/prisma";
import MarketingLandingPage from "@/components/site/marketing-landing";
import ChapterLandingPage, { generateMetadata as generateChapterMetadata } from "@/components/site/chapter-landing";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let host = "";
  try {
    host = headers().get("host") || "";
  } catch {}

  const subdomain = getSubdomain(host);

  if (!subdomain) {
    return {
      title: "Greekstack — The White-Label Chapter Management Platform",
      description: "Run recruitment, dues, events, treasury, and alumni for your fraternity or sorority on one branded site — live the same day. First month free, no credit card.",
    };
  }

  return generateChapterMetadata();
}

/**
 * Shown in place of a chapter site when the operator has suspended that chapter
 * (registry isActive=false). Kept brand-neutral — a suspended chapter must not
 * leak its identity or any data, and the platform should look intentional, not
 * broken.
 */
function ChapterInactivePage() {
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
 * /admin/billing (which stays reachable — this only gates the public "/" route).
 * Brand-neutral on the Greekstack platform look; no chapter data is rendered, so a
 * not-yet-live chapter never leaks member PII before it publishes.
 */
function ChapterLaunchingSoonPage() {
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

/**
 * Is this chapter's public subdomain dark because billing is pending (vs an
 * operator hard-suspend)? Reads the onboard-seeded per-tenant SiteConfig flag
 * "billing.pendingActivation" from the chapter's own schema. Resilient: any lookup
 * error resolves to false so we fall back to the neutral operator-suspend page
 * rather than leaking a wrong "launching soon" state.
 */
async function isPendingBilling(schemaSubdomain: string): Promise<boolean> {
  if (!schemaSubdomain) return false;
  try {
    const db = getTenantClient(schemaSubdomain);
    const row = await db.siteConfig.findUnique({
      where: { key: "billing.pendingActivation" },
      select: { value: true },
    });
    return row?.value === "true";
  } catch {
    return false;
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  let host = "";
  try {
    host = headers().get("host") || "";
  } catch {}

  const subdomain = getSubdomain(host);

  if (!subdomain) {
    return <MarketingLandingPage />;
  }

  // Enforce the registry's isActive flag: a suspended chapter (toggled off in
  // the platform console) serves a neutral "not active" page instead of its
  // site. The lookup MUST use the hyphen-preserving registry key — getSubdomain
  // above returns the schema form ("phi_sig"), which never matches a hyphenated
  // registry row ("phi-sig"), so a suspended hyphenated chapter would wrongly
  // keep serving. Resilient by design — isTenantActive returns true on any
  // registry error, so a live chapter never goes dark from a transient failure.
  const active = await isTenantActive(getRegistrySubdomain(host) ?? subdomain);
  if (!active) {
    // Distinguish a chapter whose PUBLIC subdomain simply hasn't gone live yet
    // because billing is pending (card-free monthly — CARD-REQUIRED-TO-PUBLISH)
    // from an operator HARD-suspend. A pending-billing chapter shows the upbeat
    // "launching soon" page (with a path to /admin/billing); everything else shows
    // the neutral operator-suspend page. `subdomain` here is the schema-form key
    // getSubdomain returns, which is exactly what getTenantClient expects.
    const pending = await isPendingBilling(subdomain);
    return pending ? <ChapterLaunchingSoonPage /> : <ChapterInactivePage />;
  }

  return <ChapterLandingPage searchParams={searchParams} />;
}
