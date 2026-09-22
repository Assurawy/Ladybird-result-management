import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertCanEnterScores } from "@/lib/permissions";
import { computeSubjectTotal, gradeFor } from "@/lib/calculations";
import { ForbiddenError } from "@/lib/auth";

// GET /api/scores?subjectId=&classArmId=&sessionId=&termId=
// Returns every student in the class with their current score row (or a
// blank one) plus the computed total/grade, using the assessment/grading
// scheme that applies to that subject's section.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const classArmId = searchParams.get("classArmId");
  const sessionIdParam = searchParams.get("sessionId");
  const termId = searchParams.get("termId");
  if (!subjectId || !classArmId || !sessionIdParam || !termId) {
    return NextResponse.json({ error: "subjectId, classArmId, sessionId and termId are required." }, { status: 400 });
  }

  try {
    await assertCanEnterScores(session, subjectId, classArmId, sessionIdParam, termId);
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const [classArm, subject, students, scores, resultStatus] = await Promise.all([
    prisma.classArm.findUniqueOrThrow({ where: { id: classArmId } }),
    prisma.subject.findUniqueOrThrow({ where: { id: subjectId } }),
    prisma.student.findMany({ where: { classArmId }, orderBy: { name: "asc" } }),
    prisma.score.findMany({ where: { subjectId, classArmId, sessionId: sessionIdParam, termId } }),
    prisma.subjectResultStatus.findUnique({
      where: { classArmId_subjectId_sessionId_termId: { classArmId, subjectId, sessionId: sessionIdParam, termId } },
    }),
  ]);

  const [scheme, grading] = await Promise.all([
    prisma.assessmentScheme.findFirst({
      where: { sections: { some: { sectionId: classArm.sectionId } } },
      include: { components: { where: { active: true }, orderBy: { order: "asc" } } },
    }),
    prisma.gradingScheme.findFirst({
      where: { sections: { some: { sectionId: classArm.sectionId } } },
      include: { bands: true },
    }),
  ]);

  const scoreByStudent = new Map(scores.map((s) => [s.studentId, s]));
  const status = resultStatus?.status ?? "PENDING";
  // Subject teachers can keep editing/re-submitting right up until the whole
  // class is Published/Locked — submission is not a one-way door. Mirrors
  // `locked = ["PUBLISHED","LOCKED"].indexOf(currentStatus) > -1` in the
  // original source/10-score-entry.js.
  const locked = status === "PUBLISHED" || status === "LOCKED";

  const rows = students.map((stu) => {
    const rec = scoreByStudent.get(stu.id);
    const components = (rec?.components as Record<string, number | null>) ?? {};
    const calc = computeSubjectTotal(components, rec?.attendanceState ?? null, scheme?.components ?? []);
    const band =
      calc.isComplete && !calc.hasAbsent && !calc.hasExcused ? gradeFor(calc.total, grading?.bands ?? []) : { grade: "-", remark: "", point: null };
    return {
      studentId: stu.id,
      studentName: stu.name,
      photoUrl: stu.photoUrl,
      components,
      attendanceState: rec?.attendanceState ?? null,
      total: calc.total,
      isComplete: calc.isComplete,
      grade: band.grade,
    };
  });

  return NextResponse.json({ status, locked, scheme, grading, rows });
}

const saveSchema = z.object({
  subjectId: z.string(),
  classArmId: z.string(),
  sessionId: z.string(),
  termId: z.string(),
  studentId: z.string(),
  components: z.record(z.union([z.number(), z.null()])),
  attendanceState: z.enum(["ABSENT", "EXCUSED"]).nullable(),
});

// PUT /api/scores — upsert one student's row. Saving one row at a time (not
// the whole sheet) matches the original app's per-cell autosave and avoids
// clobbering a classmate's concurrent edit.
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  try {
    await assertCanEnterScores(session, d.subjectId, d.classArmId, d.sessionId, d.termId);
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const statusRow = await prisma.subjectResultStatus.findUnique({
    where: {
      classArmId_subjectId_sessionId_termId: {
        classArmId: d.classArmId,
        subjectId: d.subjectId,
        sessionId: d.sessionId,
        termId: d.termId,
      },
    },
  });
  if (statusRow?.status === "PUBLISHED" || statusRow?.status === "LOCKED") {
    return NextResponse.json({ error: "Locked for editing — results have been published." }, { status: 409 });
  }

  const score = await prisma.score.upsert({
    where: {
      studentId_subjectId_classArmId_sessionId_termId: {
        studentId: d.studentId,
        subjectId: d.subjectId,
        classArmId: d.classArmId,
        sessionId: d.sessionId,
        termId: d.termId,
      },
    },
    create: {
      studentId: d.studentId,
      subjectId: d.subjectId,
      classArmId: d.classArmId,
      sessionId: d.sessionId,
      termId: d.termId,
      components: d.components,
      attendanceState: d.attendanceState,
    },
    update: {
      components: d.components,
      attendanceState: d.attendanceState,
    },
  });

  return NextResponse.json({ score });
}
