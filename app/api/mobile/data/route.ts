import { NextResponse } from "next/server";
import { getTenantClient, centralDb } from "@/lib/prisma";
import { htmlToPlainText } from "@/lib/rich-text";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { loadMemberStanding } from "@/lib/points-server";
import { getEntitlement } from "@/lib/entitlement";
import { mobileCorsHeaders, mobilePreflightResponse } from "@/lib/mobile-cors";
import { computeMemberCapabilities } from "@/lib/member-capabilities";
import { officerToolset } from "@/lib/officer-tools";
import { currentPeriod } from "@/lib/treasury";
import { buildMobileElectionView } from "@/lib/mobile-elections";
import {
  isConnectChargesReady,
  CONNECT_ACCOUNT_KEY,
  CONNECT_CHARGES_KEY,
} from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

// Validate a stored brand color before it leaves the API: ONLY a canonical
// `#RRGGBB` (case-insensitive) value passes; anything else (empty, named color,
// malformed, or a CSS-injection attempt) returns null so the bundled shell can
// safely interpolate it straight into a CSS custom property.
function sanitizeHex(value: string | null | undefined): string | null {
  const v = (value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
}

// CORS preflight — the bundled app's GET carries an Authorization header, which
// makes the WebView fire an OPTIONS preflight. No-op allow header for non-native
// origins (the web app is same-origin and never preflights).
export function OPTIONS(req: Request) {
  return mobilePreflightResponse(req.headers.get("origin"));
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const headers = mobileCorsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export async function GET(req: Request) {
  return withCors(req, await handleGet(req));
}

async function handleGet(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const subdomain = (searchParams.get("subdomain") || req.headers.get("x-subdomain") || "").trim().toLowerCase();

  if (!subdomain) {
    return NextResponse.json({ error: "Chapter subdomain is required." }, { status: 400 });
  }

  // 1. Verify tenant in central database
  const tenant = await centralDb.tenant.findUnique({
    where: { subdomain },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }

  if (!tenant.isActive) {
    return NextResponse.json({ error: "This chapter is inactive." }, { status: 403 });
  }

  // 2. Extract and verify portal token
  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";

  if (!token) {
    return NextResponse.json({ error: "Authentication token is required." }, { status: 401 });
  }

  // Tenant-bound verification: the token only verifies for the chapter it was
  // minted for, so a chapter-A token can never read chapter B's data.
  const sess = verifyPortalTokenForTenant(token, subdomain);
  if (!sess) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  // 3. Resolve tenant DB client and fetch user record
  const db = getTenantClient(subdomain);
  const portalUser = await db.portalUser.findUnique({
    where: { id: sess.userId },
  });

  if (!portalUser) {
    return NextResponse.json({ error: "User not found in this chapter." }, { status: 404 });
  }

  try {
    // 4. Fetch role-specific profile data
    let profile: any = null;
    let standing: any = null;
    let dues: any = null;
    // The member's REAL, admin-controlled chapter position (officer seat or
    // null). Captured from the verified brother row below and fed into the
    // SERVER-SIDE capability computation — the client never decides this.
    let memberPosition: string | null = null;

    // CHAPTER FEATURE FLAG — dues enabled? Read ONCE, chapter-wide (not member-
    // scoped) and BEFORE the role branch so it gates BOTH the dues payload and
    // the returned capability flag. When a chapter has not enabled online dues,
    // the API serves NO dues data at all (the surface is hidden client-side AND
    // the data is withheld here) — defense in depth, not UI-only hiding.
    let duesEnabled = false;
    try {
      const duesEnabledCfg = await db.siteConfig.findUnique({
        where: { key: "dues.enabled" },
      });
      duesEnabled = duesEnabledCfg?.value === "true";
    } catch {
      // Defensive: a flag-read hiccup defaults to DISABLED (fail-closed for the
      // dues surface — never expose dues data on an ambiguous flag read).
      duesEnabled = false;
    }

    if (sess.role === "brother") {
      if (portalUser.brotherId) {
        const brother = await db.brother.findUnique({
          where: { id: portalUser.brotherId },
          include: {
            bigBrother: { select: { id: true, name: true, email: true, phone: true } },
            littles: { select: { id: true, name: true, email: true, phone: true } },
          },
        });

        if (brother) {
          // Server-trusted officer seat for the capability gate below. This is
          // the admin-set DB value — a member cannot edit their own position.
          memberPosition = brother.position ?? null;
          profile = {
            id: brother.id,
            name: brother.name,
            email: brother.email,
            phone: brother.phone,
            year: brother.year,
            major: brother.major,
            position: brother.position,
            pledgeClass: brother.pledgeClass,
            hometown: brother.hometown,
            gradYear: brother.gradYear,
            bio: brother.bio,
            headshotUrl: brother.headshotUrl,
            status: brother.status,
            duesPaid: brother.duesPaid,
          };

          // Fetch member standing score card
          try {
            const standingResult = await loadMemberStanding(brother.id);
            if (standingResult) {
              standing = {
                score: standingResult.result.score,
                max: standingResult.result.max,
                pct: standingResult.result.pct,
                standing: standingResult.result.standing,
                breakdown: standingResult.result.breakdown,
              };
            }
          } catch (e) {
            console.error("Failed to load standing in mobile endpoint:", e);
          }

          // Dues ledger & configuration — SERVED ONLY when the chapter has
          // enabled online dues. When disabled, `dues` stays null so the API
          // never ships dues config/amounts/payment history for a chapter that
          // turned the feature off; the client hides the Dues surface to match.
          if (duesEnabled) {
            const duesConfigs = await db.siteConfig.findMany({
              where: {
                key: {
                  in: [
                    "dues.amountCents",
                    "dues.year",
                    "dues.label",
                    "dues.stripePublishableKey",
                  ],
                },
              },
            });

            const duesConfig = {
              enabled: true,
              amountCents: parseInt(duesConfigs.find((c) => c.key === "dues.amountCents")?.value || "0", 10),
              year: duesConfigs.find((c) => c.key === "dues.year")?.value || "",
              label: duesConfigs.find((c) => c.key === "dues.label")?.value || "Active Dues",
              stripePublishableKey: duesConfigs.find((c) => c.key === "dues.stripePublishableKey")?.value || "",
            };

            const payments = await db.duesPayment.findMany({
              where: { brotherId: brother.id },
              orderBy: { createdAt: "desc" },
            });

            dues = {
              config: duesConfig,
              payments: payments.map((p) => ({
                id: p.id,
                amountCents: p.amountCents,
                year: p.year,
                status: p.status,
                method: p.method,
                receiptUrl: p.receiptUrl,
                notes: p.notes,
                createdAt: p.createdAt.toISOString(),
              })),
              isPaid: brother.duesPaid,
            };
          }
        }
      }
    } else if (sess.role === "alumni") {
      if (portalUser.alumniId) {
        const alum = await db.alumniProfile.findUnique({
          where: { id: portalUser.alumniId },
          include: {
            donations: { orderBy: { recordedAt: "desc" } },
          },
        });

        if (alum) {
          profile = {
            id: alum.id,
            name: alum.fullName,
            email: alum.email,
            phone: alum.phone,
            graduationYear: alum.graduationYear,
            pledgeClass: alum.pledgeClass,
            initiationYear: alum.initiationYear,
            city: alum.city,
            state: alum.state,
            employer: alum.employer,
            jobTitle: alum.jobTitle,
            linkedinUrl: alum.linkedinUrl,
            bio: alum.bio,
          };

          // DONATE GATE (money integrity) — the alumni Donate action is offered
          // ONLY when the chapter has a connected, charges-ready Stripe account
          // (isConnectChargesReady), EXACTLY as the web alumni dashboard gates it
          // (app/portal/alumni/dashboard/page.tsx). Otherwise the app shows the
          // donation HISTORY but NO Donate button — and the checkout route ALSO
          // re-enforces the same gate server-side, so a tampered client gains
          // nothing. Fail-closed on a config read hiccup.
          let donateEnabled = false;
          try {
            const connectCfgs = await db.siteConfig.findMany({
              where: { key: { in: [CONNECT_ACCOUNT_KEY, CONNECT_CHARGES_KEY] } },
            });
            const connectCfg: Record<string, string> = {};
            for (const c of connectCfgs) connectCfg[c.key] = c.value;
            donateEnabled = isConnectChargesReady(connectCfg);
          } catch {
            donateEnabled = false;
          }

          dues = {
            donateEnabled,
            donations: alum.donations.map((d) => ({
              id: d.id,
              amountCents: d.amountCents,
              campaign: d.campaign,
              status: d.status,
              recordedAt: d.recordedAt.toISOString(),
              notes: d.notes,
            })),
          };
        }
      }
    }

    // 4b. CHAPTER BRAND (non-sensitive) — the admin-editable royal-blue/gold-or-
    //     school-color the web app already themes with (SiteConfig brand.*Hex).
    //     The bundled iOS shell uses this to seed --brand/--brand2 from the
    //     chapter's REAL configured color instead of a deterministic 7-color hash,
    //     so a chapter that set #500000 (Texas A&M maroon) themes maroon — and an
    //     unconfigured tenant falls back to the GS royal-blue default below.
    //     Read for ALL roles (brand is chapter-wide, not member-scoped). Hex is
    //     validated so a malformed config value can never inject CSS at the shell.
    let brand: { primaryHex: string | null; primaryDarkHex: string | null } | null = null;
    try {
      const brandCfgs = await db.siteConfig.findMany({
        where: { key: { in: ["brand.primaryHex", "brand.primaryDarkHex"] } },
      });
      const primaryHex = sanitizeHex(brandCfgs.find((c) => c.key === "brand.primaryHex")?.value);
      const primaryDarkHex = sanitizeHex(brandCfgs.find((c) => c.key === "brand.primaryDarkHex")?.value);
      brand = primaryHex || primaryDarkHex ? { primaryHex, primaryDarkHex } : null;
    } catch {
      // Defensive: a brand-config read hiccup must not affect the data payload;
      // the shell falls back to the GS royal-blue + gold default.
      brand = null;
    }

    // 5. Fetch announcements feed
    const announcements = await db.announcement.findMany({
      where: {
        audience: { in: sess.role === "brother" ? ["BROTHERS", "ALL"] : ["ALUMNI", "ALL"] },
        status: "sent",
      },
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" },
      ],
      take: 20,
      include: {
        author: { select: { name: true, position: true } },
      },
    });

    // 6. Fetch upcoming calendar events
    const events = await db.event.findMany({
      where: {
        startsAt: { gte: new Date() },
        audience: sess.role === "alumni" ? { in: ["ALL", "ALUMNI"] } : undefined,
      },
      orderBy: { startsAt: "asc" },
      ...(portalUser.brotherId ? {
        include: {
          rsvps: {
            where: { brotherId: portalUser.brotherId },
            select: { status: true, note: true },
          },
        },
      } : {}),
    });

    // 7. Fetch full searchable roster data (both undergraduate active roster & opted-in alumni network)
    const activeRoster = await db.brother.findMany({
      where: {
        status: { in: ["ACTIVE", "INITIATE", "PLEDGE"] },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        year: true,
        major: true,
        position: true,
        pledgeClass: true,
        headshotUrl: true,
        status: true,
      },
    });

    // PII scoping: active brothers legitimately share contact info with EACH
    // OTHER, but an ALUMNI-token holder should not receive every active member's
    // email + phone (alumni opt into their OWN directory exposure, but actives
    // never consented to broadcast contact details to the alumni network). So we
    // strip email/phone from the actives projection for alumni callers. Brothers
    // see the full roster as before. (The alumni roster below is already gated on
    // each alum's own optInDirectory flag.)
    const scopedActiveRoster =
      sess.role === "alumni"
        ? activeRoster.map(({ email: _e, phone: _p, ...rest }) => rest)
        : activeRoster;

    // PII scoping: an alum's optInDirectory flag opts them into a DIRECTORY
    // LISTING (name / grad year / employer / city), NOT into broadcasting their
    // email + phone to the whole chapter app. The documented contract
    // (lib/alumni.publicAlumniView + the public /api/alumni-directory route) is
    // that the directory view STRIPS email/phone. This mobile payload must match
    // that contract — so we deliberately omit email/phone from the projection
    // (the actives roster above is similarly minimized for alumni callers).
    const alumniRoster = await db.alumniProfile.findMany({
      where: { optInDirectory: true },
      orderBy: { graduationYear: "desc" },
      select: {
        id: true,
        fullName: true,
        preferredName: true,
        graduationYear: true,
        pledgeClass: true,
        city: true,
        state: true,
        employer: true,
        jobTitle: true,
        linkedinUrl: true,
        bio: true,
      },
    });

    // 8. Fetch Career Opportunities / Job Postings
    const jobPostings = await db.jobPosting.findMany({
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    // 9. PLATFORM-BILLING ENTITLEMENT (advisory only — never hard-blocks).
    //    Mirror the web admin's soft-gate so the mobile dashboard can show the
    //    SAME advisory billing banner ("Trial ends in N days", "Payment past
    //    due", …). getEntitlement is fail-open and never throws; we still wrap it
    //    so a billing read can never break the member's data load. We surface the
    //    machine-readable `reason` + status/daysLeft and NEVER the entitled=false
    //    case as a block — the member always gets their chapter (preserve
    //    fail-open). Only the operator's hard `isActive` switch takes a chapter
    //    offline, and that is already enforced above (403 on !tenant.isActive).
    let billing: {
      reason: string;
      status: string | null;
      daysLeft: number | null;
      plan: string | null;
    } | null = null;
    try {
      const ent = await getEntitlement(subdomain);
      billing = {
        reason: ent.reason,
        status: ent.status,
        daysLeft: ent.daysLeft,
        plan: ent.plan,
      };
    } catch {
      // Defensive: a billing-read hiccup must not affect the dashboard payload.
      billing = null;
    }

    // 10. EXEC-ONLY payload (treasury summary + PNM/rush list). Computed from
    //     the SAME server-side capability the client uses — recomputed here from
    //     the verified session role + the member's REAL admin-set position. A
    //     non-officer (or alumni token) gets exec=false, so this whole block is
    //     SKIPPED and the data is WITHHELD from the payload (defense in depth:
    //     the surface is hidden client-side AND never serialized here). Officers
    //     get a lightweight treasury rollup + the current rush pipeline.
    const caps = computeMemberCapabilities(sess.role, memberPosition, duesEnabled);
    // POSITION-SPECIFIC officer tool page (item-1 RBAC core). Only an exec-cleared
    // session gets a toolset; it is computed server-side from the member's REAL
    // admin-set position so the client renders the correct role LABEL
    // ("President Tools", "Risk Management Tools", …) and ONLY the tools that
    // position's permissions grant. A non-officer gets null → no officer surface.
    const officerTools = caps.exec ? officerToolset(memberPosition) : null;
    let treasury:
      | {
          period: string;
          budgetedCents: number;
          actualCents: number;
          remainingCents: number;
          lineCount: number;
          pendingExpenses: number;
          pendingExpenseCents: number;
        }
      | null = null;
    let pnms:
      | Array<{
          id: string;
          name: string;
          status: string;
          year: string | null;
          major: string | null;
          createdAt: string;
        }>
      | null = null;
    let positionInterests:
      | Array<{
          id: string;
          brotherName: string;
          positionTitle: string;
          message: string | null;
          createdAt: string;
        }>
      | null = null;

    if (caps.exec) {
      try {
        // Treasury rollup over the CURRENT term's budget lines + pending expenses.
        const period = currentPeriod();
        const [budgetLines, pendingExp] = await Promise.all([
          db.budgetLine.findMany({
            where: { period },
            select: { budgetedCents: true, actualCents: true },
          }),
          db.expense.findMany({
            where: { status: "PENDING" },
            select: { amountCents: true },
          }),
        ]);
        const budgetedCents = budgetLines.reduce((s, l) => s + (l.budgetedCents || 0), 0);
        const actualCents = budgetLines.reduce((s, l) => s + (l.actualCents || 0), 0);
        const pendingExpenseCents = pendingExp.reduce((s, e) => s + (e.amountCents || 0), 0);
        treasury = {
          period,
          budgetedCents,
          actualCents,
          remainingCents: budgetedCents - actualCents,
          lineCount: budgetLines.length,
          pendingExpenses: pendingExp.length,
          pendingExpenseCents,
        };
      } catch (e) {
        console.error("Failed to load treasury summary (exec):", e);
        treasury = null;
      }

      try {
        // Position-interest inbox (item 3): brothers who expressed interest in a
        // role THIS officer's position covers, so the current holder can mentor
        // them. We match the interest's role to the officer's own role (the
        // President — super-admin — sees them all). Best-effort; a miss never
        // breaks the load. The client renders this in the officer's tools.
        const myRole = officerTools?.roleKey ?? null;
        const isPresidentLike = officerTools?.tools.some((t) => t.id === "settings") ?? false;
        const openInterests = await db.positionInterest.findMany({
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: { id: true, brotherName: true, positionSlug: true, positionTitle: true, message: true, createdAt: true },
        });
        positionInterests = openInterests
          // Match on the NORMALIZED positionSlug, not the free-text positionTitle,
          // so a title typo can't route an interest away from the sitting holder.
          .filter((pi) => isPresidentLike || (myRole && officerToolset(pi.positionSlug).roleKey === myRole))
          .map((pi) => ({
            id: pi.id,
            brotherName: pi.brotherName,
            positionTitle: pi.positionTitle,
            message: pi.message,
            createdAt: pi.createdAt.toISOString(),
          }));
      } catch (e) {
        console.error("Failed to load position interests (exec):", e);
        positionInterests = null;
      }

      try {
        // Active rush pipeline (PNMs) — officers manage this from the app. Only
        // non-terminal statuses are surfaced; contact details stay minimal.
        const rushees = await db.rush.findMany({
          where: { status: { notIn: ["REJECTED", "DECLINED", "WITHDRAWN"] } },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, name: true, status: true, year: true, major: true, createdAt: true },
        });
        pnms = rushees.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          year: r.year,
          major: r.major,
          createdAt: r.createdAt.toISOString(),
        }));
      } catch (e) {
        console.error("Failed to load PNM list (exec):", e);
        pnms = null;
      }
    }

    // 11. MEMBER-FACING OPEN ELECTION (the Vote/Elections spotlight). Returns
    //     the single currently-OPEN election scoped to this member's audience +
    //     the member's OWN already-cast ballots, or null when nothing is open
    //     (the client then renders an explicit "No open elections" empty state —
    //     never a blank, data-less surface). Secret ballot: aggregate per-
    //     candidate counts only; the caller's own choices are returned only to
    //     them. Best-effort — an election-read hiccup must not break the load.
    let election: Awaited<ReturnType<typeof buildMobileElectionView>>["election"] = null;
    let myBallot: Record<string, string> = {};
    try {
      const view = await buildMobileElectionView(db, portalUser.brotherId ?? null, sess.role);
      election = view.election;
      myBallot = view.myBallot;
    } catch (e) {
      console.error("Failed to load open election (mobile):", e);
      election = null;
      myBallot = {};
    }

    return NextResponse.json({
      ok: true,
      chapter: {
        subdomain,
        name: tenant.name || subdomain,
        schoolName: tenant.school || "",
        // Chapter's REAL configured brand color (validated #RRGGBB or null).
        // The bundled iOS shell seeds --brand/--brand2 from this; null → the
        // shell keeps its GS royal-blue + gold default (no random hash).
        brand,
      },
      // Advisory platform-billing state for the member-facing banner. Always
      // advisory — the dashboard NEVER hard-blocks on this (fail-open).
      billing,
      // SERVER-ENFORCED capability flags (market-critical RBAC). Computed from
      // the verified session role + the member's REAL admin-set Brother.position
      // + the chapter's dues flag — never from anything the client sends. A
      // regular member gets `exec:false`, so the client must not (and the data
      // layer does not) surface exec-only tools/data to them. `duesEnabled`
      // mirrors the flag the dues payload above was gated on.
      capabilities: { ...caps, officerTools },
      // EXEC-ONLY data — present ONLY when capabilities.exec is true (see the
      // gated block above). For a non-officer these are simply absent from the
      // payload (null), so the data never leaves the server for them.
      treasury,
      pnms,
      // Item 3: brothers who expressed interest in a role this officer holds, so
      // the current holder can reach out + mentor. Null for non-officers.
      positionInterests,
      role: sess.role,
      profile,
      standing,
      dues,
      // Member-facing open election + this member's own cast ballots (null when
      // none open). Drives the Vote/Elections spotlight with REAL data.
      election,
      myBallot,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        // Native app renders plain text — downgrade any rich (HTML) body.
        body: htmlToPlainText(a.body),
        pinned: a.pinned,
        createdAt: a.createdAt.toISOString(),
        authorName: a.author?.name || "System",
        authorRole: a.author?.position || "Officer",
      })),
      events: events.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        location: e.location,
        dressCode: e.dressCode,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt?.toISOString() || null,
        category: e.category,
        myRsvp: (e as any).rsvps?.[0] || null,
      })),
      roster: {
        actives: scopedActiveRoster,
        alumni: alumniRoster.map((al) => ({
          id: al.id,
          name: al.fullName,
          preferredName: al.preferredName,
          graduationYear: al.graduationYear,
          pledgeClass: al.pledgeClass,
          // email/phone intentionally omitted — the alumni directory contract
          // exposes a LISTING (name/employer/city), not contact broadcast.
          city: al.city,
          state: al.state,
          employer: al.employer,
          jobTitle: al.jobTitle,
          linkedinUrl: al.linkedinUrl,
          bio: al.bio,
        })),
      },
      careers: jobPostings.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        description: j.description,
        requirements: j.requirements,
        salary: j.salary,
        contactName: j.contactName,
        contactEmail: j.contactEmail,
        contactPhone: j.contactPhone,
        postedByName: j.postedByName,
        postedByRole: j.postedByRole,
        createdAt: j.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("Error fetching mobile portal data:", err);
    return NextResponse.json({ error: "Unable to load your chapter data right now." }, { status: 500 });
  }
}
