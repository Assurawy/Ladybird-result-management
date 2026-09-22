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
      <Link href={`/form-review?classArmId=${classArmId}`} className="mb-4 inline-block text-sm text-navy underline">
        ← Back to Class Review
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{student.name} — Term Record</h1>

      <div className="mb-4 rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Skills &amp; Behaviours</h2>
        <table className="w-full text-sm">
          <tbody>
            {domains.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="w-1/2 p-2">
                  {d.name} <span className="text-xs text-slate-400">({d.type === "AFFECTIVE" ? "Behaviour" : "Skill"})</span>
                </td>
                <td className="p-2">
                  <select
                    className="rounded border px-2 py-1"
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

      <div className="mb-4 rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Attendance</h2>
        <div className="flex flex-wrap gap-3">
          {(["totalDays", "present", "absent", "late"] as const).map((k) => (
            <label key={k} className="text-sm">
              <span className="mb-1 block capitalize text-slate-500">{k}</span>
              <input
                type="number"
                min={0}
                className="w-24 rounded border px-2 py-1"
                value={att[k]}
                onChange={(e) => setAtt({ ...att, [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-lg border bg-white p-4">
        <h2 className="mb-2 font-semibold">Fees</h2>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Next Term Fee</span>
            <input className="w-32 rounded border px-2 py-1" value={feeState.nextFees} onChange={(e) => setFeeState({ ...feeState, nextFees: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Exam Fee</span>
            <input className="w-32 rounded border px-2 py-1" value={feeState.examFee} onChange={(e) => setFeeState({ ...feeState, examFee: e.target.value })} />
          </label>
        </div>
      </div>

      <button onClick={saveAll} className="rounded bg-navy px-4 py-2 text-sm font-medium text-white">
        Save
      </button>
      {saved && <span className="ml-3 text-sm text-emerald-600">Saved.</span>}
    </div>
  );
}
