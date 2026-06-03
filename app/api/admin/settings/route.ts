import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Admins only. The settings payload includes dues.stripeWebhookSecret and
  // every chapter config knob. isAdminAuthed() also accepts a plain BROTHER
  // cookie (adminFlag=0), so reads must require the admin ROLE — matching the
  // PATCH gate below — or a member could read the webhook signing secret.
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const settings = await getSiteConfig();
  return NextResponse.json({ settings });
}

const PatchSchema = z.object({
  updates: z.record(z.string(), z.string().max(2000)),
});

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  // Privilege escalation guard — settings change is admin-only. R30 chapter
  // simulation caught that any logged-in MEMBER could PATCH this and
  // overwrite advisor name, e-board roster, every chapter cfg knob.
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });

  const changedKeys: string[] = [];
  for (const [key, rawValue] of Object.entries(parsed.data.updates)) {
    // Defense in depth: scrub trailing junk that creeps in from copy-paste —
    // unicode ellipses, trailing backslashes, smart quotes, double-dot trails.
    // Live R10 audit caught a ".../help/…." URL and "advisor@phisig-usc.com\"
    // mailto values from real admin saves. Run-of-the-mill text fields get the
    // same trim. URL/email shaped fields get a stricter clean.
    const value = scrubAdminValue(key, rawValue);
    await prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    changedKeys.push(key);
  }
  // Single audit row per PATCH (a typical save touches 1-5 keys; logging one
  // row per touched field would flood the trail). Detail field carries the
  // changed key list so the e-board can answer "what got changed?" without
  // an extra DB read.
  if (changedKeys.length > 0) {
    // R43-A: if any dues.* key changed, also emit a dedicated
    // DUES_SETTINGS_CHANGED row so the dues ledger view can filter on
    // "settings touched" without scanning every SETTINGS_UPDATED entry.
    // We do NOT log the actual values — webhook secrets / publishable
    // keys would leak into the audit trail otherwise.
    const duesKeys = changedKeys.filter((k) => k.startsWith("dues."));
    if (duesKeys.length > 0) {
      await audit({
        action: "DUES_SETTINGS_CHANGED",
        subjectType: "Settings",
        subjectId: null,
        subjectName: duesKeys.length === 1 ? duesKeys[0] : `${duesKeys.length} dues keys`,
        details: duesKeys.join(", "),
        req,
      });
    }
    await audit({
      action: "SETTINGS_UPDATED",
      subjectType: "Settings",
      subjectId: null,
      subjectName: changedKeys.length === 1 ? changedKeys[0] : `${changedKeys.length} keys`,
      details: changedKeys.length <= 5
        ? changedKeys.join(", ")
        : `${changedKeys.slice(0, 5).join(", ")} +${changedKeys.length - 5} more`,
      req,
    });
  }
  return NextResponse.json({ ok: true });
}

function scrubAdminValue(key: string, raw: string): string {
  let s = String(raw);
  // Normalize smart quotes that auto-replace converters slip in
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // Strip trailing backslash + ellipsis + repeated trailing dots — but only on
  // url/email/handle keys, where this kind of trail is always pollution.
  const isUrlish = /Url$|email$|Email$|handle$|hotline|cta\.href|maps|advisorEmail|rushEmail/i.test(key)
    || /^contact\.|^antiHazing\.hotline/.test(key)
    || /^https?:\/\//i.test(s.trim());
  if (isUrlish) {
    s = s.trim();
    while (s.length > 0) {
      const last = s[s.length - 1];
      if (last === "\\" || last === "…" || last === " " || last === "\n" || last === "\r" || last === "\t") {
        s = s.slice(0, -1);
        continue;
      }
      if (last === "." && s.length >= 2 && s[s.length - 2] === ".") {
        s = s.slice(0, -1);
        continue;
      }
      break;
    }
  }
  return s;
}
