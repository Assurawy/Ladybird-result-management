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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Report Cards</h1>
        <select className="rounded-md border px-3 py-2 text-sm" defaultValue={classArmId} onChange={(e) => router.push(`/reports?classArmId=${e.target.value}`)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-500">Template:</label>
        <select className="rounded-md border px-2 py-1 text-sm" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <a
          href={printUrl([...selected])}
          target="_blank"
          rel="noreferrer"
          className={`rounded border px-3 py-1 text-sm ${selected.size === 0 ? "pointer-events-none opacity-50" : ""}`}
        >
          Print Selected
        </a>
        <a href={printUrl(students.map((s) => s.id))} target="_blank" rel="noreferrer" className="rounded bg-navy px-3 py-1 text-sm text-white">
          Print Whole Class
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3"></th>
              <th className="p-3">Name</th>
              <th className="p-3">Admission No.</th>
              <th className="p-3">Average</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                </td>
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.admissionNo}</td>
                <td className="p-3">{s.average !== null ? `${s.average}%` : "—"}</td>
                <td className="p-3">
                  <a href={printUrl([s.id])} target="_blank" rel="noreferrer" className="rounded border px-2 py-1 text-xs">
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
