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
      <div className="page-header-row">
        <h1>Result Approvals</h1>
        <span className="small muted">{eligible.length} class(es) awaiting final approval</span>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {canPublish && eligible.length > 0 && (
        <div className="page-header-actions" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button disabled={busy || selected.size === 0} onClick={() => publish([...selected])} className="btn btn-ghost btn-sm">
            Publish Selected
          </button>
          <button disabled={busy} onClick={() => publish(eligible.map((r) => r.classArmId))} className="btn btn-primary btn-sm">
            Publish All Eligible ({eligible.length})
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Class</th>
              <th>Students</th>
              <th>Class Avg</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const canPublishRow = r.status === "FORM_APPROVED" && canPublish;
              const canReopenRow = (r.status === "PUBLISHED" || r.status === "LOCKED") && canReopen;
              return (
                <tr key={r.classArmId}>
                  <td>{canPublishRow && <input type="checkbox" checked={selected.has(r.classArmId)} onChange={() => toggle(r.classArmId)} />}</td>
                  <td>
                    {r.name} <span className="small muted">({r.sectionName})</span>
                  </td>
                  <td>{r.studentCount}</td>
                  <td>{r.classAverage !== null ? `${r.classAverage}%` : "—"}</td>
                  <td>
                    <span className={`status-badge status-${r.status.toLowerCase()}`}>{r.status.replace(/_/g, " ")}</span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <Link href={`/form-review?classArmId=${r.classArmId}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                      {canPublishRow && (
                        <button disabled={busy} onClick={() => publish([r.classArmId])} className="btn btn-primary btn-sm">
                          Publish
                        </button>
                      )}
                      {canReopenRow && (
                        <button disabled={busy} onClick={() => reopen(r.classArmId)} className="btn btn-ghost btn-sm">
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
