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
      <h1 className="mb-4 text-2xl font-bold">Audit Log</h1>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="whitespace-nowrap p-3 text-xs text-slate-500">{l.createdAt.toLocaleString()}</td>
                <td className="p-3">{l.userName}</td>
                <td className="p-3">{l.role}</td>
                <td className="p-3">
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-xs">{l.action}</span>
                </td>
                <td className="p-3 text-xs text-slate-600">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
