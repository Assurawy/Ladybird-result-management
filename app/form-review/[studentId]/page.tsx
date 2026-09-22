import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";
import StudentRecordClient from "./StudentRecordClient";

export default async function StudentRecordPage({
  params,
  searchParams,
}: {
  params: { studentId: string };
  searchParams: { classArmId?: string; sessionId?: string; termId?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { classArmId, sessionId, termId } = searchParams;
  if (!classArmId || !sessionId || !termId) redirect("/form-review");

  const [student, domains, existingRatings, attendance, comment] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: params.studentId } }),
    prisma.skillDomain.findMany({ where: { active: true } }),
    prisma.domainScore.findMany({ where: { studentId: params.studentId, sessionId, termId } }),
    prisma.attendance.findUnique({ where: { studentId_sessionId_termId: { studentId: params.studentId, sessionId, termId } } }),
    prisma.studentComment.findUnique({ where: { studentId_sessionId_termId: { studentId: params.studentId, sessionId, termId } } }),
  ]);

  const school = await prisma.schoolSetting.findFirst();

  return (
    <AppShell user={session}>
      <StudentRecordClient
        student={{ id: student.id, name: student.name }}
        classArmId={classArmId}
        sessionId={sessionId}
        termId={termId}
        domains={domains.map((d) => ({ id: d.id, name: d.name, type: d.type }))}
        ratings={Object.fromEntries(existingRatings.map((r) => [r.domainId, r.rating]))}
        ratingLevels={school?.ratingLevels ?? ["Excellent", "Very Good", "Good", "Fair", "Poor"]}
        attendance={attendance ?? { totalDays: 0, present: 0, absent: 0, late: 0 }}
        fees={{ nextFees: comment?.nextFees ?? "", examFee: comment?.examFee ?? "" }}
      />
    </AppShell>
  );
}
