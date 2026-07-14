"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { IconFileText as FileEdit, IconBallot as Vote, IconLock as Lock, IconCheckCircle as CheckCircle2 } from "@/components/brand/icons";

/**
 * Status pill shared across the elections admin surfaces. Pure presentational —
 * lives next to the client components so both the list and the manage page use
 * one consistent visual for DRAFT / OPEN / CLOSED / SEATED.
 */
export function ElectionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "OPEN":
      return (
        <Badge className="bg-emerald-50 text-emerald-900">
          <Vote className="mr-1 h-3 w-3" /> Voting open
        </Badge>
      );
    case "CLOSED":
      return (
        <Badge className="bg-amber-50 text-amber-900">
          <Lock className="mr-1 h-3 w-3" /> Closed
        </Badge>
      );
    case "SEATED":
      return (
        <Badge className="bg-brand-red-soft text-brand-red">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Seated
        </Badge>
      );
    case "DRAFT":
    default:
      return (
        <Badge className="bg-secondary text-foreground">
          <FileEdit className="mr-1 h-3 w-3" /> Draft
        </Badge>
      );
  }
}

/** Best-guess current term code, e.g. "2026-FA" / "2026-SP" — matches the
 *  officers-client convention so the create dialog pre-fills sensibly. */
export function defaultTermCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  // Jan–May → Spring, Jun–Jul → Summer, Aug–Dec → Fall.
  const season = month <= 4 ? "SP" : month <= 6 ? "SU" : "FA";
  return `${year}-${season}`;
}
