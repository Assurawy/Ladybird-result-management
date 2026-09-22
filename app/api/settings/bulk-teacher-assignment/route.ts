import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  teacherId: z.string(),
  sessionId: z.string(),
  termId: z.string(),
  pairs: z.array(z.object({ subjectId: z.string(), classArmId: z.string() })).min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { teacherId, sessionId, termId, pairs } = parsed.data;

  await prisma.$transaction(
    pairs.map((p) =>
      prisma.teacherAssignment.upsert({
        where: { teacherId_subjectId_classArmId_sessionId_termId: { teacherId, subjectId: p.subjectId, classArmId: p.classArmId, sessionId, termId } },
        create: { teacherId, subjectId: p.subjectId, classArmId: p.classArmId, sessionId, termId, active: true },
        update: { active: true },
      })
    )
  );

  await prisma.auditLog.create({
    data: { userId: session.id, userName: session.name, role: session.role, action: "BULK_ASSIGN_TEACHER", details: `teacher=${teacherId}, ${pairs.length} assignment(s)` },
  });

  return NextResponse.json({ ok: true, count: pairs.length });
}
