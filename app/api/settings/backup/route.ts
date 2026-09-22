import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

// Full JSON export of every table — the Postgres equivalent of the original
// app's "download records/core as JSON" backup button. Passwords are never
// included (users are exported without passwordHash).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [
    school, sessions, terms, sections, departments, classArms, users, teacherAssignments, formTeacherAssignments,
    students, enrollments, studentSubjects, subjects, assessmentSchemes, assessmentComponents, gradingSchemes,
    gradingBands, scores, subjectResultStatuses, classApprovals, studentComments, commentTemplates, signatures,
    skillDomains, domainScores, attendance, reportTemplates, customFieldDefs, media, auditLogs,
  ] = await Promise.all([
    prisma.schoolSetting.findFirst(),
    prisma.academicSession.findMany(),
    prisma.term.findMany(),
    prisma.section.findMany(),
    prisma.department.findMany(),
    prisma.classArm.findMany(),
    prisma.user.findMany({ select: { id: true, username: true, name: true, role: true, active: true, isDemo: true } }),
    prisma.teacherAssignment.findMany(),
    prisma.formTeacherAssignment.findMany(),
    prisma.student.findMany(),
    prisma.studentEnrollment.findMany(),
    prisma.studentSubject.findMany(),
    prisma.subject.findMany(),
    prisma.assessmentScheme.findMany(),
    prisma.assessmentComponent.findMany(),
    prisma.gradingScheme.findMany(),
    prisma.gradingBand.findMany(),
    prisma.score.findMany(),
    prisma.subjectResultStatus.findMany(),
    prisma.classApproval.findMany(),
    prisma.studentComment.findMany(),
    prisma.commentTemplate.findMany(),
    prisma.signature.findMany(),
    prisma.skillDomain.findMany(),
    prisma.domainScore.findMany(),
    prisma.attendance.findMany(),
    prisma.reportTemplate.findMany(),
    prisma.customFieldDef.findMany(),
    prisma.media.findMany(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5000 }),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    school, sessions, terms, sections, departments, classArms, users, teacherAssignments, formTeacherAssignments,
    students, enrollments, studentSubjects, subjects, assessmentSchemes, assessmentComponents, gradingSchemes,
    gradingBands, scores, subjectResultStatuses, classApprovals, studentComments, commentTemplates, signatures,
    skillDomains, domainScores, attendance, reportTemplates, customFieldDefs, media, auditLogs,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="ladybird-backup-${Date.now()}.json"` },
  });
}
