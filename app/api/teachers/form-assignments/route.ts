import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({ teacherId: z.string(), classArmId: z.string(), sessionId: z.string() });

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const items = await prisma.formTeacherAssignment.findMany({
    where: { sessionId, active: true },
    include: { teacher: { select: { id: true, name: true } }, classArm: true },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // A class-arm has exactly one active Form Teacher — deactivate any existing one first.
  await prisma.formTeacherAssignment.updateMany({
    where: { classArmId: parsed.data.classArmId, sessionId: parsed.data.sessionId, active: true },
    data: { active: false },
  });

  const item = await prisma.formTeacherAssignment.upsert({
    where: { teacherId_classArmId_sessionId: parsed.data },
    create: { ...parsed.data, active: true },
    update: { active: true },
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  await prisma.formTeacherAssignment.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
