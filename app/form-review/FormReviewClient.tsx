"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SubjectStatus = { subjectId: string; subjectName: string; status: string; entered: number; totalStudents: number };
type StudentRow = { id: string; name: string; average: number | null; position: number | null; comment: string };

export default function FormReviewClient({
  classes,
  classArmId,
  sessionId,
  termId,
  overview,
  approvalStatus,
}: {
  classes: { id: string; name: string }[];
  classArmId: string;
  sessionId: string;
  termId: string;
  overview: { classAverage: number | null; subjectStatuses: SubjectStatus[]; students: StudentRow[] };
  approvalStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>(Object.fromEntries(overview.students.map((s) => [s.id, s.comment])));

  async function act(subjectId: string, action: "APPROVE" | "RETURN") {
    setBusy(subjectId + action);
    setError(null);
    const reason = action === "RETURN" ? window.prompt("Reason for returning this subject for correction (optional):", "") ?? undefined : undefined;
    const res = await fetch("/api/approvals/subject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classArmId, subjectId, sessionId, termId, action, reason }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed.");
      return;
    }
    router.refresh();
  }

  async function approveClass() {
    setBusy("class");
    setError(null);
    const res = await fetch("/api/approvals/class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classArmId, sessionId, termId }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not approve class.");
      return;
    }
    router.refresh();
  }

  async function saveComment(studentId: string) {
    await fetch("/api/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, classArmId, sessionId, termId, formTeacherComment: comments[studentId] }),
    });
  }

  const actionableStatuses = overview.subjectStatuses.filter((s) => s.status !== "UNASSIGNED");
  const allApproved = actionableStatuses.length > 0 && actionableStatuses.every((s) => ["APPROVED", "ADMIN_REVIEW", "PUBLISHED", "LOCKED"].includes(s.status));
  const alreadyApproved = ["FORM_APPROVED", "PUBLISHED", "LOCKED"].includes(approvalStatus);
  const canApproveClass = allApproved && !alreadyApproved;

  return (
    <div>
      <div className="page-header-row">
        <h1>Class Review</h1>
        <select className="field-input field-input-sm" style={{ width: "auto" }} defaultValue={classArmId} onChange={(e) => router.push(`/form-review?classArmId=${e.target.value}`)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="stat-grid stat-grid-compact">
        <StatCard label="Students" value={overview.students.length} />
        <StatCard label="Class Average" value={overview.classAverage !== null ? `${overview.classAverage}%` : "—"} />
        <StatCard label="Class Status" value={approvalStatus.replace(/_/g, " ")} />
      </div>

      <h3 className="section-title">Subjects</h3>
      <div className="table-wrap" style={{ marginBottom: 22 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Entered</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {overview.subjectStatuses.map((s) => {
              const canAct = s.status === "SUBMITTED";
              return (
                <tr key={s.subjectId}>
                  <td>{s.subjectName}</td>
                  <td>
                    {s.entered} / {s.totalStudents}
                  </td>
                  <td>
                    <span className={`status-badge status-${s.status.toLowerCase()}`}>{s.status.replace(/_/g, " ")}</span>
                  </td>
                  <td>
                    {canAct && (
                      <div className="actions-cell">
                        <button disabled={!!busy} onClick={() => act(s.subjectId, "RETURN")} className="btn btn-ghost btn-sm">
                          Return
                        </button>
                        <button disabled={!!busy} onClick={() => act(s.subjectId, "APPROVE")} className="btn btn-primary btn-sm">
                          Approve
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Students</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Average</th>
              <th>Position</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {overview.students.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td>{s.average ?? "—"}</td>
                <td>{s.position ?? "—"}</td>
                <td>
                  <textarea
                    className="field-input field-input-sm"
                    style={{ width: "100%", minWidth: 220 }}
                    rows={2}
                    value={comments[s.id] ?? ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    onBlur={() => saveComment(s.id)}
                  />
                  <a href={`/form-review/${s.id}?classArmId=${classArmId}&sessionId=${sessionId}&termId=${termId}`} className="small" style={{ color: "var(--teal-soft)", display: "inline-block", marginTop: 4 }}>
                    Skills / Attendance / Fees →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 18 }}>
        {canApproveClass ? (
          <button disabled={!!busy} onClick={approveClass} className="btn btn-primary">
            Approve Class &amp; Send to Admin/Principal
          </button>
        ) : (
          <span className="small muted">{alreadyApproved ? "Class already approved." : "Approve every subject above before approving the class."}</span>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ fontSize: 20 }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
