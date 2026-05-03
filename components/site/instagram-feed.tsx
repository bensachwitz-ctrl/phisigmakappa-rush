/**
 * Embeds real posts from @phisig_usc on Instagram via the public /embed/ endpoint.
 * Each iframe loads directly from Instagram — photos always reflect the latest version
 * and work without API tokens.
 */
import { Instagram, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Real post slugs pulled live from instagram.com/phisig_usc on May 2026.
// To refresh, visit the chapter Instagram and copy the slug from any post URL.
const POSTS = [
  "DXzzTaFjSyj", // Brother of the Month — Michael McCarthy
  "DXHwOJCkUbi", // Annual paintball at Trigger Tyme
  "DW9-fTTibRF", // Alpha Phi pledge class initiation
  "DWmioxGCaBG", // Spring formal in New Orleans
  "DU80cXJidhH", // Cantina 76 percent night for L&L Society
  "DUyvfpokpy6", // Polar Plunge for Special Olympics SC
  "DUBvmpfktF3", // 3.45 Chapter GPA / 3.50 NM GPA
  "DT0irEWEdT-", // Chapter celebration
  "DSXMOLhERFH", // Spring Rush 2026 announcement
  "DSGFt3REoty", // Brother of the Month — John Chiffriller
  "DRzyoVciZCh", // 2026 Executive Board announcement
  "DRxIVRXkYCn", // Game day at Williams-Brice
  "DQpPhzsiXcu",
  "DQhxFrdkg6k",
  "DPmJQxHkfcE",
  "DO6XAUZEZh1",
  "DNYvm6WxVg-",
  "DKvK5SmSup_",
  "DKiIwS-Srf_",
  "DJzUXGtJHMh",
  "DJsjJBipeeY",
  "DIbyK0kpmx6",
  "DH9CdZFJ1Wf",
  "DH3txVVpjUS",
  "DHO6EUsSCF4",
  "DFs7MK-y-vy",
  "DEqJVWWSenI",
  "DEgRPmASuYM",
  "DEaTLBqJm9a",
  "DETqHgWR0-S",
];

export function InstagramFeed({
  count = 9,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const slugs = POSTS.slice(0, count);
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4", className)}>
      {slugs.map((slug, i) => (
        <div
          key={slug}
          className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-secondary lift group"
        >
          <iframe
            src={`https://www.instagram.com/p/${slug}/embed/captioned`}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            scrolling="no"
            allowTransparency
            title={`Phi Sig USC Instagram post ${slug}`}
          />
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-phisig-red shadow-sm">
              <Instagram className="h-3 w-3" /> @phisig_usc
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact inline feed showing 4 posts in a row with the "View on Instagram" CTA.
 */
export function InstagramStrip() {
  const slugs = POSTS.slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {slugs.map((slug) => (
          <div
            key={slug}
            className="relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary lift"
          >
            <iframe
              src={`https://www.instagram.com/p/${slug}/embed/captioned`}
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
              scrolling="no"
              allowTransparency
              title={`Phi Sig USC Instagram post ${slug}`}
            />
          </div>
        ))}
      </div>
      <div className="text-center">
        <Link
          href="https://www.instagram.com/phisig_usc/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-phisig-red hover:underline"
        >
          <Instagram className="h-4 w-4" /> See more on @phisig_usc
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
