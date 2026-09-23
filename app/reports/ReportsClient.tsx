"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Student = { id: string; name: string; admissionNo: string; average: number | null };

export default function ReportsClient({
  classes,
  classArmId,
  students,
  templates,
  sessionId,
  termId,
}: {
  classes: { id: string; name: string }[];
  classArmId: string;
  students: Student[];
  templates: { id: string; name: string; isDefault: boolean }[];
  sessionId: string;
  termId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState(templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? "");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function printUrl(ids: string[]) {
    const params = new URLSearchParams({ classArmId, sessionId, termId, templateId, ids: ids.join(",") });
    return `/reports/print?${params.toString()}`;
  }

  return (
    <div>
      <div className="page-header-row">
        <h1>Report Cards</h1>
        <select className="field-input field-input-sm" style={{ width: "auto" }} defaultValue={classArmId} onChange={(e) => router.push(`/reports?classArmId=${e.target.value}`)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-bar">
        <label className="small muted">Template:</label>
        <select className="field-input field-input-sm" style={{ width: "auto" }} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <a href={printUrl([...selected])} target="_blank" rel="noreferrer" className={`btn btn-ghost btn-sm ${selected.size === 0 ? "pointer-events-none opacity-50" : ""}`}>
          Print Selected
        </a>
        <a href={printUrl(students.map((s) => s.id))} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
          Print Whole Class
        </a>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Admission No.</th>
              <th>Average</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                </td>
                <td>{s.name}</td>
                <td>{s.admissionNo}</td>
                <td>{s.average !== null ? `${s.average}%` : "—"}</td>
                <td>
                  <a href={printUrl([s.id])} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    Preview
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
