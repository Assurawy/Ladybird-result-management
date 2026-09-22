import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isWholeSchoolRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/AppShell";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whole = isWholeSchoolRole(session.role);
  const school = await prisma.schoolSetting.findFirst();

  const [studentCount, teacherCount, myAssignments] = await Promise.all([
    whole ? prisma.student.count() : Promise.resolve(null),
    whole ? prisma.user.count({ where: { role: "TEACHER", active: true } }) : Promise.resolve(null),
    !whole
      ? prisma.teacherAssignment.findMany({
          where: { teacherId: session.id, active: true, sessionId: school?.currentSessionId ?? undefined },
          include: { subject: true, classArm: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <AppShell user={session}>
      <h1 className="mb-1 text-2xl font-bold">Welcome, {session.name}</h1>
      <p className="mb-6 text-slate-500">{school?.name || "Ladybird Whole-School System"}</p>

      {whole ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Students" value={studentCount ?? 0} />
          <StatCard label="Teachers" value={teacherCount ?? 0} />
        </div>
      ) : (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Your Assignments</h2>
          {myAssignments && myAssignments.length > 0 ? (
            <ul className="divide-y rounded-lg border bg-white">
              {myAssignments.map((a) => (
                <li key={a.id} className="p-3">
                  {a.subject.name} — {a.classArm.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No subject assignments yet for this term.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-2xl font-bold text-navy">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
