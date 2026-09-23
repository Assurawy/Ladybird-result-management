import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWholeSchoolRole } from "@/lib/permissions";
import AppShell from "@/components/AppShell";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isWholeSchoolRole(session.role)) redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <AppShell user={session}>
      <h1 style={{ marginBottom: 16 }}>Audit Log</h1>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="small muted" style={{ whiteSpace: "nowrap" }}>{l.createdAt.toLocaleString()}</td>
                <td>{l.userName}</td>
                <td>{l.role}</td>
                <td>
                  <span className="chip">{l.action}</span>
                </td>
                <td className="small muted">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
