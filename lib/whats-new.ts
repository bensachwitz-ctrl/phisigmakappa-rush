// "What's New" changelog logic — pure, dependency-free.
//
// The data shape mirrors the OSS `featuredrop` SDK's `FeatureEntry` (a subset:
// id / label / description / type / version / releasedAt) so the on-disk
// changelog stays interoperable with that ecosystem. We deliberately vendor
// this tiny surface instead of depending on `featuredrop` itself: its only
// runtime dependency is `posthog-node` (a server-side analytics transport),
// which we will not pull into a deliberately privacy-light app whose App Store
// listing declares no tracking. Nothing here touches the network.

/** Entry kind — drives the little colored tag in the UI. */
export type WhatsNewType = "feature" | "improvement" | "fix";

/** One changelog entry (a subset of featuredrop's FeatureEntry). */
export interface ChangelogEntry {
  /** Stable unique id. */
  id: string;
  /** Semantic version this shipped in, e.g. "1.4.0". */
  version: string;
  /** Short human-readable headline. */
  label: string;
  /** One or two sentences of detail. */
  description: string;
  /** Entry kind. */
  type: WhatsNewType;
  /** ISO date (YYYY-MM-DD) the entry was released. */
  releasedAt: string;
}

/**
 * Compare two dotted numeric version strings (e.g. "1.10.0" vs "1.9.2").
 * Returns -1 if `a < b`, 1 if `a > b`, 0 if equal. Missing segments count as 0,
 * so "1.4" === "1.4.0". Non-numeric/garbage segments are treated as 0.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".");
  const pb = b.split(".");
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = Number.parseInt(pa[i] ?? "0", 10) || 0;
    const nb = Number.parseInt(pb[i] ?? "0", 10) || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/** All entries sorted newest-first (version desc, then releasedAt desc). */
export function sortEntries(entries: readonly ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((x, y) => {
    const v = compareVersions(y.version, x.version);
    if (v !== 0) return v;
    // Same version → newer release date first (string compare is fine for ISO dates).
    return y.releasedAt < x.releasedAt ? -1 : y.releasedAt > x.releasedAt ? 1 : 0;
  });
}

/**
 * Entries the viewer has not yet seen, newest-first.
 *
 * `lastSeenVersion` is the highest version the viewer has already acknowledged
 * (persisted client-side). `null`/empty (first visit) → every entry is unseen.
 * An entry is unseen when its version is strictly greater than the watermark.
 */
export function unseenEntries(
  entries: readonly ChangelogEntry[],
  lastSeenVersion: string | null | undefined,
): ChangelogEntry[] {
  const sorted = sortEntries(entries);
  if (!lastSeenVersion) return sorted;
  return sorted.filter((e) => compareVersions(e.version, lastSeenVersion) > 0);
}

/** Count of unseen entries given the watermark. */
export function unseenCount(
  entries: readonly ChangelogEntry[],
  lastSeenVersion: string | null | undefined,
): number {
  return unseenEntries(entries, lastSeenVersion).length;
}

/**
 * The version to persist once the viewer has seen everything — the highest
 * version present. Returns `null` for an empty changelog.
 */
export function latestVersion(entries: readonly ChangelogEntry[]): string | null {
  let best: string | null = null;
  for (const e of entries) {
    if (best === null || compareVersions(e.version, best) > 0) best = e.version;
  }
  return best;
}
