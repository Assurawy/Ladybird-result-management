import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWholeSchoolRole } from "@/lib/permissions";
import { computeClassOverview } from "@/lib/overview";
import AppShell from "@/components/AppShell";
import FormReviewClient from "./FormReviewClient";

export default async function FormReviewPage({ searchParams }: { searchParams: { classArmId?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const school = await prisma.schoolSetting.findFirst();
  if (!school?.currentSessionId || !school?.currentTermId) {
    return (
      <AppShell user={session}>
        <p className="muted">No active session/term is set yet.</p>
      </AppShell>
    );
  }

  const myClasses = isWholeSchoolRole(session.role)
    ? await prisma.classArm.findMany({ where: { active: true }, orderBy: { name: "asc" } })
    : await prisma.classArm.findMany({
        where: { active: true, formTeacherAssignments: { some: { teacherId: session.id, active: true } } },
        orderBy: { name: "asc" },
      });

  if (myClasses.length === 0) {
    return (
      <AppShell user={session}>
        <p className="muted">You are not currently assigned as a Form Teacher for any class.</p>
      </AppShell>
    );
  }

  const classArmId = searchParams.classArmId && myClasses.some((c) => c.id === searchParams.classArmId) ? searchParams.classArmId : myClasses[0].id;

  const [overview, approval] = await Promise.all([
    computeClassOverview(classArmId, school.currentSessionId, school.currentTermId),
    prisma.classApproval.findUnique({
      where: { classArmId_sessionId_termId: { classArmId, sessionId: school.currentSessionId, termId: school.currentTermId } },
    }),
  ]);

  const comments = await prisma.studentComment.findMany({
    where: { sessionId: school.currentSessionId, termId: school.currentTermId, studentId: { in: overview.students.map((s) => s.student.id) } },
  });

  return (
    <AppShell user={session}>
      <FormReviewClient
        classes={myClasses.map((c) => ({ id: c.id, name: c.name }))}
        classArmId={classArmId}
        sessionId={school.currentSessionId}
        termId={school.currentTermId}
        overview={{
          classAverage: overview.classAverage,
          subjectStatuses: overview.subjectStatuses.map((s) => ({ subjectId: s.subject.id, subjectName: s.subject.name, status: s.status, entered: s.entered, totalStudents: s.totalStudents })),
          students: overview.students.map((s) => ({
            id: s.student.id,
            name: s.student.name,
            average: s.overall.average,
            position: s.position,
            comment: comments.find((c) => c.studentId === s.student.id)?.formTeacherComment ?? "",
          })),
        }}
        approvalStatus={approval?.status ?? "IN_PROGRESS"}
      />
    </AppShell>
  );
}
