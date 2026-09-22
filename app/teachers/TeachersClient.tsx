"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Ref = { id: string; name: string };
type Assignment = { id: string; teacherName: string; subjectName: string; classArmName: string };
type FormAssignment = { id: string; teacherName: string; classArmName: string };

export default function TeachersClient({
  teachers,
  subjects,
  classArms,
  assignments,
  formAssignments,
  sessionId,
  termId,
}: {
  teachers: Ref[];
  subjects: Ref[];
  classArms: Ref[];
  assignments: Assignment[];
  formAssignments: FormAssignment[];
  sessionId: string;
  termId: string;
}) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [classArmId, setClassArmId] = useState(classArms[0]?.id ?? "");
  const [ftTeacherId, setFtTeacherId] = useState(teachers[0]?.id ?? "");
  const [ftClassArmId, setFtClassArmId] = useState(classArms[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  async function assign() {
    setError(null);
    const res = await fetch("/api/teachers/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, subjectId, classArmId, sessionId, termId }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  async function removeAssignment(id: string) {
    await fetch(`/api/teachers/assignments?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function assignFormTeacher() {
    setError(null);
    const res = await fetch("/api/teachers/form-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: ftTeacherId, classArmId: ftClassArmId, sessionId }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  async function removeFormAssignment(id: string) {
    await fetch(`/api/teachers/form-assignments?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Teachers &amp; Assignments</h1>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Subject Assignment</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Select label="Teacher" value={teacherId} onChange={setTeacherId} options={teachers} />
          <Select label="Subject" value={subjectId} onChange={setSubjectId} options={subjects} />
          <Select label="Class" value={classArmId} onChange={setClassArmId} options={classArms} />
          <button onClick={assign} className="rounded bg-navy px-3 py-2 text-sm text-white">
            Assign
          </button>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-2">Teacher</th>
              <th className="p-2">Subject</th>
              <th className="p-2">Class</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.teacherName}</td>
                <td className="p-2">{a.subjectName}</td>
                <td className="p-2">{a.classArmName}</td>
                <td className="p-2">
                  <button onClick={() => removeAssignment(a.id)} className="text-xs text-red-600">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-semibold">Form Teacher Assignment</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Select label="Teacher" value={ftTeacherId} onChange={setFtTeacherId} options={teachers} />
          <Select label="Class" value={ftClassArmId} onChange={setFtClassArmId} options={classArms} />
          <button onClick={assignFormTeacher} className="rounded bg-navy px-3 py-2 text-sm text-white">
            Assign
          </button>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-2">Teacher</th>
              <th className="p-2">Class</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {formAssignments.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.teacherName}</td>
                <td className="p-2">{a.classArmName}</td>
                <td className="p-2">
                  <button onClick={() => removeFormAssignment(a.id)} className="text-xs text-red-600">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Ref[] }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      <select className="rounded border px-2 py-2" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
