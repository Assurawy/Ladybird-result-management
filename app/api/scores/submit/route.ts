import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertCanEnterScores } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/auth";

const schema = z.object({
  subjectId: z.string(),
  classArmId: z.string(),
  sessionId: z.string(),
  termId: z.string(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  try {
    await assertCanEnterScores(session, d.subjectId, d.classArmId, d.sessionId, d.termId);
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const existing = await prisma.subjectResultStatus.findUnique({
    where: {
      classArmId_subjectId_sessionId_termId: {
        classArmId: d.classArmId,
        subjectId: d.subjectId,
        sessionId: d.sessionId,
        termId: d.termId,
      },
    },
  });
  if (existing?.status === "PUBLISHED" || existing?.status === "LOCKED") {
    return NextResponse.json({ error: "Results have already been published — can't resubmit." }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.subjectResultStatus.upsert({
      where: {
        classArmId_subjectId_sessionId_termId: {
          classArmId: d.classArmId,
          subjectId: d.subjectId,
          sessionId: d.sessionId,
          termId: d.termId,
        },
      },
      create: { ...d, status: "SUBMITTED" },
      update: { status: "SUBMITTED" },
    }),
    prisma.auditLog.create({
      data: {
        userId: session.id,
        userName: session.name,
        role: session.role,
        action: "SUBMIT_RESULT",
        details: `subject=${d.subjectId} classArm=${d.classArmId}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
