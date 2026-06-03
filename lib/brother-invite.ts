import { prisma } from "@/lib/prisma";

export type InviteReason = "ok" | "not-found" | "revoked" | "completed" | "expired";

/**
 * Resolve a brother-invite token to its current state. Shared by the
 * /api/onboard/[token] route AND the /onboard/[token] page so both agree on
 * status semantics (the page used to self-fetch the route over HTTP, which was
 * fragile and lost the "not-found" reason). Side effect: lazily expires a stale
 * invite so the status is always accurate at read time.
 */
export async function loadInvite(
  token: string,
): Promise<{ invite: any; reason: InviteReason }> {
  const invite = await prisma.brotherInvite.findUnique({ where: { token } });
  if (!invite) return { invite: null, reason: "not-found" };
  if (invite.status === "REVOKED") return { invite, reason: "revoked" };
  if (invite.status === "COMPLETED") return { invite, reason: "completed" };
  if (invite.expiresAt < new Date()) {
    await prisma.brotherInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    return { invite, reason: "expired" };
  }
  return { invite, reason: "ok" };
}
