// lib/billing-guard.ts — SHARED server-side billing WRITE guard.
//
// ───────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS (billing/trial lockout was bypassable — P1)
// ───────────────────────────────────────────────────────────────────────────
// The billing lockout was enforced ONLY in middleware.ts, keyed off a
// NON-HttpOnly `greekstack_billing_locked` cookie that app/admin/layout.tsx set via
// `document.cookie`. That is not a security boundary:
//   • the cookie is client-set, so browser JS can simply delete it;
//   • a curl / native Bearer caller never carries it at all;
//   • absence of the cookie = "not locked" (fail-open by default).
// So an expired/canceled chapter could strip the cookie (or use a Bearer token)
// and keep FULL write access. No server route re-checked entitlement.
//
// This module re-checks the AUTHORITATIVE platform-billing entitlement
// server-side (via getEntitlement, which reads the central registry) on every
// guarded mutation and returns a 402 when the chapter is locked out. It is wired
// into the shared officer guards (lib/permissions.ts) and the officer Bearer
// path (lib/mobile-exec-auth.ts) so both the cookie web callers AND token/curl
// callers are enforced by the same DB-backed check.
//
// FAIL-OPEN on uncertainty (matches getEntitlement's never-throw contract): we
// only ever return 402 on an AFFIRMATIVE lockout. Any resolution/lookup error,
// or an apex/unknown subdomain, returns "not locked" so a transient glitch never
// blocks a paying chapter.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSubdomain } from "@/lib/prisma";
import { getEntitlement, isBillingLockedOut } from "@/lib/entitlement";

const LOCKED_MESSAGE =
  "Billing Lockout: Please activate your subscription at /admin/billing";

/** Resolve the chapter subdomain from the request Host, fail-safe → "". */
function resolveSubdomain(explicit?: string): string {
  if (explicit !== undefined) return explicit;
  try {
    return getSubdomain(headers().get("host")) || "";
  } catch {
    return "";
  }
}

/**
 * Resolve whether the chapter is billing-locked. NEVER throws; fails OPEN
 * (`locked: false`) on an empty/unknown subdomain or ANY lookup error.
 */
export async function checkBillingLock(
  subdomain?: string,
): Promise<{ locked: boolean; reason: string | null }> {
  try {
    const sub = resolveSubdomain(subdomain);
    if (!sub) return { locked: false, reason: null }; // apex / unknown — nothing to gate
    const e = await getEntitlement(sub);
    return { locked: isBillingLockedOut(e), reason: e.reason };
  } catch {
    return { locked: false, reason: null };
  }
}

/**
 * SHARED billing WRITE guard for route handlers. Call on state-changing
 * admin/officer paths. Returns a ready-to-return 402 NextResponse when the
 * chapter's platform subscription is locked out, or `null` to proceed.
 *
 * Pass `subdomain` explicitly for Bearer/apex-hosted callers (no chapter Host
 * header); omit it for web callers to derive it from the request Host.
 */
export async function guardBillingWrite(subdomain?: string): Promise<NextResponse | null> {
  const { locked, reason } = await checkBillingLock(subdomain);
  if (!locked) return null;
  return NextResponse.json(
    { ok: false, error: LOCKED_MESSAGE, reason },
    { status: 402 },
  );
}

/**
 * Throwing twin of guardBillingWrite for the requireOfficerPermission path,
 * whose guardOfficer wrapper maps a thrown `status` onto the HTTP response.
 * Throws a 402-coded error on an affirmative lockout; no-ops otherwise.
 */
export async function assertBillingActive(subdomain?: string): Promise<void> {
  const { locked } = await checkBillingLock(subdomain);
  if (locked) {
    const err: any = new Error(LOCKED_MESSAGE);
    err.status = 402;
    err.code = "BILLING_LOCKED";
    throw err;
  }
}
