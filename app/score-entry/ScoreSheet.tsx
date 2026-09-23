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

  if (loading) return <p className="muted">Loading…</p>;

  const incompleteCount = rows.filter((r) => !r.isComplete).length;

  return (
    <div>
      <div className="page-header-row">
        <h1>Score Entry</h1>
        <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>
      </div>

      <div className="filter-bar">
        <select className="field-input field-input-sm" style={{ width: "auto" }} onChange={(e) => switchPair(e.target.value)} defaultValue={`${subjectId}::${classArmId}`}>
          {assignments.map((a) => (
            <option key={`${a.subjectId}::${a.classArmId}`} value={`${a.subjectId}::${a.classArmId}`}>
              {a.subjectName} — {a.classArmName}
            </option>
          ))}
        </select>
        <span className={`chip ${incompleteCount > 0 ? "chip-warn" : "chip-good"}`}>
          {incompleteCount > 0 ? `${incompleteCount} student(s) incomplete` : "All scores complete"}
        </span>
      </div>

      <div className="table-wrap score-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sticky-col">Student</th>
              {components.map((c) => (
                <th key={c.id}>
                  {c.name} <span className="muted">/{c.maxScore}</span>
                </th>
              ))}
              <th>Total</th>
              <th>Grade</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId}>
                <td className="sticky-col" style={{ fontWeight: 600 }}>{r.studentName}</td>
                {components.map((c) => (
                  <td key={c.id}>
                    <input
                      type="number"
                      min={0}
                      max={c.maxScore}
                      disabled={locked || !!r.attendanceState}
                      value={r.components[c.id] ?? ""}
                      onChange={(e) => updateCell(r.studentId, c.id, e.target.value)}
                      className="score-input"
                    />
                  </td>
                ))}
                <td style={{ fontWeight: 700 }}>
                  {r.attendanceState ? <span className="chip chip-warn">{r.attendanceState}</span> : r.isComplete ? r.total : <span className="muted">incomplete</span>}
                </td>
                <td>{r.grade}</td>
                <td>
                  <select
                    disabled={locked}
                    value={r.attendanceState ?? ""}
                    onChange={(e) => updateAttendance(r.studentId, e.target.value)}
                    className="field-input field-input-sm"
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

      <div className="card-footer" style={{ background: "transparent", boxShadow: "none", border: "none", padding: "14px 0 0" }}>
        <span className="small muted">{saveIndicator || "All changes saved"}</span>
        {locked ? (
          <span className="chip">Locked for editing — status: {status}</span>
        ) : (
          <button onClick={submit} className="btn btn-primary">
            Submit to Form Teacher
          </button>
        )}
      </div>
    </div>
  );
}
