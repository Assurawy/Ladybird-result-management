"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Student = { id: string; admissionNo: string; name: string; className: string; sectionName: string; status: string; photoUrl: string | null };
type ClassArm = { id: string; name: string; sectionId: string; departmentId: string | null };

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

  const classArmOptions = classArms.filter((c) => c.sectionId === form.sectionId);

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <button onClick={() => setShowForm((s) => !s)} className="rounded bg-navy px-3 py-2 text-sm text-white">
          {showForm ? "Cancel" : "+ Add Student"}
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Admission No</span>
              <input className="rounded border px-2 py-1" value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Name</span>
              <input className="rounded border px-2 py-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Gender</span>
              <select className="rounded border px-2 py-1" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option>Male</option>
                <option>Female</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Section</span>
              <select className="rounded border px-2 py-1" value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value, classArmId: "" })}>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-500">Class</span>
              <select className="rounded border px-2 py-1" value={form.classArmId} onChange={(e) => setForm({ ...form, classArmId: e.target.value })}>
                <option value="">—</option>
                {classArmOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={addStudent} className="rounded bg-navy px-3 py-2 text-sm text-white">
              Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3"></th>
              <th className="p-3">Admission No</th>
              <th className="p-3">Name</th>
              <th className="p-3">Class</th>
              <th className="p-3">Section</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">
                  <label className="cursor-pointer">
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs">{s.name[0]}</div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingId === s.id}
                      onChange={(e) => e.target.files?.[0] && uploadPhoto(s.id, e.target.files[0])}
                    />
                  </label>
                </td>
                <td className="p-3">{s.admissionNo}</td>
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.className}</td>
                <td className="p-3">{s.sectionName}</td>
                <td className="p-3">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
