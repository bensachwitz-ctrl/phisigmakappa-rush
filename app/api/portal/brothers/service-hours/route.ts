import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateLogSchema = z.object({
  description: z.string().min(3).max(500),
  hoursLogged: z.number().min(0.1).max(100),
  performedAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  serviceEventId: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const logs = await prisma.serviceHourLog.findMany({
    where: { memberId: brother.id },
    orderBy: { performedAt: "desc" },
    include: {
      serviceEvent: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, logs });
}

export async function POST(req: Request) {
  const brother = await getCurrentBrother();
  if (!brother) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input data", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verify service event if provided
  if (data.serviceEventId) {
    const event = await prisma.serviceEvent.findUnique({
      where: { id: data.serviceEventId },
    });
    if (!event) {
      return NextResponse.json({ error: "Service event not found" }, { status: 404 });
    }
  }

  const log = await prisma.serviceHourLog.create({
    data: {
      memberId: brother.id,
      description: data.description,
      hoursLogged: data.hoursLogged,
      performedAt: new Date(data.performedAt),
      serviceEventId: data.serviceEventId || null,
      status: "submitted",
    },
  });

  // Calculate new total approved hours for the brother to update their cache
  // This is optional but keeps the Brother.serviceHours cached column aligned
  const approvedSum = await prisma.serviceHourLog.aggregate({
    where: {
      memberId: brother.id,
      status: "approved",
    },
    _sum: {
      hoursLogged: true,
    },
  });

  const totalApproved = approvedSum._sum.hoursLogged ? Number(approvedSum._sum.hoursLogged) : 0;

  await prisma.brother.update({
    where: { id: brother.id },
    data: {
      serviceHours: totalApproved,
    },
  });

  return NextResponse.json({ ok: true, log });
}
