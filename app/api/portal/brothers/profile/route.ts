import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentBrother } from "@/lib/auth";
import { sanitizeRichText, isRichTextEmpty } from "@/lib/rich-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  year: z.string().optional().or(z.literal("")),
  major: z.string().optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  headshotUrl: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(req: Request) {
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

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input data", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // If email is changing, verify uniqueness in both Brother and PortalUser
  if (data.email && data.email.toLowerCase().trim() !== brother.email?.toLowerCase()) {
    const targetEmail = data.email.toLowerCase().trim();
    
    const duplicateBrother = await prisma.brother.findFirst({
      where: {
        email: { equals: targetEmail, mode: "insensitive" },
        id: { not: brother.id },
      },
    });

    const duplicatePortal = await prisma.portalUser.findFirst({
      where: {
        email: targetEmail,
        brotherId: { not: brother.id },
      },
    });

    if (duplicateBrother || duplicatePortal) {
      return NextResponse.json(
        { error: "This email address is already in use by another member." },
        { status: 400 }
      );
    }

    // Update PortalUser email if it exists
    await prisma.portalUser.updateMany({
      where: { brotherId: brother.id },
      data: { email: targetEmail },
    });
  }

  // Update Brother row
  const updatedBrother = await prisma.brother.update({
    where: { id: brother.id },
    data: {
      email: data.email || null,
      phone: data.phone || null,
      year: data.year || null,
      major: data.major || null,
      // Rich-text bio: sanitize the (Tiptap) HTML server-side before storing; an
      // empty rich doc (Tiptap emits "<p></p>") collapses to null, not markup.
      bio: isRichTextEmpty(data.bio) ? null : sanitizeRichText(data.bio),
      headshotUrl: data.headshotUrl || null,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, brother: updatedBrother });
}
