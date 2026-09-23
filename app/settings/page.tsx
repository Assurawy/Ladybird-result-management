import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canChangeSettings } from "@/lib/permissions";
import AppShell from "@/components/AppShell";
import SettingsClient from "./SettingsClient";
import { REPORT_STYLES } from "@/app/api/settings/report-templates/route";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canChangeSettings(session.role)) redirect("/dashboard");

  const [school, sections, departments, classArms, subjects, assessmentSchemes, gradingSchemes, commentTemplates, reportTemplates, skillDomains, users, sessions] =
    await Promise.all([
      prisma.schoolSetting.findFirst(),
      prisma.section.findMany({ orderBy: { order: "asc" } }),
      prisma.department.findMany({ include: { section: true }, orderBy: { name: "asc" } }),
      prisma.classArm.findMany({ include: { section: true, department: true }, orderBy: { name: "asc" } }),
      prisma.subject.findMany({ where: { active: true }, include: { sectionLinks: { include: { section: true } }, departmentLinks: { include: { department: true } } }, orderBy: { order: "asc" } }),
      prisma.assessmentScheme.findMany({ include: { sections: { include: { section: true } }, components: { orderBy: { order: "asc" } } } }),
      prisma.gradingScheme.findMany({ include: { sections: { include: { section: true } }, bands: { orderBy: { min: "desc" } } } }),
      prisma.commentTemplate.findMany({ include: { section: true } }),
      prisma.reportTemplate.findMany({ where: { active: true }, include: { sections: { include: { section: true } } } }),
      prisma.skillDomain.findMany(),
      prisma.user.findMany({ select: { id: true, username: true, name: true, role: true, active: true }, orderBy: { name: "asc" } }),
      prisma.academicSession.findMany({ include: { terms: { orderBy: { order: "asc" } } }, orderBy: { name: "desc" } }),
    ]);

  return (
    <AppShell user={session}>
      <SettingsClient
        school={school}
        sections={sections}
        departments={departments}
        classArms={classArms}
        subjects={subjects}
        assessmentSchemes={assessmentSchemes}
        gradingSchemes={gradingSchemes}
        commentTemplates={commentTemplates}
        reportTemplates={reportTemplates}
        reportStyles={REPORT_STYLES}
        skillDomains={skillDomains}
        users={users}
        sessions={sessions}
        canManageUsers={session.role === "SUPER_ADMIN" || session.role === "ADMIN"}
      />
    </AppShell>
  );
}
