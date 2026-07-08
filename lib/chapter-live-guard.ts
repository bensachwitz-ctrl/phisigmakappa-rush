import { headers } from "next/headers";
import {
  getSubdomain,
  getRegistrySubdomain,
  isTenantActive,
  getTenantClient,
} from "@/lib/prisma";

/**
 * SHARED public-chapter go-live DECISION. The go-live check used to live ONLY in
 * app/page.tsx ("/"), so every OTHER public chapter route (/schedule, /alumni,
 * /alumni/[id], /parents, /bid/[token], /check-in/[code]) kept serving a chapter
 * that was operator-suspended OR still pending-billing (not yet published).
 *
 * This module is PURE logic (no JSX), so it is unit-testable and stays framework-
 * light; the JSX rendering (which state → which page) lives beside the status
 * components in components/site/chapter-status.tsx (chapterLiveGate). Callers use
 * that gate; this exports the decision it is built on.
 *
 * NOTE: this is a SERVER decision (reads headers + Prisma). middleware.ts is the
 * Edge runtime and cannot call Prisma, so the gate cannot live there — each public
 * chapter page calls chapterLiveGate() at the top of its server component.
 */

export type ChapterLiveState = "apex" | "live" | "pending-billing" | "suspended";

/**
 * Is this chapter's public subdomain dark because billing is pending (vs an
 * operator hard-suspend)? Reads the onboard-seeded per-tenant SiteConfig flag
 * "billing.pendingActivation" from the chapter's own schema. Resilient: any lookup
 * error resolves to false so we fall back to the neutral operator-suspend state
 * rather than leaking a wrong "launching soon" state.
 */
export async function isPendingBilling(schemaSubdomain: string): Promise<boolean> {
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

/**
 * Resolve whether the current request's chapter should serve its public routes:
 *   • "apex"           — no chapter subdomain; the caller handles its own apex case
 *                        (marketing / 404) and this gate stays out of the way.
 *   • "live"           — serve the page normally.
 *   • "pending-billing"— provisioned but not yet published (card-free monthly);
 *                        render the "launching soon" page.
 *   • "suspended"      — operator hard-suspend; render the neutral inactive page.
 *
 * Mirrors app/page.tsx: the registry lookup uses the hyphen-preserving registry
 * key (getRegistrySubdomain), and isTenantActive fails OPEN (returns true on any
 * registry error) so a live, paying chapter never goes dark on a transient hiccup.
 */
export async function chapterLiveState(): Promise<ChapterLiveState> {
  let host = "";
  try {
    host = headers().get("host") || headers().get("x-forwarded-host") || "";
  } catch {}

  const subdomain = getSubdomain(host);
  if (!subdomain) return "apex";

  const active = await isTenantActive(getRegistrySubdomain(host) ?? subdomain);
  if (active) return "live";

  // Not live: distinguish pending-billing (launching soon) from an operator
  // hard-suspend. The pending flag lives in the chapter's own schema, keyed by the
  // schema-form subdomain getSubdomain returns.
  return (await isPendingBilling(subdomain)) ? "pending-billing" : "suspended";
}
