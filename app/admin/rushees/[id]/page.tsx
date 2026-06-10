// /admin/rushees/[id] — single-PNM profile (rush-cycle feature 1, detail).
//
// Server-renders the PNM record + its related rows (votes, attendances,
// impressions) in one query, then hands off to the client component for the
// interactive bits (impression form, action buttons, optimistic UI).
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RusheeDetail, type RusheeDetailData } from "@/components/admin/rushee-detail";

export const dynamic = "force-dynamic";

export default async function RusheeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let rush: any = null;
  try {
    rush = await prisma.rush.findUnique({
      where: { id: params.id },
      include: {
        votes: {
          orderBy: { createdAt: "desc" },
          include: { brother: { select: { name: true } } },
        },
        attendances: {
          include: {
            event: {
              select: { id: true, name: true, startsAt: true, category: true },
            },
          },
        },
        impressions: { orderBy: { createdAt: "desc" } },
      },
    });
  } catch (err) {
    console.error("[/admin/rushees/[id]] load failed:", err);
  }
  if (!rush) notFound();

  const data: RusheeDetailData = {
    id: rush.id,
    name: rush.name,
    email: rush.email,
    phone: rush.phone,
    year: rush.year,
    major: rush.major,
    hometown: rush.hometown,
    highSchoolInfo: rush.highSchoolInfo,
    backgroundInfo: rush.backgroundInfo,
    headshotUrl: rush.headshotUrl,
    status: rush.status,
    notes: rush.notes,
    createdAt: rush.createdAt.toISOString(),
    bidToken: rush.bidToken,
    bidTokenExpiresAt: rush.bidTokenExpiresAt ? rush.bidTokenExpiresAt.toISOString() : null,
    bidRespondedAt: rush.bidRespondedAt ? rush.bidRespondedAt.toISOString() : null,
    bidResponseChoice: rush.bidResponseChoice,
    votes: rush.votes.map((v: any) => ({
      id: v.id,
      value: v.value,
      comment: v.comment,
      createdAt: v.createdAt.toISOString(),
      brother: { name: v.brother.name },
    })),
    attendances: rush.attendances.map((a: any) => ({
      id: a.id,
      attended: a.attended,
      createdAt: a.createdAt.toISOString(),
      event: {
        id: a.event.id,
        name: a.event.name,
        category: a.event.category,
        startsAt: a.event.startsAt.toISOString(),
      },
    })),
    impressions: rush.impressions.map((i: any) => ({
      id: i.id,
      authorName: i.authorName,
      tone: i.tone,
      note: i.note,
      createdAt: i.createdAt.toISOString(),
    })),
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://greekstack.vercel.app";

  return <RusheeDetail initial={data} siteUrl={siteUrl} />;
}
