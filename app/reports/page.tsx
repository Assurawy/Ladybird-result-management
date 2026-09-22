import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWholeSchoolRole } from "@/lib/permissions";
import { computeStudentOverall } from "@/lib/overview";
import AppShell from "@/components/AppShell";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage({ searchParams }: { searchParams: { classArmId?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const school = await prisma.schoolSetting.findFirst();
  if (!school?.currentSessionId || !school?.currentTermId) {
    return (
      <AppShell user={session}>
        <p className="text-slate-500">No active session/term is set yet.</p>
      </AppShell>
    );
  }

  const accessibleClassArms = isWholeSchoolRole(session.role)
    ? await prisma.classArm.findMany({ where: { active: true }, orderBy: { name: "asc" } })
    : await prisma.classArm.findMany({
        where: { active: true, formTeacherAssignments: { some: { teacherId: session.id, active: true } } },
        orderBy: { name: "asc" },
      });

  if (accessibleClassArms.length === 0) {
    return (
      <AppShell user={session}>
        <p className="text-slate-500">No accessible class.</p>
      </AppShell>
    );
  }

  const classArmId = searchParams.classArmId && accessibleClassArms.some((c) => c.id === searchParams.classArmId) ? searchParams.classArmId : accessibleClassArms[0].id;
  const classArm = accessibleClassArms.find((c) => c.id === classArmId)!;

  const [students, templates] = await Promise.all([
    prisma.student.findMany({ where: { classArmId }, orderBy: { name: "asc" } }),
    prisma.reportTemplate.findMany({ where: { active: true, sections: { some: { sectionId: classArm.sectionId } } } }),
  ]);

  const rows = await Promise.all(
    students.map(async (s) => ({
      id: s.id,
      name: s.name,
      admissionNo: s.admissionNo,
      average: (await computeStudentOverall(s.id, classArmId, school.currentSessionId!, school.currentTermId!)).average,
    }))
  );

  return (
    <AppShell user={session}>
      <ReportsClient
        classes={accessibleClassArms.map((c) => ({ id: c.id, name: c.name }))}
        classArmId={classArmId}
        students={rows}
        templates={templates.map((t) => ({ id: t.id, name: t.name, isDefault: t.isDefault }))}
        sessionId={school.currentSessionId}
        termId={school.currentTermId}
      />
    </AppShell>
  );
}
