// app/api/portal/clerk-link/route.ts
// ───────────────────────────────────────────────────────────────────────────
// The bridge from an OPTIONAL Clerk social sign-in back to the app's OWN
// tenant-bound portal session. Clerk only brokers IDENTITY; this route turns a
// verified Clerk identity into the existing portal cookie (setPortalCookie) so
// the crown-jewel, tenant-scoped HMAC session stays the real source of truth.
//
// Flow (only reachable when Clerk is configured AND the user completed a Clerk
// sign-in on the portal login page):
//   1. Re-check isClerkConfigured() server-side. If off → 404 (feature absent).
//      Clerk's runtime is imported DYNAMICALLY and only inside this gate, so an
//      unconfigured deploy never evaluates `@clerk/nextjs/server` here.
//   2. auth() must show an active Clerk session (userId present) — otherwise 401.
//   3. currentUser() → read the user's PRIMARY, VERIFIED email. An unverified
//      email is never trusted (an attacker could otherwise attach a victim's
//      address to their own Clerk account without proving ownership).
//   4. Look up a Brother / PortalUser with that email IN THE CURRENT TENANT.
//      The `prisma` proxy resolves the tenant schema from THIS request's Host
//      header, so the lookup is already chapter-scoped — a Clerk identity can
//      only ever match a member of the chapter whose subdomain was used to sign
//      in. No cross-tenant bridge is possible.
//   5. Match → issue the EXISTING portal session via setPortalCookie. No match
//      → clear, non-enumerating error. Clerk never becomes the session itself.
//
// This route deliberately does NOT modify lib/portal-auth.ts internals — it only
// CALLS the public setPortalCookie(), exactly like the email/password login.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setPortalCookie } from "@/lib/portal-auth";
import { isClerkConfigured } from "@/lib/clerk-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pull the best trustworthy email off a Clerk user: the primary address if it
 * is verified, else the first verified address. Returns null when the user has
 * no verified email — in which case we refuse to bridge (we will not link on an
 * unproven address). Defensive against shape changes in Clerk's resource type.
 */
function verifiedEmailOf(user: {
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{
    id?: string;
    emailAddress?: string;
    verification?: { status?: string | null } | null;
  }> | null;
}): string | null {
  const list = Array.isArray(user.emailAddresses) ? user.emailAddresses : [];
  const isVerified = (e: { verification?: { status?: string | null } | null }) =>
    e?.verification?.status === "verified";

  const primary = list.find(
    (e) => e.id && e.id === user.primaryEmailAddressId && isVerified(e),
  );
  const chosen = primary || list.find(isVerified);
  const email = chosen?.emailAddress;
  return email ? email.trim().toLowerCase() : null;
}

export async function POST() {
  // (1) Hard env gate. With Clerk unconfigured this endpoint does not exist as
  // far as callers are concerned, and crucially we return BEFORE importing any
  // Clerk runtime, keeping the unconfigured build free of Clerk execution.
  if (!isClerkConfigured()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Dynamic, gate-guarded import — Clerk's server SDK loads only when the
  // feature is actually on. (Static top-level import would evaluate Clerk for
  // every request to this module even when disabled.)
  let clerkUserId: string | null = null;
  let clerkUser: Awaited<ReturnType<typeof import("@clerk/nextjs/server").currentUser>> = null;
  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    clerkUserId = auth().userId;
    if (clerkUserId) {
      clerkUser = await currentUser();
    }
  } catch {
    // Any failure resolving the Clerk session is treated as "not signed in".
    return NextResponse.json(
      { ok: false, error: "Could not verify your sign-in. Please try again." },
      { status: 401 },
    );
  }

  // (2) Require an authenticated Clerk session.
  if (!clerkUserId || !clerkUser) {
    return NextResponse.json(
      { ok: false, error: "You are not signed in with Google." },
      { status: 401 },
    );
  }

  // (3) Require a VERIFIED email — never link on an unproven address.
  const email = verifiedEmailOf(clerkUser);
  if (!email) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Your Google account has no verified email we can match. Use the email/password sign-in instead.",
      },
      { status: 400 },
    );
  }

  // (4) Tenant-scoped lookup. `prisma` is bound to THIS request's chapter
  // schema, so we can only ever find a member of the current chapter. Mirrors
  // the email/password login: prefer an existing brother PortalUser, else find
  // a Brother row and auto-provision the unified PortalUser (no password needed
  // — Clerk already proved the member owns this email).
  try {
    let portalUser = await prisma.portalUser.findFirst({
      where: { email, role: "brother" },
    });

    if (!portalUser) {
      const brother = await prisma.brother.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });

      if (brother) {
        portalUser = await prisma.portalUser.create({
          data: {
            role: "brother",
            email,
            // No passwordHash — this account authenticates via the social
            // bridge (or a later email/password reset), not a stored secret.
            brotherId: brother.id,
            lastLoginAt: new Date(),
          },
        });
      }
    } else {
      await prisma.portalUser.update({
        where: { id: portalUser.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // (5a) No member in THIS chapter with that email → refuse, with a message
    // that explains the tenant scoping without leaking who is/isn't a member.
    if (!portalUser) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No member with that email in this chapter. Ask an e-board officer to add you, then try again.",
        },
        { status: 404 },
      );
    }

    // (5b) Issue the EXISTING tenant-bound portal session. From here on the app
    // behaves exactly as if the member had signed in with email/password.
    setPortalCookie(portalUser.id, "brother");

    return NextResponse.json({
      ok: true,
      user: {
        id: portalUser.id,
        email: portalUser.email,
        role: portalUser.role,
        brotherId: portalUser.brotherId,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong linking your account. Please try again." },
      { status: 500 },
    );
  }
}
