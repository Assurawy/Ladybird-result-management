"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Student = {
  id: string;
  admissionNo: string;
  name: string;
  className: string;
  classArmId: string;
  sectionName: string;
  sectionId: string;
  status: string;
  photoUrl: string | null;
};
type ClassArm = { id: string; name: string; sectionId: string; departmentId: string | null };

const STATUSES = ["Active", "Inactive", "Graduated", "Withdrawn", "Transferred"];

export default function StudentsClient({
  students,
  sections,
  classArms,
  currentSessionId,
}: {
  students: Student[];
  sections: { id: string; name: string }[];
  classArms: ClassArm[];
  currentSessionId: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ admissionNo: "", name: "", gender: "Male", sectionId: sections[0]?.id ?? "", classArmId: "" });
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [filterSectionId, setFilterSectionId] = useState("");
  const [filterClassArmId, setFilterClassArmId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const classArmOptions = classArms.filter((c) => c.sectionId === form.sectionId);
  const filterClassOptions = classArms.filter((c) => !filterSectionId || c.sectionId === filterSectionId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterSectionId && s.sectionId !== filterSectionId) return false;
      if (filterClassArmId && s.classArmId !== filterClassArmId) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.admissionNo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, filterSectionId, filterClassArmId, filterStatus, search]);

  async function addStudent() {
    setError(null);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sessionId: currentSessionId }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error?.toString() ?? "Failed to add student.");
      return;
    }
    setForm({ admissionNo: "", name: "", gender: "Male", sectionId: sections[0]?.id ?? "", classArmId: "" });
    setShowForm(false);
    router.refresh();
  }

  async function uploadPhoto(studentId: string, file: File) {
    setUploadingId(studentId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "student-photo");
    fd.append("referenceId", studentId);
    const res = await fetch("/api/media/upload", { method: "POST", body: fd });
    setUploadingId(null);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error?.toString() ?? "Upload failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1>Students</h1>
          <p className="small muted">{filtered.length} of {students.length} shown</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => alert("Bulk import is planned but not built yet — add students one at a time above for now.")}
          >
            Import / Bulk Add
          </button>
          <button onClick={() => setShowForm((s) => !s)} className="btn btn-primary btn-sm">
            {showForm ? "Cancel" : "+ Add Student"}
          </button>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <div className="card">
          <div className="form-grid-5">
            <div>
              <label className="field-label">Admission No</label>
              <input className="field-input" value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} />
            </div>
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
              <label className="field-label">Section</label>
              <select className="field-input" value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value, classArmId: "" })}>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Class</label>
              <select className="field-input" value={form.classArmId} onChange={(e) => setForm({ ...form, classArmId: e.target.value })}>
                <option value="">—</option>
                {classArmOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={addStudent} className="btn btn-primary" style={{ marginTop: 14 }}>
            Save Student
          </button>
        </div>
      )}

      <div className="filter-bar">
        <select className="field-input field-input-sm" style={{ width: "auto" }} value={filterSectionId} onChange={(e) => { setFilterSectionId(e.target.value); setFilterClassArmId(""); }}>
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="field-input field-input-sm" style={{ width: "auto" }} value={filterClassArmId} onChange={(e) => setFilterClassArmId(e.target.value)}>
          <option value="">All Classes</option>
          {filterClassOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="field-input field-input-sm" style={{ width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input className="field-input field-input-sm" style={{ flex: 1, minWidth: 180 }} placeholder="Search name or admission no." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Admission No</th>
              <th>Name</th>
              <th>Class</th>
              <th>Section</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <label style={{ cursor: "pointer" }}>
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt="" className="avatar-photo" style={{ borderRadius: "50%" }} />
                    ) : (
                      <div className="avatar-fallback">{s.name[0]}</div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={uploadingId === s.id}
                      onChange={(e) => e.target.files?.[0] && uploadPhoto(s.id, e.target.files[0])}
                    />
                  </label>
                </td>
                <td>{s.admissionNo}</td>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td>{s.className}</td>
                <td>{s.sectionName}</td>
                <td>
                  <span className={`status-badge status-${s.status.toLowerCase()}`}>{s.status}</span>
                </td>
                <td>
                  <Link href={`/students/${s.id}`} className="btn btn-ghost btn-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <h3>No students match</h3>
                    <p>Try clearing a filter or search term.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
