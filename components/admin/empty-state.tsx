import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IllustrationWelcome,
  type IllustrationProps,
} from "@/components/brand/illustrations";

/**
 * Reusable empty-state card. Instead of "No X yet." flat-text, every empty
 * surface now gets:
 *   1. A bespoke, on-brand SPOT ILLUSTRATION (a small scene that re-themes per
 *      tenant — see components/brand/illustrations) so a blank tab reads as
 *      finished and friendly, not "broken site". Defaults to a generic
 *      welcome scene; pass `illustration` to use a more specific one
 *      (roster / calendar / inbox / ledger / search / celebrate).
 *   2. A friendly headline ("No PNMs yet" / "Brotherhood directory is empty")
 *   3. A one-line "what to do" sub-line
 *   4. A primary CTA button linking to the right next step
 *   5. Optional secondary "Learn more" link
 *
 * Designed to make the chapter's first day feel like a setup wizard, not
 * a "broken site". A net-new chapter shouldn't see blank flat cards on
 * /admin/events, /admin/brothers, etc.
 *
 * NON-BREAKING: the original props (icon/title/description/primaryAction/
 * secondaryAction/tone) are all preserved. `icon` is still accepted (callers
 * keep passing their lucide glyph) and is rendered as a small tinted badge on
 * the illustration so the "what's missing" signal stays; `illustration` is a
 * new optional override.
 */
export function EmptyState({
  icon: Icon,
  illustration: Illustration = IllustrationWelcome,
  title,
  description,
  primaryAction,
  secondaryAction,
  tone = "phisig-red",
}: {
  icon?: React.ElementType;
  /** Optional bespoke scene shown above the title. Defaults to IllustrationWelcome. */
  illustration?: React.ComponentType<IllustrationProps>;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  tone?: "phisig-red" | "emerald" | "amber" | "blue";
}) {
  return (
    <Card>
      <CardContent className="py-12 px-6 text-center">
        {/* Bespoke brand illustration — the hero of the empty state. Its
            linework inherits `currentColor` (set by the tone below) and its
            accent fill follows the live brand `--primary`, so the scene
            re-themes per tenant with zero per-call wiring. A small tinted icon
            badge keeps the "what's missing" cue without competing with the art. */}
        <div
          className={cn(
            "relative mx-auto mb-5 w-fit",
            tone === "phisig-red" && "text-phisig-red",
            tone === "emerald" && "text-emerald-600",
            tone === "amber" && "text-amber-600",
            tone === "blue" && "text-blue-600",
          )}
        >
          <Illustration className="h-28 w-32 sm:h-32 sm:w-36" aria-hidden="true" />
          {Icon && (
            <span
              className={cn(
                "absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-card shadow-sm",
                tone === "phisig-red" && "bg-phisig-red-soft text-phisig-red",
                tone === "emerald" && "bg-emerald-50 text-emerald-700",
                tone === "amber" && "bg-amber-50 text-amber-700",
                tone === "blue" && "bg-blue-50 text-blue-700",
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
        {(primaryAction || secondaryAction) && (
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  tone === "phisig-red" && "bg-phisig-red text-white hover:bg-phisig-red-dark focus-visible:ring-phisig-red/40",
                  tone === "emerald" && "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40",
                  tone === "amber" && "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500/40",
                  tone === "blue" && "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500/40",
                )}
              >
                {primaryAction.label}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
