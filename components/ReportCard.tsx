import type { ReportData } from "@/lib/report-data";

const THEMES: Record<string, { primary: string; accent: string; font: string; frame: string }> = {
  "classic-navy": { primary: "#0B2545", accent: "#B8933A", font: "Georgia, serif", frame: "double" },
  "modern-teal": { primary: "#0F766E", accent: "#0D9488", font: "Helvetica, Arial, sans-serif", frame: "solid" },
  "royal-purple": { primary: "#4C1D95", accent: "#A78BFA", font: "Georgia, serif", frame: "double" },
  "crimson-gold": { primary: "#7F1D1D", accent: "#D4AF37", font: "Georgia, serif", frame: "double" },
  "corporate-slate": { primary: "#334155", accent: "#64748B", font: "Helvetica, Arial, sans-serif", frame: "solid" },
  "elegant-serif": { primary: "#1F2937", accent: "#9CA3AF", font: "'Times New Roman', serif", frame: "solid" },
  "sunburst-orange": { primary: "#C2410C", accent: "#FB923C", font: "Verdana, sans-serif", frame: "solid" },
  "forest-green": { primary: "#14532D", accent: "#65A30D", font: "Georgia, serif", frame: "solid" },
  "minimal-mono": { primary: "#111827", accent: "#6B7280", font: "'Courier New', monospace", frame: "none" },
  "double-frame-formal": { primary: "#5B21B6", accent: "#B8933A", font: "Georgia, serif", frame: "double" },
};

