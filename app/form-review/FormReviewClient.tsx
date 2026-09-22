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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Class Review</h1>
        <select
          className="rounded-md border px-3 py-2 text-sm"
          defaultValue={classArmId}
          onChange={(e) => router.push(`/form-review?classArmId=${e.target.value}`)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-4 grid grid-cols-3 gap-4">
        <StatCard label="Students" value={overview.students.length} />
        <StatCard label="Class Average" value={overview.classAverage !== null ? `${overview.classAverage}%` : "—"} />
        <StatCard label="Class Status" value={approvalStatus.replace("_", " ")} />
      </div>

      <div className="mb-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Subject</th>
              <th className="p-3">Entered</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {overview.subjectStatuses.map((s) => {
              const canAct = s.status === "SUBMITTED";
              return (
                <tr key={s.subjectId} className="border-t">
                  <td className="p-3">{s.subjectName}</td>
                  <td className="p-3">
                    {s.entered} / {s.totalStudents}
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs">{s.status.replace("_", " ")}</span>
                  </td>
                  <td className="p-3">
                    {canAct && (
                      <div className="flex gap-2">
                        <button disabled={!!busy} onClick={() => act(s.subjectId, "RETURN")} className="rounded border px-2 py-1 text-xs">
                          Return
                        </button>
                        <button disabled={!!busy} onClick={() => act(s.subjectId, "APPROVE")} className="rounded bg-navy px-2 py-1 text-xs text-white">
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

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Average</th>
              <th className="p-3">Position</th>
              <th className="p-3">Comment</th>
            </tr>
          </thead>
          <tbody>
            {overview.students.map((s) => (
              <tr key={s.id} className="border-t align-top">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.average ?? "—"}</td>
                <td className="p-3">{s.position ?? "—"}</td>
                <td className="p-3">
                  <textarea
                    className="w-full min-w-[220px] rounded border px-2 py-1 text-sm"
                    rows={2}
                    value={comments[s.id] ?? ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    onBlur={() => saveComment(s.id)}
                  />
                  <a href={`/form-review/${s.id}?classArmId=${classArmId}&sessionId=${sessionId}&termId=${termId}`} className="mt-1 inline-block text-xs text-navy underline">
                    Skills / Attendance / Fees →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        {canApproveClass ? (
          <button disabled={!!busy} onClick={approveClass} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">
            Approve Class &amp; Send to Admin/Principal
          </button>
        ) : (
          <span className="text-sm text-slate-500">{alreadyApproved ? "Class already approved." : "Approve every subject above before approving the class."}</span>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xl font-bold text-navy">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
