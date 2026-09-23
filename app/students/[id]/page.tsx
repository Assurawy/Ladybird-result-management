import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import StudentDetailClient from "./StudentDetailClient";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: { classArm: true, section: true, department: true, enrollments: { orderBy: { createdAt: "asc" }, include: { session: true, classArm: true } } },
  });
  if (!student) redirect("/students");

  return (
    <AppShell user={session}>
      <StudentDetailClient
        student={{
          id: student.id,
          admissionNo: student.admissionNo,
          name: student.name,
          gender: student.gender,
          dob: student.dob,
          guardianPhone: student.guardianPhone,
          address: student.address,
          status: student.status,
          photoUrl: student.photoUrl,
          className: student.classArm.name,
          sectionName: student.section.name,
          departmentName: student.department?.name ?? null,
        }}
        enrollments={student.enrollments.map((e) => ({ id: e.id, sessionName: e.session.name, className: e.classArm.name, date: e.createdAt.toISOString() }))}
      />
    </AppShell>
  );
}
