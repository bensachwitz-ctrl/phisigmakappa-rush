import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RUSH_STATUSES = [
  "ACTIVE",
  "DROPPED",
  "BID_EXTENDED",
  "ACCEPTED",
  "DECLINED",
] as const;

export type RushStatus = (typeof RUSH_STATUSES)[number];

export const STATUS_LABELS: Record<RushStatus, string> = {
  ACTIVE: "Active",
  DROPPED: "Dropped",
  BID_EXTENDED: "Bid Extended",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
};

export const STATUS_STYLES: Record<RushStatus, string> = {
  ACTIVE: "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200",
  DROPPED: "bg-zinc-200 text-zinc-500 ring-1 ring-zinc-300 line-through",
  BID_EXTENDED: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  ACCEPTED: "bg-phisig-red text-white ring-1 ring-phisig-red-dark",
  DECLINED: "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200",
};

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
