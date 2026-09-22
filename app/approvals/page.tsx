import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWholeSchoolRole } from "@/lib/permissions";
import { computeClassOverview } from "@/lib/overview";
import AppShell from "@/components/AppShell";
import ApprovalsClient from "./ApprovalsClient";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isWholeSchoolRole(session.role)) redirect("/dashboard");

  const school = await prisma.schoolSetting.findFirst();
  if (!school?.currentSessionId || !school?.currentTermId) {
    return (
      <AppShell user={session}>
        <p className="text-slate-500">No active session/term is set yet.</p>
      </AppShell>
    );
  }
  const sessionId = school.currentSessionId;
  const termId = school.currentTermId;

  const classArms = await prisma.classArm.findMany({ where: { active: true }, include: { section: true }, orderBy: { name: "asc" } });
  const approvals = await prisma.classApproval.findMany({ where: { sessionId, termId, classArmId: { in: classArms.map((c) => c.id) } } });
  const approvalByClass = new Map(approvals.map((a) => [a.classArmId, a]));

  const rows = await Promise.all(
    classArms.map(async (ca) => {
      const overview = await computeClassOverview(ca.id, sessionId, termId);
      const approval = approvalByClass.get(ca.id);
      return {
        classArmId: ca.id,
        name: ca.name,
        sectionName: ca.section.name,
        studentCount: overview.students.length,
        classAverage: overview.classAverage,
        status: approval?.status ?? "IN_PROGRESS",
      };
    })
  );

  const order: Record<string, number> = { FORM_APPROVED: 0, PUBLISHED: 1, LOCKED: 2, IN_PROGRESS: 3 };
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return (
    <AppShell user={session}>
      <ApprovalsClient rows={rows} sessionId={sessionId} termId={termId} userRole={session.role} />
    </AppShell>
  );
}
