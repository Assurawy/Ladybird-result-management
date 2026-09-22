import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertIsFormTeacherOf } from "@/lib/permissions";
import { computeClassOverview } from "@/lib/overview";
import { ForbiddenError } from "@/lib/auth";

const schema = z.object({ classArmId: z.string(), sessionId: z.string(), termId: z.string() });

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

  const existing = await prisma.classApproval.findUnique({
    where: { classArmId_sessionId_termId: { classArmId: d.classArmId, sessionId: d.sessionId, termId: d.termId } },
  });
  if (existing?.status === "FORM_APPROVED" || existing?.status === "PUBLISHED" || existing?.status === "LOCKED") {
    return NextResponse.json({ error: "This class has already been approved." }, { status: 409 });
  }

  // Same eligibility rule as the Class Review screen: every subject that
  // actually has a teacher assigned (i.e. not UNASSIGNED) must be
  // APPROVED/ADMIN_REVIEW/PUBLISHED/LOCKED. Mirrors `allSubjectsApproved` in
  // the original source/11-form-review.js.
  const overview = await computeClassOverview(d.classArmId, d.sessionId, d.termId);
  const actionable = overview.subjectStatuses.filter((s) => s.status !== "UNASSIGNED");
  const allApproved = actionable.length > 0 && actionable.every((s) => ["APPROVED", "ADMIN_REVIEW", "PUBLISHED", "LOCKED"].includes(s.status));
  if (!allApproved) {
    return NextResponse.json({ error: "Approve every subject before approving the class." }, { status: 409 });
  }

  const approvedRows = await prisma.subjectResultStatus.findMany({
    where: {
      classArmId: d.classArmId,
      sessionId: d.sessionId,
      termId: d.termId,
      status: "APPROVED",
      subjectId: { in: overview.subjects.map((s) => s.id) },
    },
  });

  await prisma.$transaction([
    prisma.classApproval.upsert({
      where: { classArmId_sessionId_termId: { classArmId: d.classArmId, sessionId: d.sessionId, termId: d.termId } },
      create: { classArmId: d.classArmId, sessionId: d.sessionId, termId: d.termId, status: "FORM_APPROVED", reviewedById: session.id },
      update: { status: "FORM_APPROVED", reviewedById: session.id },
    }),
    // Move every APPROVED subject into ADMIN_REVIEW so the Admin/Principal queue picks it up.
    ...approvedRows.map((s) => prisma.subjectResultStatus.update({ where: { id: s.id }, data: { status: "ADMIN_REVIEW" } })),
    prisma.auditLog.create({
      data: { userId: session.id, userName: session.name, role: session.role, action: "APPROVE_RESULT", details: `class=${d.classArmId} (form teacher approval)` },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

