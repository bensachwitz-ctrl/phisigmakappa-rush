"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, Calendar, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom navigation — sticks to the bottom edge of the viewport on
 * phones (under 768px) so the four highest-traffic CTAs are always one thumb
 * away. Hidden on tablet+ where the desktop top nav handles it.
 *
 * Buttons:
 *   • Register   — anchor #register (jumps to rush form)
 *   • Calendar   — anchor #schedule (jumps to schedule list)
 *   • Call us    — tel: link if rushPhone is set in cfg, otherwise
 *                  mailto:rush@... so it never dead-ends
 *   • Brothers   — /admin/login (gated chapter sign-in)
 *
 * iOS safe-area aware via env(safe-area-inset-bottom) so the bar doesn't
 * sit under the home indicator on notched phones.
 */
export function MobileBottomNav({
  rushPhone,
  rushEmail,
}: {
  rushPhone?: string;
  rushEmail?: string;
}) {
  const callHref = rushPhone
    ? `tel:${rushPhone.replace(/[^\d+]/g, "")}`
    : rushEmail
    ? `mailto:${rushEmail}`
    : "#register";
  return (
    <nav
      aria-label="Mobile primary navigation"
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-40",
        "border-t border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        "shadow-[0_-8px_24px_-12px_rgba(11,11,12,0.18)]",
        // iOS safe area — don't sit under the home indicator.
        "pb-[env(safe-area-inset-bottom)]",
        // Print: hide entirely (parents printing the consent receipt don't
        // want this bar on the page).
        "print:hidden"
      )}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="grid grid-cols-4 max-w-md mx-auto">
        <BottomTab href="#register" icon={Sparkles} label="Register" emphasis />
        <BottomTab href="/schedule" icon={Calendar} label="Schedule" />
        <BottomTab href={callHref} icon={Phone} label="Call" />
        <BottomTab href="/admin/login" icon={ShieldCheck} label="Brothers" />
      </div>
    </nav>
  );
}

function BottomTab({
  href,
  icon: Icon,
  label,
  emphasis = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
        "transition-colors press",
        // 44px+ minimum touch target per Apple HIG / WCAG 2.5.5.
        "min-h-[58px]",
        emphasis
          ? "text-phisig-red"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          emphasis ? "bg-phisig-red/10" : "bg-transparent"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  );
}
