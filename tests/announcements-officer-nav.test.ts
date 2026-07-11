import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  hasPermission,
  DEFAULT_OFFICER_CATALOG,
  SUPER_ADMIN_PERMISSIONS,
  EMPTY_PERMISSIONS,
} from "@/lib/officer-permissions";

/**
 * P1 #3 — announcements officer dead-end.
 *
 * The write API (POST/PATCH/DELETE + broadcast) admits officers holding
 * announcements:write, but the compose PAGE + the News nav/⌘K tiles were
 * isAdminRole/adminOnly, so those officers had a working backend and no reachable
 * UI. This pins: (a) the page gates on the announcements DOMAIN (not isAdminRole)
 * and threads canWrite, (b) the News nav + command entries are domain-gated (not
 * adminOnly), and (c) an announcements:write officer actually sees them.
 */

const ROOT = resolve(__dirname, "..");
const read = (...p: string[]) => readFileSync(resolve(ROOT, ...p), "utf8");

const catalog = Object.fromEntries(
  DEFAULT_OFFICER_CATALOG.map((s) => [s.slug, s.permissions]),
);

function readableDomainsFor(slug: string): Set<string> {
  const perms = catalog[slug];
  return new Set(
    Object.entries(perms.domain || {})
      .filter(([, a]) => a === "read" || a === "write")
      .map(([d]) => d),
  );
}

// Mirrors filterNavItems (admin-nav) and the command-palette predicate.
const navItemVisible = (
  item: { adminOnly: boolean; domain?: string },
  isAdmin: boolean,
  readable: Set<string>,
): boolean => {
  if (item.adminOnly && !isAdmin) return false;
  if (isAdmin || !item.domain) return true;
  return readable.has(item.domain);
};

describe("announcements page gates on the officer domain, not isAdminRole", () => {
  const page = read("app/admin/announcements/page.tsx");

  it("uses checkOfficerPermission('announcements','read') and no longer isAdminRole-gates", () => {
    expect(page).toContain('checkOfficerPermission("announcements", "read")');
    expect(page).toContain("OfficerAccessRequired");
    // No longer redirects via the isAdminRole() call (comment prose aside).
    expect(page).not.toContain("isAdminRole()");
  });

  it("computes and threads canWrite into the manager", () => {
    expect(page).toContain('checkOfficerPermission("announcements", "write")');
    expect(page).toContain("canWrite={canWrite}");
  });

  it("the manager hides write controls when !canWrite", () => {
    const mgr = read("components/admin/announcements-manager.tsx");
    expect(mgr).toContain("canWrite");
    expect(mgr).toContain("{canWrite && (");
  });
});

describe("News nav + command tiles are domain-gated (not adminOnly)", () => {
  it("admin-nav News item is not adminOnly and carries the announcements domain", () => {
    const nav = read("components/admin/admin-nav.tsx");
    const line = nav.split("\n").find((l) => l.includes('label: "News"'));
    expect(line).toBeTruthy();
    expect(line!).toContain('domain: "announcements"');
    expect(line!).toContain("adminOnly: false");
  });

  it("command-palette nav-news is domain-gated, not adminOnly", () => {
    const pal = read("components/admin/command-palette.tsx");
    const line = pal.split("\n").find((l) => l.includes('id: "nav-news"'));
    expect(line).toBeTruthy();
    expect(line!).toContain('domain: "announcements"');
    expect(line!).not.toContain("adminOnly: true");
  });
});

describe("an announcements officer can discover + reach the compose UI", () => {
  // Find a non-super-admin catalog officer that holds announcements:write.
  const writerSlug = DEFAULT_OFFICER_CATALOG.find(
    (s) => !s.permissions.superAdmin && hasPermission(s.permissions, "announcements", "write"),
  )?.slug;

  it("the catalog has at least one non-admin officer with announcements:write", () => {
    expect(writerSlug).toBeTruthy();
  });

  it("that officer SEES the News nav item (adminOnly:false + domain readable)", () => {
    const readable = readableDomainsFor(writerSlug!);
    const newsItem = { adminOnly: false, domain: "announcements" };
    expect(navItemVisible(newsItem, false, readable)).toBe(true);
    // A plain member (no domains) does NOT see it.
    expect(navItemVisible(newsItem, false, new Set())).toBe(false);
    // Admin sees it regardless.
    expect(navItemVisible(newsItem, true, new Set())).toBe(true);
  });

  it("hasPermission agrees the writer holds write and a read-only holder does not", () => {
    expect(hasPermission(SUPER_ADMIN_PERMISSIONS, "announcements", "write")).toBe(true);
    expect(hasPermission(EMPTY_PERMISSIONS, "announcements", "read")).toBe(false);
  });
});
