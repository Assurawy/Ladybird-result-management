import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isWholeSchoolRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getDashboardSummary } from "@/lib/dashboard";
import AppShell from "@/components/AppShell";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whole = isWholeSchoolRole(session.role);
  const school = await prisma.schoolSetting.findFirst();
  const currentSession = school?.currentSessionId ? await prisma.academicSession.findUnique({ where: { id: school.currentSessionId } }) : null;
  const currentTerm = school?.currentTermId ? await prisma.term.findUnique({ where: { id: school.currentTermId } }) : null;

  const [studentCount, teacherCount, summary, myAssignments] = await Promise.all([
    whole ? prisma.student.count() : Promise.resolve(null),
    whole ? prisma.user.count({ where: { role: "TEACHER", active: true } }) : Promise.resolve(null),
    whole ? getDashboardSummary(school?.currentSessionId ?? null, school?.currentTermId ?? null) : Promise.resolve(null),
    !whole
      ? prisma.teacherAssignment.findMany({
          where: { teacherId: session.id, active: true, sessionId: school?.currentSessionId ?? undefined },
          include: { subject: true, classArm: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <AppShell user={session}>
      <div className="page-header-row">
        <div>
          <h1>Welcome back, {session.name.split(" ")[0]}</h1>
          <p className="muted">
            {session.role.replace(/_/g, " ")}
            {currentSession && currentTerm ? ` · ${currentSession.name} · ${currentTerm.name}` : ""}
          </p>
        </div>
      </div>

      {whole && summary ? (
        <>
          <div className="stat-grid">
            <StatCard label="Total Students" value={studentCount ?? 0} />
            <StatCard label="Total Teachers" value={teacherCount ?? 0} />
            <StatCard label="Classes" value={summary.classesCount} />
            <StatCard label="Pending Subjects" value={summary.pending} tone="warn" />
            <StatCard label="Submitted" value={summary.submitted} tone="good" />
            <StatCard label="Approved" value={summary.approved} tone="good" />
            <StatCard label="Published" value={summary.published} tone="good" />
          </div>

          <h3 className="section-title">Class Result Completion</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Students</th>
                  <th>Subjects Done</th>
                  <th>Class Avg</th>
                </tr>
              </thead>
              <tbody>
                {summary.classRows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.name} <span className="small muted">({c.sectionName})</span>
                    </td>
                    <td>{c.studentCount}</td>
                    <td>
                      {c.totalSubjects > 0 ? `${c.subjectsDone} / ${c.totalSubjects} subjects` : "—"}
                    </td>
                    <td>{c.classAverage !== null ? `${c.classAverage}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Your Assignments</h3>
          {myAssignments && myAssignments.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssignments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.subject.name}</td>
                      <td>{a.classArm.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No assignments yet</h3>
              <p>Ask your Admin to assign you to a subject and class for this term.</p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warn" | "good" }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={tone === "warn" ? { color: "var(--warn)" } : tone === "good" ? { color: "var(--good)" } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
