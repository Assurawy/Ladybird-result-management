import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import StudentsClient from "./StudentsClient";

export default async function StudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [students, sections, classArms, school] = await Promise.all([
    prisma.student.findMany({ orderBy: { name: "asc" }, include: { classArm: true, section: true }, take: 200 }),
    prisma.section.findMany({ orderBy: { order: "asc" } }),
    prisma.classArm.findMany({ where: { active: true }, include: { section: true, department: true }, orderBy: { name: "asc" } }),
    prisma.schoolSetting.findFirst(),
  ]);

  return (
    <AppShell user={session}>
      <StudentsClient
        students={students.map((s) => ({ id: s.id, admissionNo: s.admissionNo, name: s.name, className: s.classArm.name, classArmId: s.classArmId, sectionName: s.section.name, sectionId: s.sectionId, status: s.status, photoUrl: s.photoUrl }))}
        sections={sections.map((s) => ({ id: s.id, name: s.name }))}
        classArms={classArms.map((c) => ({ id: c.id, name: c.name, sectionId: c.sectionId, departmentId: c.departmentId }))}
        currentSessionId={school?.currentSessionId ?? ""}
      />
    </AppShell>
  );
}
