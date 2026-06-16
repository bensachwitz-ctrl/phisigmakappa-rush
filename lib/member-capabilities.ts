// member-capabilities.ts — SERVER-SIDE source of truth for what a logged-in
// portal member is allowed to do in the mobile/web member app.
//
// Why this exists (market-critical RBAC): the mobile client used to decide
// "can this person open exec tools?" purely from `dashboardData.profile.position`
// and a client-flippable `viewRole` toggle. That is a UI hint, not a gate — a
// member could flip the lens client-side. This module computes the SAME answer
// on the server from the member's REAL, admin-controlled `Brother.position`
// (which a member cannot edit on their own row) and the chapter's feature flags,
// so the API never advertises exec-only capabilities to a non-officer and the
// dues surface only appears when the chapter actually enabled dues.
//
// Framework-free on purpose so it imports cleanly from route handlers, the Edge
// runtime, Node tests, and (the boolean helper) React components.

/**
 * Is this chapter `position` an officer / exec-board seat?
 *
 * Mirrors the keyword set the demo client used (`isOfficerPosition` in
 * app/app/_demo/mock-data.ts) so the server's verdict matches what the UI has
 * always shown for officers — President / Vice / Treasurer / Secretary / any
 * Chair or titled officer count; plain actives do not. Kept here (not imported
 * from the client `_demo` module) so the server gate has NO dependency on demo
 * code and can never be weakened by a demo-only edit.
 */
export function isOfficerPosition(position: string | null | undefined): boolean {
  const p = (position || "").toLowerCase();
  if (!p) return false;
  return ["president", "vice", "treasurer", "secretary", "chair", "officer", "exec"].some(
    (k) => p.includes(k),
  );
}

/**
 * The capability set the API returns to the member app. EVERY field is computed
 * server-side from the verified session + the member's real DB row + chapter
 * flags — never from anything the client sends. The client uses these to decide
 * which surfaces to render; because the API ALSO withholds the underlying data
 * (e.g. it never serves exec-only payloads to a non-officer, and never serves
 * dues data when dues is disabled), a tampered client gains nothing.
 */
export interface MemberCapabilities {
  /** May open the exec / officer console (roster mgmt, dues mgmt, console). */
  exec: boolean;
  /** The chapter has online dues ENABLED — the Dues surface + API may serve. */
  duesEnabled: boolean;
}

/**
 * Compute the member's capabilities from server-trusted inputs.
 *
 * @param role        the verified portal-session role ("brother" | "alumni" | "pnm")
 * @param position    the member's REAL Brother.position (admin-controlled), or null
 * @param duesEnabled whether the chapter's `dues.enabled` SiteConfig flag is "true"
 *
 * Only a `brother`-role session whose real position is an officer seat may use
 * exec tools. Alumni / PNM sessions never get exec, regardless of any position
 * string, because the exec console manages the active-brother chapter.
 */
export function computeMemberCapabilities(
  role: string | null | undefined,
  position: string | null | undefined,
  duesEnabled: boolean,
): MemberCapabilities {
  const exec = role === "brother" && isOfficerPosition(position);
  return { exec, duesEnabled: !!duesEnabled };
}
