import { requireOfficerPermission, checkOfficerPermission } from "@/lib/permissions";
import { loadRosterStandings } from "@/lib/points-server";
import { getSiteConfig } from "@/lib/site-config";
import { StandingClient } from "./standing-client";

export const dynamic = "force-dynamic";

/**
 * Admin "Standing" — the engagement-points command surface. Shows the whole
 * active roster ranked by a COMPUTED good-standing score (no new tables; the
 * score is derived from dues / meeting attendance / approved service hours /
 * study hours / chore completion the app already collects), plus a Scoring-rules
 * editor that tunes the weights/thresholds stored in SiteConfig (`points.config`).
 *
 * Gate: officer "siteSettings" read to view; "siteSettings" write to edit the
 * rules — same domain the chapter-settings surface uses, which the chapter admin
 * (SUPER_ADMIN_PERMISSIONS) satisfies.
 */
export default async function StandingPage() {
  await requireOfficerPermission("siteSettings", "read");
  const { allowed: canEdit } = await checkOfficerPermission("siteSettings", "write");

  const { config, rows } = await loadRosterStandings();

  // Neutral, white-label member-noun for copy ("members" / "the chapter").
  const cfg = await getSiteConfig().catch(() => ({} as Record<string, string>));

  // Strip the raw signals down to display-safe primitives for the client.
  const memberRows = rows.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position,
    headshotUrl: r.headshotUrl,
    pledgeClass: r.pledgeClass,
    score: r.result.score,
    max: r.result.max,
    pct: r.result.pct,
    standing: r.result.standing,
    breakdown: r.result.breakdown,
  }));

  return (
    <StandingClient
      initialConfig={config}
      members={memberRows}
      canEdit={canEdit}
      memberNoun={cfg["chapter.memberNounPlural"] || "members"}
    />
  );
}
