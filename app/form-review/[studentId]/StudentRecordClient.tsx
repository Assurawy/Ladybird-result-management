"use client";

import Link from "next/link";
import { useState } from "react";

type Domain = { id: string; name: string; type: "AFFECTIVE" | "PSYCHOMOTOR" };

export default function StudentRecordClient({
  student,
  classArmId,
  sessionId,
  termId,
  domains,
  ratings,
  ratingLevels,
  attendance,
  fees,
}: {
  student: { id: string; name: string };
  classArmId: string;
  sessionId: string;
  termId: string;
  domains: Domain[];
  ratings: Record<string, string>;
  ratingLevels: string[];
  attendance: { totalDays: number; present: number; absent: number; late: number };
  fees: { nextFees: string; examFee: string };
}) {
  const [ratingState, setRatingState] = useState(ratings);
  const [att, setAtt] = useState(attendance);
  const [feeState, setFeeState] = useState(fees);
  const [saved, setSaved] = useState(false);

  async function saveAll() {
    setSaved(false);
    await Promise.all([
      fetch("/api/domain-scores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, classArmId, sessionId, termId, ratings: ratingState }),
      }),
      fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, classArmId, sessionId, termId, ...att }),
      }),
      fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, classArmId, sessionId, termId, nextFees: feeState.nextFees, examFee: feeState.examFee }),
      }),
    ]);
    setSaved(true);
  }

  return (
    <div>
      <Link href={`/form-review?classArmId=${classArmId}`} className="small" style={{ color: "var(--teal-soft)", display: "inline-block", marginBottom: 12 }}>
        ← Back to Class Review
      </Link>
      <h1 style={{ marginBottom: 16 }}>{student.name} — Term Record</h1>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Skills &amp; Behaviours</h3>
        <table className="data-table">
          <tbody>
            {domains.map((d) => (
              <tr key={d.id}>
                <td >
                  {d.name} <span className="small muted">({d.type === "AFFECTIVE" ? "Behaviour" : "Skill"})</span>
                </td>
                <td >
                  <select
                    className="field-input field-input-sm"
                    value={ratingState[d.id] ?? ""}
                    onChange={(e) => setRatingState({ ...ratingState, [d.id]: e.target.value })}
                  >
                    <option value="">—</option>
                    {ratingLevels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Attendance</h3>
        <div className="flex flex-wrap gap-3">
          {(["totalDays", "present", "absent", "late"] as const).map((k) => (
            <label key={k} style={{ display: "block" }}>
              <span className="field-label" style={{ textTransform: "capitalize" }}>{k}</span>
              <input
                type="number"
                min={0}
                className="field-input field-input-sm" style={{ width: 90 }}
                value={att[k]}
                onChange={(e) => setAtt({ ...att, [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Fees</h3>
        <div className="flex flex-wrap gap-3">
          <label style={{ display: "block" }}>
            <span className="field-label">Next Term Fee</span>
            <input className="field-input field-input-sm" style={{ width: 120 }} value={feeState.nextFees} onChange={(e) => setFeeState({ ...feeState, nextFees: e.target.value })} />
          </label>
          <label style={{ display: "block" }}>
            <span className="field-label">Exam Fee</span>
            <input className="field-input field-input-sm" style={{ width: 120 }} value={feeState.examFee} onChange={(e) => setFeeState({ ...feeState, examFee: e.target.value })} />
          </label>
        </div>
      </div>

      <button onClick={saveAll} className="btn btn-primary">
        Save
      </button>
      {saved && <span className="small" style={{ color: "var(--good)", marginLeft: 12 }}>Saved.</span>}
    </div>
  );
}
