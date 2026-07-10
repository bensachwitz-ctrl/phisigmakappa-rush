"use client";

/**
 * CALCOM EMBED — a chapter-branded Cal.com / Cal.diy booking surface for the
 * Events pages. When the chapter has set its scheduler handle on
 * /admin/settings → Calendar (`calendar.calDiyUrl`), this renders a responsive
 * inline booker so brothers and visitors can self-serve a time; when the handle
 * is unset it renders NOTHING (returns null) so the surface is never a broken or
 * empty frame.
 *
 * A plain <iframe> (loading="lazy") is used rather than the @calcom/embed-react
 * package — same inline flow, zero extra bundle — mirroring the apex /contact
 * <CalEmbed> and the onboarding <BookACall>. The booking URL is resolved by the
 * pure `calcomEmbedUrl` util, which accepts a username, username/event-type, or
 * a full self-hosted URL.
 */

import * as React from "react";
import { calcomEmbedUrl } from "@/lib/calcom";
import { IconCalendarTool } from "@/components/brand/icons";

export function CalcomEmbed({
  calUrl,
  title = "Book time with the chapter",
  subtitle = "Pick a slot that works for you. No account needed.",
  className,
}: {
  /** Raw `calendar.calDiyUrl` cfg value (username, username/event-type, or URL). */
  calUrl: string | undefined | null;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const src = calcomEmbedUrl(calUrl);
  // Unconfigured → render nothing. The rest of the Events surface stands alone.
  if (!src) return null;

  return (
    <section
      aria-labelledby="calcom-embed-heading"
      className={className ?? "rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm"}
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: "hsl(var(--primary))" }}
        >
          <IconCalendarTool className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="calcom-embed-heading" className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <iframe
          title={title}
          src={src}
          loading="lazy"
          className="h-[640px] w-full"
          style={{ border: 0 }}
          allow="camera; microphone; fullscreen; clipboard-write"
        />
      </div>
    </section>
  );
}
