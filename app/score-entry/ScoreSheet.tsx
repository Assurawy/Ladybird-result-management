"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Assignment = { subjectId: string; subjectName: string; classArmId: string; classArmName: string };
type Component = { id: string; name: string; maxScore: number };
type Row = {
  studentId: string;
  studentName: string;
  components: Record<string, number | null>;
  attendanceState: "ABSENT" | "EXCUSED" | null;
  total: number;
  isComplete: boolean;
  grade: string;
};

export default function ScoreSheet({
  assignments,
  subjectId,
  classArmId,
  sessionId,
  termId,
}: {
  assignments: Assignment[];
  subjectId: string;
  classArmId: string;
  sessionId: string;
  termId: string;
}) {
  const router = useRouter();
  const [components, setComponents] = useState<Component[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [locked, setLocked] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/scores?subjectId=${subjectId}&classArmId=${classArmId}&sessionId=${sessionId}&termId=${termId}`)
      .then((r) => r.json())
      .then((data) => {
        setComponents(data.scheme?.components ?? []);
        setRows(data.rows ?? []);
        setStatus(data.status);
        setLocked(data.locked);
        setLoading(false);
      });
  }, [subjectId, classArmId, sessionId, termId]);

  function switchPair(value: string) {
    const [s, c] = value.split("::");
    router.push(`/score-entry?subjectId=${s}&classArmId=${c}`);
  }

  async function saveRow(row: Row) {
    setSaveIndicator("Saving…");
    const res = await fetch("/api/scores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        classArmId,
        sessionId,
        termId,
        studentId: row.studentId,
        components: row.components,
        attendanceState: row.attendanceState,
      }),
    });
    setSaveIndicator(res.ok ? "All changes saved" : "Save failed — retrying may help");
  }

  function updateCell(studentId: string, componentId: string, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const next = { ...r, components: { ...r.components, [componentId]: value === "" ? null : Number(value) } };
        saveRow(next);
        return next;
      })
    );
  }

  function updateAttendance(studentId: string, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const next = { ...r, attendanceState: (value || null) as Row["attendanceState"] };
        saveRow(next);
        return next;
      })
    );
  }

  async function submit() {
    const res = await fetch("/api/scores/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, classArmId, sessionId, termId }),
    });
    if (res.ok) setStatus("SUBMITTED");
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;

  const incompleteCount = rows.filter((r) => !r.isComplete).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Score Entry</h1>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium">{status}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="rounded-md border px-3 py-2 text-sm" onChange={(e) => switchPair(e.target.value)} defaultValue={`${subjectId}::${classArmId}`}>
          {assignments.map((a) => (
            <option key={`${a.subjectId}::${a.classArmId}`} value={`${a.subjectId}::${a.classArmId}`}>
              {a.subjectName} — {a.classArmName}
            </option>
          ))}
        </select>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${incompleteCount > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
          {incompleteCount > 0 ? `${incompleteCount} student(s) incomplete` : "All scores complete"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="sticky left-0 bg-slate-100 p-3">Student</th>
              {components.map((c) => (
                <th key={c.id} className="p-3">
                  {c.name} <span className="text-slate-400">/{c.maxScore}</span>
                </th>
              ))}
              <th className="p-3">Total</th>
              <th className="p-3">Grade</th>
              <th className="p-3">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} className="border-t">
                <td className="sticky left-0 bg-white p-3 font-medium">{r.studentName}</td>
                {components.map((c) => (
                  <td key={c.id} className="p-2">
                    <input
                      type="number"
                      min={0}
                      max={c.maxScore}
                      disabled={locked || !!r.attendanceState}
                      value={r.components[c.id] ?? ""}
                      onChange={(e) => updateCell(r.studentId, c.id, e.target.value)}
                      className="w-16 rounded border px-2 py-1"
                    />
                  </td>
                ))}
                <td className="p-3 font-semibold">
                  {r.attendanceState ? <span className="rounded bg-amber-100 px-2 py-1 text-xs">{r.attendanceState}</span> : r.isComplete ? r.total : <span className="text-slate-400">incomplete</span>}
                </td>
                <td className="p-3">{r.grade}</td>
                <td className="p-3">
                  <select
                    disabled={locked}
                    value={r.attendanceState ?? ""}
                    onChange={(e) => updateAttendance(r.studentId, e.target.value)}
                    className="rounded border px-2 py-1"
                  >
                    <option value="">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="EXCUSED">Excused</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">{saveIndicator || "All changes saved"}</span>
        {locked ? (
          <span className="rounded bg-slate-200 px-3 py-1 text-sm">Locked for editing — status: {status}</span>
        ) : (
          <button onClick={submit} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">
            Submit to Form Teacher
          </button>
        )}
      </div>
    </div>
  );
}
