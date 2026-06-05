/**
 * /login — the apex-accessible SIGN-IN ENTRY.
 * ─────────────────────────────────────────────────────────────────────────────
 * A polished, on-brand landing where a member first picks their SCHOOL + CHAPTER,
 * then a PORTAL (Brother | Alumni), and is routed to THAT chapter's existing
 * login page. Unlike /portal (which is chapter-scoped and 404s on the apex), this
 * page is reachable on the apex marketing host AND on any tenant — it is the
 * front door that fans members out to the correct per-chapter login.
 *
 * ADDITIVE + non-breaking: it does not touch the auth routes or their POST logic.
 * It only reads the public Tenant registry to populate the chapter list and then
 * hands off (client-side navigation) to /portal/<brothers|alumni>/login.
 *
 * The chapter list comes from the central registry (public."Tenant"): every
 * ACTIVE chapter's subdomain + custom domain + display name + school. The fetch
 * is fully defensive — any DB hiccup yields an empty list and the entry renders
 * its graceful "don't see your chapter? talk to us" state.
 */

import type { Metadata } from "next";
import { centralDb } from "@/lib/prisma";
import { LoginEntry } from "@/components/site/login-entry";
import type { ChapterRouteTarget } from "@/lib/login-routing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in to your chapter — Greekstack",
  description:
    "Find your fraternity or sorority chapter and sign in to the Brother or Alumni portal on your branded Greekstack site.",
  robots: { index: false, follow: true },
};

/**
 * Active chapters for the picker, newest-name-first irrelevant (the client
 * groups + sorts by school). Reads only non-sensitive registry columns. Returns
 * [] on any error so the page never crashes and degrades to the empty state.
 */
async function loadActiveChapters(): Promise<ChapterRouteTarget[]> {
  try {
    const rows = await centralDb.tenant.findMany({
      where: { isActive: true },
      select: { subdomain: true, domain: true, name: true, school: true },
      orderBy: [{ school: "asc" }, { name: "asc" }],
    });
    // Drop any malformed rows (a chapter must at least have a subdomain to be
    // routable). Everything else is optional and tolerated by the client.
    return rows.filter((r) => !!r.subdomain);
  } catch {
    return [];
  }
}

export default async function LoginEntryPage() {
  const chapters = await loadActiveChapters();
  return <LoginEntry chapters={chapters} />;
}
