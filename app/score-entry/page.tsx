import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWholeSchoolRole } from "@/lib/permissions";
import AppShell from "@/components/AppShell";
import ScoreSheet from "./ScoreSheet";

export default async function ScoreEntryPage({
  searchParams,
}: {
  searchParams: { subjectId?: string; classArmId?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const school = await prisma.schoolSetting.findFirst();
  if (!school?.currentSessionId || !school?.currentTermId) {
    return (
      <AppShell user={session}>
        <p className="text-slate-500">No active session/term is set yet — ask an Admin to configure one in Settings.</p>
      </AppShell>
    );
  }

  const assignments = await prisma.teacherAssignment.findMany({
    where: isWholeSchoolRole(session.role)
      ? { sessionId: school.currentSessionId, termId: school.currentTermId, active: true }
      : { teacherId: session.id, sessionId: school.currentSessionId, termId: school.currentTermId, active: true },
    include: { subject: true, classArm: true },
  });

  if (assignments.length === 0) {
    return (
      <AppShell user={session}>
        <p className="text-slate-500">No subject assignments for this term.</p>
      </AppShell>
    );
  }

  const subjectId = searchParams.subjectId ?? assignments[0].subjectId;
  const classArmId = searchParams.classArmId ?? assignments[0].classArmId;

  return (
    <AppShell user={session}>
      <ScoreSheet
        assignments={assignments.map((a) => ({ subjectId: a.subjectId, subjectName: a.subject.name, classArmId: a.classArmId, classArmName: a.classArm.name }))}
        subjectId={subjectId}
        classArmId={classArmId}
        sessionId={school.currentSessionId}
        termId={school.currentTermId}
      />
    </AppShell>
  );
}
