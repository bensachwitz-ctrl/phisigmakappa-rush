import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── RBAC mutation-guard source-pin ───────────────────────────────────────────
// SECURITY-SENSITIVE consistency pin. Several /api/admin MUTATION handlers used
// to gate writes on the COARSE `if (!isAdminRole()) … "Admins only"` even though
// a matching officer-permission domain exists — so an officer who legitimately
// holds that domain's `write` could NOT perform the write via the API (the
// domain was decorative on the write path). The canonical fine-grained pattern
// (app/api/admin/brothers PATCH + app/api/admin/library) is: admins OR
// domain-writers may write, expressed as
//
//     const denied = await guardOfficer("<DOMAIN>", "write");
//     if (denied) return denied;
//
// guardOfficer() returns SUPER_ADMIN_PERMISSIONS for a chapter admin, so admins
// still always pass; an officer holding the domain's write now passes too.
//
// This is a pure SOURCE pin (no DB, deterministic) — it reads each route file's
// text and asserts, for the changed routes, that:
//   (a) it imports guardOfficer from "@/lib/permissions",
//   (b) it contains a guardOfficer("<domain>", "write") call for the expected
//       domain (the mutation path is fine-grained), and
//   (c) the bare admin-only guard (`if (!isAdminRole()) … "Admins only"`) no
//       longer appears in any MUTATION handler (POST/PATCH/DELETE) body. GET
//       reads that legitimately stay admin-only are NOT touched, so the check is
//       scoped to the mutation handlers only.
// Mirrors the source-pin half of tests/role-visibility-rbac.test.ts so a future
// edit can't silently re-coarsen (or remove) these write gates.

const REPO_ROOT = resolve(__dirname, "..");

function routeSource(rel: string): string {
  return readFileSync(resolve(REPO_ROOT, rel), "utf8");
}

/**
 * Split a route module into its exported handler bodies, keyed by HTTP method.
 * Each handler runs from its `export async function NAME(` to the next handler
 * export (or EOF). Deterministic, regex-free slicing on the export markers.
 */
function handlerBodies(src: string): Record<string, string> {
  const METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];
  const marks: { method: string; start: number }[] = [];
  for (const m of METHODS) {
    const idx = src.indexOf(`export async function ${m}(`);
    if (idx !== -1) marks.push({ method: m, start: idx });
  }
  marks.sort((a, b) => a.start - b.start);
  const out: Record<string, string> = {};
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
    out[marks[i].method] = src.slice(marks[i].start, end);
  }
  return out;
}

// A bare admin-only guard: `if (!isAdminRole()) … "Admins only"` — the exact
// coarse shape we replaced on the write path. (`[\s\S]` so the brace-block form
// `if (!isAdminRole()) {\n  return …"Admins only"… }` is caught too.)
const BARE_ADMIN_GUARD = /if\s*\(\s*!isAdminRole\(\)\s*\)[\s\S]{0,200}?Admins only/;

const MUTATION_METHODS = ["POST", "PATCH", "DELETE"] as const;

// Handlers intentionally NOT converted to the blanket guardOfficer() shape and
// therefore exempt from the "consumes a guardOfficer denial" check (they still
// must pass the "no bare admin-only guard" check). brothers PATCH keeps its
// richer `isAdminRole() || hasPermission(perms, "brothers", "write")` expression
// plus self-edit / academic-writer logic — the task excludes it explicitly.
const FINE_GRAINED_EXEMPT = new Set(["app/api/admin/brothers/route.ts::PATCH"]);

