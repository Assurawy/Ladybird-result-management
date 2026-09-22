import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canReopen } from "@/lib/permissions";
import { subjectsForClassArm } from "@/lib/overview";

const schema = z.object({
  classArmId: z.string(),
  sessionId: z.string(),
  termId: z.string(),
  reason: z.string().min(1, "A reason is required to reopen results."),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canReopen(session.role)) {
    return NextResponse.json({ error: "Only Admin/Super Admin can reopen published results." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const existing = await prisma.classApproval.findUnique({
    where: { classArmId_sessionId_termId: { classArmId: d.classArmId, sessionId: d.sessionId, termId: d.termId } },
  });
  if (!existing || (existing.status !== "PUBLISHED" && existing.status !== "LOCKED")) {
    return NextResponse.json({ error: "Only published/locked results can be reopened." }, { status: 409 });
  }

  const subjects = await subjectsForClassArm(d.classArmId);
  const publishedSubjectRows = await prisma.subjectResultStatus.findMany({
    where: { classArmId: d.classArmId, sessionId: d.sessionId, termId: d.termId, status: "PUBLISHED", subjectId: { in: subjects.map((s) => s.id) } },
  });

  await prisma.$transaction([
    prisma.classApproval.update({
      where: { classArmId_sessionId_termId: { classArmId: d.classArmId, sessionId: d.sessionId, termId: d.termId } },
      data: {
        status: "FORM_APPROVED",
        reopenedById: session.id,
        reopenedAt: new Date(),
        reopenReason: d.reason,
        previousStatus: existing.status,
      },
    }),
    ...publishedSubjectRows.map((s) => prisma.subjectResultStatus.update({ where: { id: s.id }, data: { status: "ADMIN_REVIEW" } })),
    prisma.auditLog.create({
      data: {
        userId: session.id,
        userName: session.name,
        role: session.role,
        action: "REOPEN_RESULT",
        details: `class=${d.classArmId} — reason: ${d.reason}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
