import { NextResponse } from "next/server";
import { getTenantClient, centralDb } from "@/lib/prisma";
import { verifyPortalTokenForTenant } from "@/lib/portal-auth";
import { loadMemberStanding } from "@/lib/points-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

          // Dues ledger & configuration
          const duesConfigs = await db.siteConfig.findMany({
            where: {
              key: {
                in: [
                  "dues.enabled",
                  "dues.amountCents",
                  "dues.year",
                  "dues.label",
                  "dues.stripePublishableKey",
                ],
              },
            },
          });

          const duesConfig = {
            enabled: duesConfigs.find((c) => c.key === "dues.enabled")?.value === "true",
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

          dues = {
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

    const alumniRoster = await db.alumniProfile.findMany({
      where: { optInDirectory: true },
      orderBy: { graduationYear: "desc" },
      select: {
        id: true,
        fullName: true,
        preferredName: true,
        graduationYear: true,
        pledgeClass: true,
        email: true,
        phone: true,
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

    return NextResponse.json({
      ok: true,
      chapter: {
        subdomain,
        name: tenant.name || subdomain,
        schoolName: tenant.school || "",
      },
      role: sess.role,
      profile,
      standing,
      dues,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
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
          email: al.email,
          phone: al.phone,
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
