import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed, isAdminRole, getCurrentBrotherId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  year: z.string().max(40).optional().or(z.literal("")),
  major: z.string().max(120).optional().or(z.literal("")),
  position: z.string().max(120).optional().or(z.literal("")),
  pledgeClass: z.string().max(80).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  headshotUrl: z.string().url().max(2048).optional().or(z.literal("")),
  duesPaid: z.boolean().optional(),
  serviceHours: z.number().int().min(0).optional(),
  studyHours: z.number().int().min(0).optional(),
  role: z.enum(["MEMBER", "ADMIN"]).optional(),
});

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const brothers = await prisma.brother.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ brothers });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v])
  );
  try {
    const created = await prisma.brother.create({ data: data as any });
    return NextResponse.json({ ok: true, brother: created });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Name or email already exists" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  const PatchSchema = Schema.partial().extend({ id: z.string().min(1) });
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  const { id, ...rest } = parsed.data;
  // Non-admins can only edit their own profile.
  if (!isAdminRole()) {
    const me = getCurrentBrotherId();
    if (!me || me !== id) {
      return NextResponse.json({ ok: false, error: "You can only edit your own profile" }, { status: 403 });
    }
    // Members can't elevate their own role or edit dues/hours/role flags.
    delete (rest as any).role;
    delete (rest as any).duesPaid;
    delete (rest as any).serviceHours;
    delete (rest as any).studyHours;
  }
  const data = Object.fromEntries(
    Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v])
  );
  const updated = await prisma.brother.update({ where: { id }, data: data as any });
  return NextResponse.json({ ok: true, brother: updated });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isAdminRole()) return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.brother.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
