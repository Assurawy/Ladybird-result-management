import "server-only";
import { prisma } from "./prisma";
import { computeSubjectTotal, gradeFor, assignPositions, type TieMethod } from "./calculations";

// Subjects that apply to a class-arm in general: right section, and if the
// subject is department-restricted, the class-arm's own department must be
// one of them. (Mirrors subjectsForClassArm() — used for "which subjects
// does this class have" lists, not one student's personal selection.)
export async function subjectsForClassArm(classArmId: string) {
  const classArm = await prisma.classArm.findUniqueOrThrow({ where: { id: classArmId } });
  const candidates = await prisma.subject.findMany({
    where: { active: true, sectionLinks: { some: { sectionId: classArm.sectionId } } },
    include: { departmentLinks: true },
    orderBy: { order: "asc" },
  });
  return candidates.filter((su) => su.departmentLinks.length === 0 || (classArm.departmentId && su.departmentLinks.some((d) => d.departmentId === classArm.departmentId)));
}

// Subjects a SPECIFIC student takes — subjects with no department
// restriction apply to everyone; department-restricted subjects use the
// student's own StudentSubject picks if any exist, else fall back to a
// department match. Mirrors subjectsForStudent()/studentTakesSubject().
export async function subjectsForStudent(studentId: string, classArmId: string) {
  const [student, classArm, picks] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
    prisma.classArm.findUniqueOrThrow({ where: { id: classArmId } }),
    prisma.studentSubject.findMany({ where: { studentId } }),
  ]);
  const pickIds = new Set(picks.map((p) => p.subjectId));

  const subjects = await prisma.subject.findMany({
    where: { active: true, sectionLinks: { some: { sectionId: classArm.sectionId } } },
    include: { departmentLinks: true },
    orderBy: { order: "asc" },
  });

  return subjects.filter((su) => {
    if (su.departmentLinks.length === 0) return true;
    if (picks.length > 0) return pickIds.has(su.id);
    return !!(student.departmentId && su.departmentLinks.some((d) => d.departmentId === student.departmentId));
  });
}

async function getSchemeAndGrading(sectionId: string) {
  const [scheme, grading] = await Promise.all([
    prisma.assessmentScheme.findFirst({
      where: { sections: { some: { sectionId } } },
      include: { components: { where: { active: true }, orderBy: { order: "asc" } } },
    }),
    prisma.gradingScheme.findFirst({
      where: { sections: { some: { sectionId } } },
      include: { bands: true },
    }),
  ]);
  return { scheme, grading };
}

async function getTieMethod(): Promise<TieMethod> {
  const school = await prisma.schoolSetting.findFirst();
  return (school?.rankingTieMethod as TieMethod) ?? "competition";
}

// One student's full subject-by-subject summary + average, used on report
// cards and the Form Teacher review screen. Mirrors computeStudentOverall().
export async function computeStudentOverall(studentId: string, classArmId: string, sessionId: string, termId: string) {
  const classArm = await prisma.classArm.findUniqueOrThrow({ where: { id: classArmId } });
  const [applicable, { grading }] = await Promise.all([subjectsForStudent(studentId, classArmId), getSchemeAndGrading(classArm.sectionId)]);

  const scores = await prisma.score.findMany({ where: { studentId, classArmId, sessionId, termId, subjectId: { in: applicable.map((s) => s.id) } } });
  const scoreBySubject = new Map(scores.map((s) => [s.subjectId, s]));

  // Each subject can carry its own assessment scheme in theory; in this
  // migration all subjects in a section share one scheme (same as the
  // original app's default resolution), so we fetch it once per section.
  const { scheme } = await getSchemeAndGrading(classArm.sectionId);

  const subjectRows = applicable.map((subject) => {
    const rec = scoreBySubject.get(subject.id);
    const components = (rec?.components as Record<string, number | null>) ?? {};
    const calc = computeSubjectTotal(components, rec?.attendanceState ?? null, scheme?.components ?? []);
    const band = calc.isComplete && !calc.hasAbsent && !calc.hasExcused ? gradeFor(calc.total, grading?.bands ?? []) : { grade: "-", remark: "", point: null };
    return { subject, calc, grade: band.grade, remark: band.remark };
  });

  const forAverage = subjectRows.filter((r) => r.subject.includeInAverage);
  const complete = forAverage.filter((r) => r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused);
  const grandTotal = complete.reduce((a, r) => a + r.calc.total, 0);
  const average = complete.length ? Math.round((grandTotal / complete.length) * 100) / 100 : null;
  const allComplete = forAverage.length > 0 && complete.length === forAverage.length;

  return {
    subjectRows,
    grandTotal: Math.round(grandTotal * 100) / 100,
    average,
    allComplete,
    totalSubjects: forAverage.length,
    completedSubjects: complete.length,
  };
}