// route file → the officer-permission domain its mutation handlers must gate on.
const CHANGED_ROUTES: { rel: string; domain: string }[] = [
  { rel: "app/api/admin/announcements/route.ts", domain: "announcements" },
  { rel: "app/api/admin/broadcast/route.ts", domain: "announcements" },
  { rel: "app/api/admin/rush/route.ts", domain: "rushPipeline" },
  { rel: "app/api/admin/enrich/route.ts", domain: "rushPipeline" },
  // P1 #4 — the Recruitment Chair's PNM controls (add / edit / delete / bid) +
  // bulk-text were isAdminRole()-only, so a rushPipeline:write officer 403'd.
  { rel: "app/api/admin/rushees/route.ts", domain: "rushPipeline" },
  { rel: "app/api/admin/rushees/[id]/route.ts", domain: "rushPipeline" },
  { rel: "app/api/admin/rushees/[id]/bid/route.ts", domain: "rushPipeline" },
  { rel: "app/api/send-sms/route.ts", domain: "rushPipeline" },
  { rel: "app/api/admin/attendance/route.ts", domain: "events" },
  { rel: "app/api/admin/alumni-invites/route.ts", domain: "alumni" },
  { rel: "app/api/admin/brother-invites/route.ts", domain: "brothers" },
  { rel: "app/api/admin/brothers/route.ts", domain: "brothers" },
];

describe("RBAC mutation guards use fine-grained guardOfficer (source-pin)", () => {
  for (const { rel, domain } of CHANGED_ROUTES) {
    describe(rel, () => {
      const src = routeSource(rel);
      const handlers = handlerBodies(src);

      it("imports guardOfficer from @/lib/permissions", () => {
        // Tolerant of other named imports on the same line (e.g.
        // `{ guardOfficer, guardOfficerOrAdmin }`).
        const importsGuardOfficer =
          /import\s*\{[^}]*\bguardOfficer\b[^}]*\}\s*from\s*["']@\/lib\/permissions["']/.test(src);
        expect(importsGuardOfficer).toBe(true);
      });

      it(`gates a mutation on guardOfficer("${domain}", "write")`, () => {
        // Whitespace-tolerant: guardOfficer( "domain" , "write" ).
        const callRe = new RegExp(
          `guardOfficer\\(\\s*["']${domain}["']\\s*,\\s*["']write["']\\s*\\)`,
        );
        expect(callRe.test(src)).toBe(true);
      });

      it("has NO bare admin-only guard in any mutation handler (POST/PATCH/DELETE)", () => {
        for (const method of MUTATION_METHODS) {
          const body = handlers[method];
          if (!body) continue; // route may not implement every verb
          expect(
            BARE_ADMIN_GUARD.test(body),
            `${rel} ${method} still has a bare admin-only "Admins only" guard`,
          ).toBe(false);
          // …and the converted mutation handler resolves the fine-grained
          // denial. (brothers PATCH is exempt: it keeps its bespoke
          // isAdminRole() || hasPermission(...) expression by design.)
          if (FINE_GRAINED_EXEMPT.has(`${rel}::${method}`)) continue;
          expect(
            /const\s+denied\s*=\s*await\s+guardOfficer\(/.test(body) &&
              /if\s*\(\s*denied\s*\)\s*return\s+denied\s*;?/.test(body),
            `${rel} ${method} does not consume a guardOfficer() denial`,
          ).toBe(true);
        }
      });
    });
  }

  it("the brothers PATCH stays fine-grained on its own (not flattened to guardOfficer)", () => {
    // brothers PATCH was ALREADY fine-grained via
    // `isAdminRole() || hasPermission(perms, "brothers", "write")` and must be
    // left intact — the task explicitly excludes it. Pin that the bespoke
    // expression survives so a future "consistency" pass doesn't flatten the
    // PATCH's richer self-edit / academic-writer logic into a blanket guard.
    const patch = handlerBodies(routeSource("app/api/admin/brothers/route.ts")).PATCH;
    expect(patch).toBeTruthy();
    expect(
      /isAdminRole\(\)\s*\|\|\s*hasPermission\(perms,\s*["']brothers["'],\s*["']write["']\)/.test(patch),
    ).toBe(true);
    // The PATCH must NOT have grown a blanket guardOfficer("brothers","write")
    // gate at its top (that would drop the self-edit / academic-writer paths).
    expect(/guardOfficer\(\s*["']brothers["']\s*,\s*["']write["']\s*\)/.test(patch)).toBe(false);
  });
});
