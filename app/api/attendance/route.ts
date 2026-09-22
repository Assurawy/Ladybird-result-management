import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isFormTeacherOf } from "@/lib/permissions";

const schema = z.object({
  studentId: z.string(),
  classArmId: z.string(),
  sessionId: z.string(),
  termId: z.string(),
  totalDays: z.number().int().min(0),
  present: z.number().int().min(0),
  absent: z.number().int().min(0),
  late: z.number().int().min(0),
});

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { classArmId, ...rest } = parsed.data;

  const ok = await isFormTeacherOf(session, classArmId, rest.sessionId);
  if (!ok) return NextResponse.json({ error: "You are not the Form Teacher of this class." }, { status: 403 });

  const record = await prisma.attendance.upsert({
    where: { studentId_sessionId_termId: { studentId: rest.studentId, sessionId: rest.sessionId, termId: rest.termId } },
    create: rest,
    update: rest,
  });
  return NextResponse.json({ record });
}