export default function ReportCard({ data }: { data: ReportData }) {
  const theme = THEMES[data.template?.style ?? "classic-navy"] ?? THEMES["classic-navy"];
  const border = theme.frame === "double" ? `4px double ${theme.primary}` : theme.frame === "solid" ? `2px solid ${theme.primary}` : "1px solid #ddd";
  const totalFees = (Number(data.nextFees) || 0) + (Number(data.examFee) || 0);

  return (
    <div
      className="report-card relative mx-auto my-4 max-w-3xl bg-white p-6 text-sm text-slate-900"
      style={{ border, fontFamily: theme.font }}
    >
      {data.school?.logoUrl && (
        <img src={data.school.logoUrl} alt="" className="pointer-events-none absolute inset-0 m-auto h-40 w-40 opacity-5" />
      )}

      <div className="relative flex items-start gap-4 border-b pb-3" style={{ borderColor: theme.primary }}>
        {data.school?.logoUrl ? (
          <img src={data.school.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ background: theme.primary }}>
            {(data.school?.name || "L")[0]}
          </div>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold" style={{ color: theme.primary }}>
            {data.school?.name}
          </h1>
          <p className="text-xs text-slate-600">{data.school?.address}</p>
          {data.school?.phone && <p className="text-xs text-slate-600">Tel: {data.school.phone}</p>}
          {data.school?.motto && <p className="text-xs italic text-slate-500">Motto: {data.school.motto}</p>}
        </div>
        {data.template?.showPhoto &&
          (data.student.photoUrl ? (
            <img src={data.student.photoUrl} alt="" className="h-20 w-16 rounded object-cover" />
          ) : (
            <div className="flex h-20 w-16 items-center justify-center rounded bg-slate-200 text-lg font-bold">{data.student.name[0]}</div>
          ))}
      </div>

      <div className="relative my-2 text-center text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
        Terminal Report — {data.template?.name}
      </div>

      <div className="relative grid grid-cols-2 gap-x-4 gap-y-1 border-y py-2 text-xs sm:grid-cols-5" style={{ borderColor: theme.primary }}>
        <InfoCell label="Name" value={data.student.name} />
        <InfoCell label="Sex" value={data.student.gender || "—"} />
        <InfoCell label="Age" value={data.age ?? "—"} />
        <InfoCell label="Class" value={data.classArm.name} />
        <InfoCell label="No. in Class" value={data.classSize} />
        <InfoCell label="Term" value={data.termName} />
        <InfoCell label="Session" value={data.academicSessionName} />
        <InfoCell label="Next Term Begins" value={data.term?.nextTermStartDate || "—"} />
        <InfoCell label="Average" value={data.overall.average !== null ? `${data.overall.average}%` : "—"} />
        <InfoCell label="Position" value={data.position ? `${data.ordinalPosition} of ${data.classSize}` : "—"} />
      </div>

      <table className="relative mt-3 w-full border-collapse text-xs">
        <thead>
          <tr style={{ background: theme.primary, color: "white" }}>
            <th className="border px-1 py-1 text-left">Subject</th>
            {data.subjectRows[0]?.componentValues.map((c, i) => (
              <th key={i} className="border px-1 py-1">
                {c.name}
              </th>
            ))}
            <th className="border px-1 py-1">Total</th>
            <th className="border px-1 py-1">Grade</th>
            <th className="border px-1 py-1">Class Avg</th>
            <th className="border px-1 py-1">Position</th>
            <th className="border px-1 py-1">Remark</th>
          </tr>
        </thead>
        <tbody>
          {data.subjectRows.map((r, i) => (
            <tr key={i} className="odd:bg-slate-50">
              <td className="border px-1 py-1 font-medium">{r.subjectName}</td>
              {r.componentValues.map((c, j) => (
                <td key={j} className="border px-1 py-1 text-center">
                  {c.value ?? "—"}
                </td>
              ))}
              <td className="border px-1 py-1 text-center font-bold">{r.display}</td>
              <td className="border px-1 py-1 text-center">{r.grade}</td>
              <td className="border px-1 py-1 text-center">{r.classAverage ?? "—"}</td>
              <td className="border px-1 py-1 text-center">{r.position ? ordinal(r.position) : "—"}</td>
              <td className="border px-1 py-1">{r.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="relative mt-2 flex flex-wrap gap-2 text-[10px] text-slate-600">
        {data.gradingBands.map((b) => (
          <span key={b.id}>
            {b.grade}: {b.min}-{b.max} ({b.remark})
          </span>
        ))}
      </div>

      {data.template?.showAffective && (data.affective.length > 0 || data.psychomotor.length > 0) && (
        <div className="relative mt-3 grid grid-cols-2 gap-4">
          <DomainGrid title="Behaviours" domains={data.affective} levels={data.ratingLevels} />
          <DomainGrid title="Skills" domains={data.psychomotor} levels={data.ratingLevels} />
        </div>
      )}

      {data.template?.showAttendance && (
        <div className="relative mt-2 text-xs">
          Attendance: <strong>{data.attendance?.present ?? "—"}</strong> / <strong>{data.attendance?.totalDays ?? "—"}</strong> days present
          {data.attendance?.late ? ` · Late: ${data.attendance.late}` : ""}
        </div>
      )}

      <div className="relative mt-3 grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="font-semibold" style={{ color: theme.primary }}>
            Form Teacher&apos;s Comment
          </span>
          <p>{data.formTeacherComment || "—"}</p>
        </div>
        <div>
          <span className="font-semibold" style={{ color: theme.primary }}>
            Principal&apos;s Comment
          </span>
          <p>{data.principalComment || "—"}</p>
        </div>
      </div>

      {data.template?.showFees && (
        <div className="relative mt-2 flex gap-4 text-xs">
          <span>School Fee: ₦{formatNaira(data.nextFees)}</span>
          <span>Exam Fee: ₦{formatNaira(data.examFee)}</span>
          <span>Total: ₦{formatNaira(totalFees)}</span>
        </div>
      )}

      <div className="relative mt-6 grid grid-cols-2 gap-4 text-center text-xs">
        <div>
          {data.formTeacherSignatureUrl ? (
            <img src={data.formTeacherSignatureUrl} alt="" className="mx-auto h-10" />
          ) : (
            <div className="mx-auto mb-1 h-8 w-32 border-b" />
          )}
          <span>Form Teacher&apos;s Signature</span>
        </div>
        <div>
          {data.principalSignatureUrl ? (
            <img src={data.principalSignatureUrl} alt="" className="mx-auto h-10" />
          ) : (
            <div className="mx-auto mb-1 h-8 w-32 border-b" />
          )}
          <span>Principal&apos;s Signature</span>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="block text-slate-400">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DomainGrid({ title, domains, levels }: { title: string; domains: { domain: { name: string }; rating: string }[]; levels: string[] }) {
  if (domains.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold">{title}</h4>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border px-1"></th>
            {[5, 4, 3, 2, 1].map((v) => (
              <th key={v} className="border px-1">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {domains.map((d, i) => {
            const idx = levels.indexOf(d.rating);
            const ratingValue = idx > -1 ? levels.length - idx : null;
            return (
              <tr key={i}>
                <td className="border px-1">
                  {i + 1}. {d.domain.name}
                </td>
                {[5, 4, 3, 2, 1].map((v) => (
                  <td key={v} className="border px-1 text-center">
                    {ratingValue === v ? "✓" : ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function formatNaira(v: string | number) {
  const n = Number(v) || 0;
  return n.toLocaleString("en-NG");
}
