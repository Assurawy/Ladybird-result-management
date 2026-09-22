import "server-only";
import { prisma } from "./prisma";
import { computeStudentOverall, computeClassOverview, computeSubjectClassResults } from "./overview";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function calcAge(dob: string | null | undefined) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export async function pickReportTemplate(sectionId: string, forcedId?: string) {
  if (forcedId) {
    const forced = await prisma.reportTemplate.findUnique({ where: { id: forcedId } });
    if (forced) return forced;
  }
  const bySection = await prisma.reportTemplate.findMany({ where: { active: true, sections: { some: { sectionId } } } });
  return bySection.find((t) => t.isDefault) ?? bySection[0] ?? (await prisma.reportTemplate.findFirst());
}

// Full data needed to render one student's report card — a direct,
// structured port of generateReportCardHtml() in source/13-reports.js.
export async function buildReportData(studentId: string, classArmId: string, sessionId: string, termId: string, forcedTemplateId?: string) {
  const [student, classArm, school, term, overall, classOv, comment, domainScores, attendance, principalSig] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
    prisma.classArm.findUniqueOrThrow({ where: { id: classArmId } }),
    prisma.schoolSetting.findFirst(),
    prisma.term.findUnique({ where: { id: termId } }),
    computeStudentOverall(studentId, classArmId, sessionId, termId),
    computeClassOverview(classArmId, sessionId, termId),
    prisma.studentComment.findUnique({ where: { studentId_sessionId_termId: { studentId, sessionId, termId } } }),
    prisma.domainScore.findMany({ where: { studentId, sessionId, termId }, include: { domain: true } }),
    prisma.attendance.findUnique({ where: { studentId_sessionId_termId: { studentId, sessionId, termId } } }),
    prisma.signature.findFirst({ where: { role: "PRINCIPAL", active: true } }),
  ]);

  const [academicSession, template, formTeacherAssignment] = await Promise.all([
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    pickReportTemplate(classArm.sectionId, forcedTemplateId),
    prisma.formTeacherAssignment.findFirst({ where: { classArmId, sessionId, active: true }, include: { teacher: true } }),
  ]);

  const myPositionRow = classOv.students.find((r) => r.student.id === studentId);

  const scheme = await prisma.assessmentScheme.findFirst({
    where: { sections: { some: { sectionId: classArm.sectionId } } },
    include: { components: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  const grading = await prisma.gradingScheme.findFirst({
    where: { sections: { some: { sectionId: classArm.sectionId } } },
    include: { bands: { orderBy: { min: "desc" } } },
  });

  const scores = await prisma.score.findMany({ where: { studentId, classArmId, sessionId, termId } });
  const scoreBySubject = new Map(scores.map((s) => [s.subjectId, s]));

  const subjectRows = await Promise.all(
    overall.subjectRows.map(async (r) => {
      const rec = scoreBySubject.get(r.subject.id);
      const componentValues = (rec?.components as Record<string, number | null>) ?? {};
      const display = r.calc.hasAbsent ? "ABS" : r.calc.hasExcused ? "EXC" : r.calc.isComplete ? r.calc.total : "—";
      const subjectClassResults = await computeSubjectClassResults(classArmId, r.subject.id, sessionId, termId);
      return {
        subjectName: r.subject.name,
        componentValues: (scheme?.components ?? []).map((c) => ({ name: c.name, value: componentValues[c.id] ?? null })),
        display,
        grade: r.grade,
        remark: r.remark,
        classAverage: subjectClassResults.classAverage,
        position: subjectClassResults.positionByStudent.get(studentId) ?? null,
      };
    })
  );

  const affective = domainScores.filter((d) => d.domain.type === "AFFECTIVE");
  const psychomotor = domainScores.filter((d) => d.domain.type === "PSYCHOMOTOR");

  return {
    student,
    classArm,
    school,
    term,
    academicSessionName: academicSession?.name ?? "",
    termName: term?.name ?? "",
    template,
    overall,
    classSize: classOv.students.length,
    position: myPositionRow?.position ?? null,
    age: calcAge(student.dob),
    ordinalPosition: myPositionRow?.position ? ordinal(myPositionRow.position) : "—",
    subjectRows,
    gradingBands: grading?.bands ?? [],
    formTeacherComment: comment?.formTeacherComment ?? "",
    principalComment: comment?.principalComment ?? "",
    nextFees: comment?.nextFees ?? "",
    examFee: comment?.examFee ?? "",
    affective,
    psychomotor,
    ratingLevels: school?.ratingLevels ?? ["Excellent", "Very Good", "Good", "Fair", "Poor"],
    attendance,
    principalSignatureUrl: principalSig?.imageUrl ?? null,
    formTeacherName: formTeacherAssignment?.teacher.name ?? null,
    formTeacherSignatureUrl: formTeacherAssignment?.teacher.signatureUrl ?? null,
  };
}

export type ReportData = Awaited<ReturnType<typeof buildReportData>>;
