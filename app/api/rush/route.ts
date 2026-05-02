import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const RushSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().min(7).max(40),
  hometown: z.string().max(120).optional().or(z.literal("")),
  major: z.string().max(120).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  highSchoolInfo: z.string().max(2000).optional().or(z.literal("")),
  backgroundInfo: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RushSchema.parse(body);
    const data = {
      ...parsed,
      email: parsed.email.trim().toLowerCase(),
      name: parsed.name.trim(),
      phone: parsed.phone.trim(),
    };

    const existing = await prisma.rush.findUnique({ where: { email: data.email } });
    if (existing) {
      // Update if they're re-submitting
      const updated = await prisma.rush.update({
        where: { email: data.email },
        data: {
          name: data.name,
          phone: data.phone,
          hometown: data.hometown || null,
          major: data.major || null,
          year: data.year || null,
          highSchoolInfo: data.highSchoolInfo || null,
          backgroundInfo: data.backgroundInfo || null,
        },
      });
      return NextResponse.json({ ok: true, id: updated.id, updated: true });
    }

    const created = await prisma.rush.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        hometown: data.hometown || null,
        major: data.major || null,
        year: data.year || null,
        highSchoolInfo: data.highSchoolInfo || null,
        backgroundInfo: data.backgroundInfo || null,
      },
    });

    return NextResponse.json({ ok: true, id: created.id, updated: false });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[/api/rush]", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // public count for the landing page social proof
  const count = await prisma.rush.count();
  return NextResponse.json({ count });
}
