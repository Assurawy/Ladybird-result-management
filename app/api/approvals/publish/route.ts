import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canPublish } from "@/lib/permissions";
import { subjectsForClassArm } from "@/lib/overview";

const schema = z.object({
  classArmIds: z.array(z.string()).min(1),
  sessionId: z.string(),
  termId: z.string(),
});

async function publishOne(classArmId: string, sessionId: string, termId: string, userId: string) {
  const subjects = await subjectsForClassArm(classArmId);
  const statusRows = await prisma.subjectResultStatus.findMany({
    where: { classArmId, sessionId, termId, status: "ADMIN_REVIEW", subjectId: { in: subjects.map((s) => s.id) } },
  });

  await prisma.$transaction([
    prisma.classApproval.upsert({
      where: { classArmId_sessionId_termId: { classArmId, sessionId, termId } },
      create: { classArmId, sessionId, termId, status: "PUBLISHED", publishedById: userId, publishedAt: new Date() },
      update: { status: "PUBLISHED", publishedById: userId, publishedAt: new Date() },
    }),
    ...statusRows.map((s) => prisma.subjectResultStatus.update({ where: { id: s.id }, data: { status: "PUBLISHED" } })),
  ]);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canPublish(session.role)) {
    return NextResponse.json({ error: "Only Admin/Principal/Super Admin can publish results." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  // Only classes actually FORM_APPROVED are eligible — silently skip the rest
  // rather than error, so "Publish All Eligible" style calls are idempotent.
  const eligible = await prisma.classApproval.findMany({
    where: { classArmId: { in: d.classArmIds }, sessionId: d.sessionId, termId: d.termId, status: "FORM_APPROVED" },
  });
  if (eligible.length === 0) {
    return NextResponse.json({ error: "None of the selected classes are currently ready to publish." }, { status: 409 });
  }

  for (const e of eligible) {
    await publishOne(e.classArmId, d.sessionId, d.termId, session.id);
  }

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      userName: session.name,
      role: session.role,
      action: "PUBLISH_RESULT",
      details: `${eligible.length} class(es): ${eligible.map((e) => e.classArmId).join(", ")}`,
    },
  });

  return NextResponse.json({ ok: true, published: eligible.length });
}
