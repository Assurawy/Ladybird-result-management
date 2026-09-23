import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWholeSchoolRole } from "@/lib/permissions";
import AppShell from "@/components/AppShell";
import TeachersClient from "./TeachersClient";

export default async function TeachersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isWholeSchoolRole(session.role)) redirect("/dashboard");

  const school = await prisma.schoolSetting.findFirst();
  if (!school?.currentSessionId || !school?.currentTermId) {
    return (
      <AppShell user={session}>
        <p className="muted">Set a current session/term in Settings first.</p>
      </AppShell>
    );
  }

  const [teachers, subjects, classArms, teacherAssignments, formTeacherAssignments] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEACHER", active: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.classArm.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.teacherAssignment.findMany({
      where: { sessionId: school.currentSessionId, termId: school.currentTermId, active: true },
      include: { teacher: true, subject: true, classArm: true },
    }),
    prisma.formTeacherAssignment.findMany({
      where: { sessionId: school.currentSessionId, active: true },
      include: { teacher: true, classArm: true },
    }),
  ]);

  return (
    <AppShell user={session}>
      <TeachersClient
        teachers={teachers.map((t) => ({ id: t.id, name: t.name }))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        classArms={classArms.map((c) => ({ id: c.id, name: c.name }))}
        assignments={teacherAssignments.map((a) => ({ id: a.id, teacherName: a.teacher.name, subjectName: a.subject.name, classArmName: a.classArm.name }))}
        formAssignments={formTeacherAssignments.map((a) => ({ id: a.id, teacherName: a.teacher.name, classArmName: a.classArm.name }))}
        sessionId={school.currentSessionId}
        termId={school.currentTermId}
      />
    </AppShell>
  );
}
