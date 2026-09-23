import "server-only";
import { prisma } from "./prisma";
import { computeClassOverview } from "./overview";

export async function getDashboardSummary(sessionId: string | null, termId: string | null) {
  if (!sessionId || !termId) {
    return { classesCount: 0, pending: 0, submitted: 0, approved: 0, published: 0, classRows: [] };
  }

  const [classArms, totalAssignments, statusRows] = await Promise.all([
    prisma.classArm.findMany({ where: { active: true }, include: { section: true }, orderBy: { name: "asc" } }),
    prisma.teacherAssignment.count({ where: { sessionId, termId, active: true } }),
    prisma.subjectResultStatus.groupBy({ by: ["status"], where: { sessionId, termId }, _count: true }),
  ]);

  const countFor = (statuses: string[]) => statusRows.filter((r) => statuses.includes(r.status)).reduce((a, r) => a + r._count, 0);
  const submitted = countFor(["SUBMITTED"]);
  const approved = countFor(["APPROVED", "ADMIN_REVIEW"]);
  const published = countFor(["PUBLISHED", "LOCKED"]);
  const returned = countFor(["RETURNED"]);
  const pending = Math.max(0, totalAssignments - submitted - approved - published - returned);

  // Per-class completion — fine to run computeClassOverview per class arm
  // here since this page is only viewed occasionally by Admin/Principal and
  // school class counts are small (tens, not hundreds).
  const classRows = await Promise.all(
    classArms.map(async (ca) => {
      const studentCount = await prisma.student.count({ where: { classArmId: ca.id, status: "Active" } });
      if (studentCount === 0) {
        return { id: ca.id, name: ca.name, sectionName: ca.section.name, studentCount: 0, subjectsDone: 0, totalSubjects: 0, classAverage: null as number | null };
      }
      const overview = await computeClassOverview(ca.id, sessionId, termId);
      const actionable = overview.subjectStatuses.filter((s) => s.status !== "UNASSIGNED");
      const done = actionable.filter((s) => s.status !== "PENDING").length;
      return {
        id: ca.id,
        name: ca.name,
        sectionName: ca.section.name,
        studentCount: overview.students.length,
        subjectsDone: done,
        totalSubjects: actionable.length,
        classAverage: overview.classAverage,
      };
    })
  );

  return { classesCount: classArms.length, pending, submitted, approved, published, classRows };
}
