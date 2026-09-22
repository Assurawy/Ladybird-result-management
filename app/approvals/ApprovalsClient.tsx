"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Row = { classArmId: string; name: string; sectionName: string; studentCount: number; classAverage: number | null; status: string };

export default function ApprovalsClient({ rows, sessionId, termId, userRole }: { rows: Row[]; sessionId: string; termId: string; userRole: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPublish = ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"].includes(userRole);
  const canReopen = ["SUPER_ADMIN", "ADMIN"].includes(userRole);
  const eligible = rows.filter((r) => r.status === "FORM_APPROVED");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function publish(ids: string[]) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/approvals/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classArmIds: ids, sessionId, termId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Publish failed.");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  async function reopen(classArmId: string) {
    const reason = window.prompt("Reason for reopening this class's results (required):", "");
    if (!reason) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/approvals/reopen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classArmId, sessionId, termId, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Reopen failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Result Approvals</h1>
        <span className="text-sm text-slate-500">{eligible.length} class(es) awaiting final approval</span>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {canPublish && eligible.length > 0 && (
        <div className="mb-4 flex gap-2">
          <button
            disabled={busy || selected.size === 0}
            onClick={() => publish([...selected])}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            Publish Selected
          </button>
          <button disabled={busy} onClick={() => publish(eligible.map((r) => r.classArmId))} className="rounded bg-navy px-3 py-2 text-sm text-white">
            Publish All Eligible ({eligible.length})
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3"></th>
              <th className="p-3">Class</th>
              <th className="p-3">Students</th>
              <th className="p-3">Class Avg</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const canPublishRow = r.status === "FORM_APPROVED" && canPublish;
              const canReopenRow = (r.status === "PUBLISHED" || r.status === "LOCKED") && canReopen;
              return (
                <tr key={r.classArmId} className="border-t">
                  <td className="p-3">
                    {canPublishRow && <input type="checkbox" checked={selected.has(r.classArmId)} onChange={() => toggle(r.classArmId)} />}
                  </td>
                  <td className="p-3">
                    {r.name} <span className="text-xs text-slate-400">({r.sectionName})</span>
                  </td>
                  <td className="p-3">{r.studentCount}</td>
                  <td className="p-3">{r.classAverage !== null ? `${r.classAverage}%` : "—"}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs">{r.status.replace("_", " ")}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/form-review?classArmId=${r.classArmId}`} className="rounded border px-2 py-1 text-xs">
                        View
                      </Link>
                      {canPublishRow && (
                        <button disabled={busy} onClick={() => publish([r.classArmId])} className="rounded bg-navy px-2 py-1 text-xs text-white">
                          Publish
                        </button>
                      )}
                      {canReopenRow && (
                        <button disabled={busy} onClick={() => reopen(r.classArmId)} className="rounded border px-2 py-1 text-xs">
                          Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
