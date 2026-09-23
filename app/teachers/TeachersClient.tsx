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
      <h1 style={{ marginBottom: 16 }}>Teachers &amp; Assignments</h1>
      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Subject Assignment</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Select label="Teacher" value={teacherId} onChange={setTeacherId} options={teachers} />
          <Select label="Subject" value={subjectId} onChange={setSubjectId} options={subjects} />
          <Select label="Class" value={classArmId} onChange={setClassArmId} options={classArms} />
          <button onClick={assign} className="btn btn-primary btn-sm">
            Assign
          </button>
        </div>
        <table className="data-table">
          <thead className="">
            <tr>
              <th >Teacher</th>
              <th >Subject</th>
              <th >Class</th>
              <th ></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td >{a.teacherName}</td>
                <td >{a.subjectName}</td>
                <td >{a.classArmName}</td>
                <td >
                  <button onClick={() => removeAssignment(a.id)} className="btn btn-danger btn-sm">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Form Teacher Assignment</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Select label="Teacher" value={ftTeacherId} onChange={setFtTeacherId} options={teachers} />
          <Select label="Class" value={ftClassArmId} onChange={setFtClassArmId} options={classArms} />
          <button onClick={assignFormTeacher} className="btn btn-primary btn-sm">
            Assign
          </button>
        </div>
        <table className="data-table">
          <thead className="">
            <tr>
              <th >Teacher</th>
              <th >Class</th>
              <th ></th>
            </tr>
          </thead>
          <tbody>
            {formAssignments.map((a) => (
              <tr key={a.id}>
                <td >{a.teacherName}</td>
                <td >{a.classArmName}</td>
                <td >
                  <button onClick={() => removeFormAssignment(a.id)} className="btn btn-danger btn-sm">
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
      <span className="field-label">{label}</span>
      <select className="field-input field-input-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
