import * as React from "react";
import { Reveal } from "@/components/site/reveal";
import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/utils";

/**
 * One shared admin page header so every inner admin section reads as the same
 * dashboard-tier surface — replacing the three competing treatments that had
 * grown up across ~25 pages (the rich dashboard card vs. directory/family's
 * lighter chip header vs. a bare `<h1>` on events/announcements/polls/academic/
 * chores/library).
 *
 * Renders the dashboard's premium language: a brand-tinted radial ambient glow,
 * an <IconChip> (brand tone, hidden on the smallest screens to keep titles
 * roomy), a balanced title, an optional subtitle, and a right-aligned action
 * slot for the page's primary CTA. The whole thing reveals on mount via the
 * shared <Reveal> (reduced-motion-safe inside the primitive).
 *
 * Drop-in: `<AdminPageHeader icon={IconEvents} title="Events" subtitle="…" action={<Button…/>} />`
 */
export function AdminPageHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned primary action (e.g. an "+ Add" button). */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal
      as="div"
      className={cn(
        "mb-6 relative overflow-hidden rounded-2xl border border-phisig-red/10 bg-gradient-to-br from-phisig-red-soft/50 via-white to-white p-5 shadow-[0_10px_30px_-16px_hsl(var(--primary)/0.18)] sm:p-6",
        className
      )}
    >
      {/* Soft brand radial in the top-right corner for depth (decorative). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-phisig-red/10 blur-3xl"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <IconChip icon={icon} tone="brand" size="lg" className="hidden sm:inline-flex" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight [text-wrap:balance] sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Reveal>
  );
}
