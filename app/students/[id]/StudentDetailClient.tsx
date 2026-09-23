"use client";

import Link from "next/link";
import { useState } from "react";

type Student = {
  id: string;
  admissionNo: string;
  name: string;
  gender: string;
  dob: string | null;
  guardianPhone: string | null;
  address: string | null;
  status: string;
  photoUrl: string | null;
  className: string;
  sectionName: string;
  departmentName: string | null;
};
type Enrollment = { id: string; sessionName: string; className: string; date: string };

const STATUSES = ["Active", "Inactive", "Graduated", "Withdrawn", "Transferred"];

export default function StudentDetailClient({ student, enrollments }: { student: Student; enrollments: Enrollment[] }) {
  const [form, setForm] = useState({
    name: student.name,
    gender: student.gender,
    dob: student.dob ?? "",
    guardianPhone: student.guardianPhone ?? "",
    address: student.address ?? "",
    status: student.status,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error?.toString() ?? "Failed to save.");
      return;
    }
    setSaved(true);
  }

  return (
    <div>
      <Link href="/students" className="small" style={{ color: "var(--teal-soft)", display: "inline-block", marginBottom: 12 }}>
        ← Back to Students
      </Link>

      <div className="page-header-row">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {student.photoUrl ? (
            <img src={student.photoUrl} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div className="avatar-fallback" style={{ width: 56, height: 56, fontSize: 20 }}>
              {student.name[0]}
            </div>
          )}
          <div>
            <h1>{student.name}</h1>
            <p className="small muted">
              {student.admissionNo} · {student.className} ({student.sectionName}
              {student.departmentName ? `, ${student.departmentName}` : ""})
            </p>
          </div>
        </div>
        <span className={`status-badge status-${student.status.toLowerCase()}`}>{student.status}</span>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
      {saved && <div className="banner">Saved.</div>}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Details</h3>
        <div className="form-grid-3">
          <div>
            <label className="field-label">Name</label>
            <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Gender</label>
            <select className="field-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div>
            <label className="field-label">Date of Birth</label>
            <input type="date" className="field-input" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Guardian Phone</label>
            <input className="field-input" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
          </div>
          <div className="span-2">
            <label className="field-label">Address</label>
            <input className="field-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="field-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={save} className="btn btn-primary" style={{ marginTop: 14 }}>
          Save Changes
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Enrollment History</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Class</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <td>{e.sessionName}</td>
                  <td>{e.className}</td>
                  <td className="small muted">{new Date(e.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
