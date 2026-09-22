import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { buildReportData } from "@/lib/report-data";
import ReportCard from "@/components/ReportCard";
import PrintTrigger from "./PrintTrigger";

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: { ids?: string; classArmId?: string; sessionId?: string; termId?: string; templateId?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const ids = (searchParams.ids ?? "").split(",").filter(Boolean);
  const { classArmId, sessionId, termId, templateId } = searchParams;
  if (ids.length === 0 || !classArmId || !sessionId || !termId) {
    return <p className="p-8 text-slate-500">Nothing selected to print.</p>;
  }

  const reports = await Promise.all(ids.map((id) => buildReportData(id, classArmId, sessionId, termId, templateId)));

  return (
    <div className="bg-slate-100 py-6 print:bg-white print:py-0">
      <PrintTrigger />
      {reports.map((r, i) => (
        <div key={r.student.id} className={i > 0 ? "report-page-break" : ""}>
          <ReportCard data={r} />
        </div>
      ))}
      <style>{`
        @media print {
          .report-page-break { page-break-before: always; }
        }
      `}</style>
    </div>
  );
}
