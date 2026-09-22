import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertIsFormTeacherOf } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/auth";

const schema = z.object({
  classArmId: z.string(),
  subjectId: z.string(),
  sessionId: z.string(),
  termId: z.string(),
  action: z.enum(["APPROVE", "RETURN"]),
  reason: z.string().optional(),
});

// Form Teacher (or whole-school role) approves or returns one submitted
// subject's results. Mirrors approveSubjectResult()/returnSubjectForCorrection().
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  try {
    await assertIsFormTeacherOf(session, d.classArmId, d.sessionId);
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const key = { classArmId: d.classArmId, subjectId: d.subjectId, sessionId: d.sessionId, termId: d.termId };
  const current = await prisma.subjectResultStatus.findUnique({
    where: { classArmId_subjectId_sessionId_termId: key },
  });
  if (current?.status !== "SUBMITTED") {
    return NextResponse.json({ error: "This subject's results are not currently awaiting review." }, { status: 409 });
  }

  const newStatus = d.action === "APPROVE" ? "APPROVED" : "RETURNED";

  await prisma.$transaction([
    prisma.subjectResultStatus.update({ where: { classArmId_subjectId_sessionId_termId: key }, data: { status: newStatus } }),
    prisma.auditLog.create({
      data: {
        userId: session.id,
        userName: session.name,
        role: session.role,
        action: d.action === "APPROVE" ? "APPROVE_SUBJECT_RESULT" : "RETURN_RESULT",
        details: `subject=${d.subjectId} classArm=${d.classArmId}` + (d.reason ? ` — reason: ${d.reason}` : ""),
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: newStatus });
}
