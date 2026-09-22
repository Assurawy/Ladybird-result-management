import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({ teacherId: z.string(), subjectId: z.string(), classArmId: z.string(), sessionId: z.string(), termId: z.string() });

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const termId = searchParams.get("termId") ?? undefined;
  const items = await prisma.teacherAssignment.findMany({
    where: { sessionId, termId, active: true },
    include: { teacher: { select: { id: true, name: true } }, subject: true, classArm: true },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.teacherAssignment.upsert({
    where: { teacherId_subjectId_classArmId_sessionId_termId: parsed.data },
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
  await prisma.teacherAssignment.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
