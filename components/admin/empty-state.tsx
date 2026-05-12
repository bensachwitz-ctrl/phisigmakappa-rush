import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable empty-state card. Instead of "No X yet." flat-text, every empty
 * surface now gets:
 *   1. A big tinted icon (signals what's missing)
 *   2. A friendly headline ("No PNMs yet" / "Brotherhood directory is empty")
 *   3. A one-line "what to do" sub-line
 *   4. A primary CTA button linking to the right next step
 *   5. Optional secondary "Learn more" link
 *
 * Designed to make the chapter's first day feel like a setup wizard, not
 * a "broken site". A net-new chapter shouldn't see blank flat cards on
 * /admin/events, /admin/brothers, etc.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  tone = "phisig-red",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  tone?: "phisig-red" | "emerald" | "amber" | "blue";
}) {
  return (
    <Card>
      <CardContent className="py-12 px-6 text-center">
        <span
          className={cn(
            "mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full mb-4",
            tone === "phisig-red" && "bg-phisig-red-soft text-phisig-red",
            tone === "emerald" && "bg-emerald-50 text-emerald-700",
            tone === "amber" && "bg-amber-50 text-amber-700",
            tone === "blue" && "bg-blue-50 text-blue-700",
          )}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </span>
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