// Whole-class overview used by Form Teacher review + Admin approval screens.
// Mirrors computeClassOverview().
export async function computeClassOverview(classArmId: string, sessionId: string, termId: string) {
  const [classArm, subjects, students, tieMethod] = await Promise.all([
    prisma.classArm.findUniqueOrThrow({ where: { id: classArmId } }),
    subjectsForClassArm(classArmId),
    prisma.student.findMany({ where: { classArmId, status: "Active" } }),
    getTieMethod(),
  ]);

  const [teacherAssignments, statusRows] = await Promise.all([
    prisma.teacherAssignment.findMany({ where: { classArmId, sessionId, termId, active: true, subjectId: { in: subjects.map((s) => s.id) } } }),
    prisma.subjectResultStatus.findMany({ where: { classArmId, sessionId, termId, subjectId: { in: subjects.map((s) => s.id) } } }),
  ]);
  const assignmentBySubject = new Map(teacherAssignments.map((a) => [a.subjectId, a]));
  const statusBySubject = new Map(statusRows.map((s) => [s.subjectId, s.status]));

  const scores = await prisma.score.findMany({ where: { classArmId, sessionId, termId, subjectId: { in: subjects.map((s) => s.id) } } });

  const subjectStatuses = await Promise.all(
    subjects.map(async (su) => {
      const assignment = assignmentBySubject.get(su.id);
      const status = statusBySubject.get(su.id) ?? (assignment ? "PENDING" : "UNASSIGNED");
      const eligible = await subjectsEligibleStudents(students, su.id);
      const entered = eligible.filter((stu) => {
        const rec = scores.find((s) => s.studentId === stu.id && s.subjectId === su.id);
        return rec && Object.keys((rec.components as object) ?? {}).length > 0;
      }).length;
      return { subject: su, status, teacherId: assignment?.teacherId ?? null, entered, totalStudents: eligible.length };
    })
  );

  const overallRows = await Promise.all(
    students.map(async (stu) => ({ student: stu, overall: await computeStudentOverall(stu.id, classArmId, sessionId, termId) }))
  );
  const positions = assignPositions(overallRows, (r) => (r.overall.allComplete ? r.overall.average : null), tieMethod);
  const rowsWithPosition = overallRows.map((r, i) => ({ ...r, position: positions[i] }));

  const completeOverall = overallRows.filter((r) => r.overall.allComplete);
  const classAverage = completeOverall.length
    ? Math.round((completeOverall.reduce((a, r) => a + (r.overall.average ?? 0), 0) / completeOverall.length) * 100) / 100
    : null;

  return { classArm, subjects, subjectStatuses, students: rowsWithPosition, classAverage };
}

// One subject's full class results table + class average + positions.
// Mirrors computeSubjectClassResults() in source/04-engine.js — used by the
// report card's per-subject "Class Average"/"Position" columns.
export async function computeSubjectClassResults(classArmId: string, subjectId: string, sessionId: string, termId: string) {
  const classArm = await prisma.classArm.findUniqueOrThrow({ where: { id: classArmId } });
  const [{ scheme, grading }, tieMethod] = await Promise.all([getSchemeAndGrading(classArm.sectionId), getTieMethod()]);

  const allStudents = await prisma.student.findMany({ where: { classArmId, status: "Active" } });
  const students = await subjectsEligibleStudents(allStudents, subjectId);
  const scores = await prisma.score.findMany({ where: { subjectId, classArmId, sessionId, termId } });
  const scoreByStudent = new Map(scores.map((s) => [s.studentId, s]));

  const rows = students.map((stu) => {
    const rec = scoreByStudent.get(stu.id);
    const components = (rec?.components as Record<string, number | null>) ?? {};
    const calc = computeSubjectTotal(components, rec?.attendanceState ?? null, scheme?.components ?? []);
    return { studentId: stu.id, calc };
  });

  const completeRows = rows.filter((r) => r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused);
  const classAverage = completeRows.length ? Math.round((completeRows.reduce((a, r) => a + r.calc.total, 0) / completeRows.length) * 100) / 100 : null;

  const positions = assignPositions(rows, (r) => (r.calc.isComplete && !r.calc.hasAbsent && !r.calc.hasExcused ? r.calc.total : null), tieMethod);
  const positionByStudent = new Map(rows.map((r, i) => [r.studentId, positions[i]]));

  return { classAverage, totalStudents: rows.length, positionByStudent };
}

async function subjectsEligibleStudents(students: { id: string; departmentId: string | null }[], subjectId: string) {
  const subject = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId }, include: { departmentLinks: true } });
  if (subject.departmentLinks.length === 0) return students;
  const picks = await prisma.studentSubject.findMany({ where: { subjectId, studentId: { in: students.map((s) => s.id) } } });
  const pickedIds = new Set(picks.map((p) => p.studentId));
  return students.filter((stu) => pickedIds.has(stu.id) || (stu.departmentId && subject.departmentLinks.some((d) => d.departmentId === stu.departmentId)));
}
