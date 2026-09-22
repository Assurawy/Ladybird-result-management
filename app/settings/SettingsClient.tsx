"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TABS = ["School", "Structure", "Subjects", "Assessment", "Grading", "Comments", "Reports", "Skills", "Users", "Sessions", "Backup"] as const;
type Tab = (typeof TABS)[number];

async function api(url: string, method: string, body?: any) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error?.toString() ?? "Request failed.");
  return res.json();
}

export default function SettingsClient(props: any) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("School");
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<any>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t px-3 py-2 text-sm ${tab === t ? "border-b-2 border-navy font-semibold text-navy" : "text-slate-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "School" && <SchoolTab school={props.school} sessions={props.sessions} run={run} />}
      {tab === "Structure" && <StructureTab sections={props.sections} departments={props.departments} classArms={props.classArms} run={run} />}
      {tab === "Subjects" && <SubjectsTab subjects={props.subjects} sections={props.sections} departments={props.departments} run={run} />}
      {tab === "Assessment" && <AssessmentTab schemes={props.assessmentSchemes} sections={props.sections} run={run} />}
      {tab === "Grading" && <GradingTab schemes={props.gradingSchemes} sections={props.sections} run={run} />}
      {tab === "Comments" && <CommentsTab templates={props.commentTemplates} sections={props.sections} run={run} />}
      {tab === "Reports" && <ReportsTab templates={props.reportTemplates} sections={props.sections} styles={props.reportStyles} run={run} />}
      {tab === "Skills" && <SkillsTab domains={props.skillDomains} run={run} />}
      {tab === "Users" && <UsersTab users={props.users} canManageUsers={props.canManageUsers} run={run} />}
      {tab === "Sessions" && <SessionsTab sessions={props.sessions} run={run} />}
      {tab === "Backup" && <BackupTab run={run} />}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border bg-white p-4">{children}</div>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={"rounded border px-2 py-1 text-sm " + (props.className ?? "")} />;
}
function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={"rounded bg-navy px-3 py-1.5 text-sm text-white " + (props.className ?? "")} />;
}

// ---------------------------------------------------------------- School --
function SchoolTab({ school, sessions, run }: any) {
  const [form, setForm] = useState({
    name: school?.name ?? "",
    address: school?.address ?? "",
    phone: school?.phone ?? "",
    email: school?.email ?? "",
    website: school?.website ?? "",
    motto: school?.motto ?? "",
    currentSessionId: school?.currentSessionId ?? "",
    currentTermId: school?.currentTermId ?? "",
    rankingTieMethod: school?.rankingTieMethod ?? "competition",
  });
  const currentSession = sessions.find((s: any) => s.id === form.currentSessionId);

  return (
    <Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["name", "address", "phone", "email", "website", "motto"] as const).map((k) => (
          <label key={k} className="text-sm">
            <span className="mb-1 block capitalize text-slate-500">{k}</span>
            <Input className="w-full" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </label>
        ))}
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Current Session</span>
          <select className="w-full rounded border px-2 py-1" value={form.currentSessionId} onChange={(e) => setForm({ ...form, currentSessionId: e.target.value, currentTermId: "" })}>
            <option value="">—</option>
            {sessions.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Current Term</span>
          <select className="w-full rounded border px-2 py-1" value={form.currentTermId} onChange={(e) => setForm({ ...form, currentTermId: e.target.value })}>
            <option value="">—</option>
            {(currentSession?.terms ?? []).map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Ranking Tie Method</span>
          <select className="w-full rounded border px-2 py-1" value={form.rankingTieMethod} onChange={(e) => setForm({ ...form, rankingTieMethod: e.target.value })}>
            <option value="competition">Competition (1,2,2,4)</option>
            <option value="dense">Dense (1,2,2,3)</option>
            <option value="ordinal">Ordinal (1,2,3,4)</option>
          </select>
        </label>
      </div>
      <Btn className="mt-4" onClick={() => run(() => api("/api/settings/school", "PUT", form))}>
        Save
      </Btn>
      <p className="mt-2 text-xs text-slate-400">Logo/stamp upload: see the Reports tab preview — wire a file input to POST /api/media/upload with kind=&quot;school-logo&quot;/&quot;school-stamp&quot; once BLOB_READ_WRITE_TOKEN is configured.</p>
    </Card>
  );
}

// ------------------------------------------------------------- Structure --
function StructureTab({ sections, departments, classArms, run }: any) {
  const [sectionName, setSectionName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptSection, setDeptSection] = useState(sections[0]?.id ?? "");
  const [armName, setArmName] = useState("");
  const [armSection, setArmSection] = useState(sections[0]?.id ?? "");
  const [armDept, setArmDept] = useState("");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <h3 className="mb-2 font-semibold">Sections</h3>
        <ul className="mb-3 divide-y text-sm">
          {sections.map((s: any) => (
            <li key={s.id} className="flex items-center justify-between py-1">
              {s.name}
              <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/sections/${s.id}`, "DELETE"))}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="New section" value={sectionName} onChange={(e) => setSectionName(e.target.value)} />
          <Btn onClick={() => run(() => api("/api/settings/sections", "POST", { name: sectionName, order: sections.length + 1 })).then(() => setSectionName(""))}>Add</Btn>
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">Departments</h3>
        <ul className="mb-3 divide-y text-sm">
          {departments.map((d: any) => (
            <li key={d.id} className="flex items-center justify-between py-1">
              {d.name} <span className="text-xs text-slate-400">({d.section.name})</span>
              <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/departments/${d.id}`, "DELETE"))}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="New department" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
          <select className="rounded border px-2 py-1 text-sm" value={deptSection} onChange={(e) => setDeptSection(e.target.value)}>
            {sections.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Btn onClick={() => run(() => api("/api/settings/departments", "POST", { name: deptName, sectionId: deptSection })).then(() => setDeptName(""))}>Add</Btn>
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">Class Arms</h3>
        <ul className="mb-3 max-h-64 divide-y overflow-y-auto text-sm">
          {classArms.map((c: any) => (
            <li key={c.id} className="flex items-center justify-between py-1">
              {c.name} <span className="text-xs text-slate-400">({c.section.name}{c.department ? ` · ${c.department.name}` : ""})</span>
              <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/class-arms/${c.id}`, "DELETE"))}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="New class arm" value={armName} onChange={(e) => setArmName(e.target.value)} />
          <select className="rounded border px-2 py-1 text-sm" value={armSection} onChange={(e) => setArmSection(e.target.value)}>
            {sections.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="rounded border px-2 py-1 text-sm" value={armDept} onChange={(e) => setArmDept(e.target.value)}>
            <option value="">No department</option>
            {departments.filter((d: any) => d.sectionId === armSection).map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Btn onClick={() => run(() => api("/api/settings/class-arms", "POST", { name: armName, sectionId: armSection, departmentId: armDept || null })).then(() => setArmName(""))}>
            Add
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// -------------------------------------------------------------- Subjects --
function SubjectsTab({ subjects, sections, departments, run }: any) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);

  return (
    <Card>
      <table className="mb-4 w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Code</th>
            <th className="p-2">Sections</th>
            <th className="p-2">Departments</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s: any) => (
            <tr key={s.id} className="border-t">
              <td className="p-2">{s.name}</td>
              <td className="p-2">{s.code}</td>
              <td className="p-2 text-xs">{s.sectionLinks.map((l: any) => l.section.name).join(", ")}</td>
              <td className="p-2 text-xs">{s.departmentLinks.map((l: any) => l.department.name).join(", ") || "—"}</td>
              <td className="p-2">
                <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/subjects/${s.id}`, "DELETE"))}>
                  Deactivate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="mb-2 font-semibold">Add subject</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Code</span>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <MultiSelect label="Sections" options={sections} value={sectionIds} onChange={setSectionIds} />
        <MultiSelect label="Departments (optional)" options={departments} value={departmentIds} onChange={setDepartmentIds} />
        <Btn
          onClick={() =>
            run(() => api("/api/settings/subjects", "POST", { name, code, sectionIds, departmentIds })).then(() => {
              setName("");
              setCode("");
            })
          }
        >
          Add
        </Btn>
      </div>
    </Card>
  );
}

function MultiSelect({ label, options, value, onChange }: { label: string; options: any[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      <select
        multiple
        className="h-20 w-40 rounded border px-2 py-1 text-xs"
        value={value}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
      >
        {options.map((o: any) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

// ------------------------------------------------------------ Assessment --
function AssessmentTab({ schemes, sections, run }: any) {
  const [name, setName] = useState("");
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [components, setComponents] = useState([{ name: "CA1", maxScore: 15, weight: 15, order: 1 }]);

  function addComponent() {
    setComponents([...components, { name: "", maxScore: 0, weight: 0, order: components.length + 1 }]);
  }
  function updateComponent(i: number, field: string, value: any) {
    setComponents(components.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }
  const totalWeight = components.reduce((a, c) => a + Number(c.weight || 0), 0);

  return (
    <div className="space-y-4">
      {schemes.map((s: any) => (
        <Card key={s.id}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{s.name}</h3>
            <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/assessment-schemes/${s.id}`, "DELETE"))}>
              Delete
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-500">Sections: {s.sections.map((l: any) => l.section.name).join(", ")}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {s.components.map((c: any) => (
              <span key={c.id} className="rounded bg-slate-100 px-2 py-1">
                {c.name}: /{c.maxScore} ({c.weight}%)
              </span>
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <h3 className="mb-2 font-semibold">New Assessment Scheme</h3>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <MultiSelect label="Sections" options={sections} value={sectionIds} onChange={setSectionIds} />
        </div>
        <table className="mb-2 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-1">Component</th>
              <th className="p-1">Max Score</th>
              <th className="p-1">Weight %</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c, i) => (
              <tr key={i}>
                <td className="p-1">
                  <Input value={c.name} onChange={(e) => updateComponent(i, "name", e.target.value)} />
                </td>
                <td className="p-1">
                  <Input type="number" className="w-20" value={c.maxScore} onChange={(e) => updateComponent(i, "maxScore", Number(e.target.value))} />
                </td>
                <td className="p-1">
                  <Input type="number" className="w-20" value={c.weight} onChange={(e) => updateComponent(i, "weight", Number(e.target.value))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mb-2 text-xs text-navy underline" onClick={addComponent}>
          + Add component
        </button>
        <p className={`mb-2 text-xs ${totalWeight === 100 ? "text-emerald-600" : "text-amber-600"}`}>Total weight: {totalWeight}% (must equal 100%)</p>
        <Btn
          onClick={() =>
            run(() => api("/api/settings/assessment-schemes", "POST", { name, sectionIds, components })).then(() => {
              setName("");
              setComponents([{ name: "CA1", maxScore: 15, weight: 15, order: 1 }]);
            })
          }
        >
          Create Scheme
        </Btn>
      </Card>
    </div>
  );
}

// --------------------------------------------------------------- Grading --
function GradingTab({ schemes, sections, run }: any) {
  const [name, setName] = useState("");
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [bands, setBands] = useState([{ grade: "A1", min: 75, max: 100, point: 1, remark: "Excellent" }]);

  function addBand() {
    setBands([...bands, { grade: "", min: 0, max: 0, point: 0, remark: "" }]);
  }
  function updateBand(i: number, field: string, value: any) {
    setBands(bands.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  }

  return (
    <div className="space-y-4">
      {schemes.map((s: any) => (
        <Card key={s.id}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{s.name}</h3>
            <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/grading-schemes/${s.id}`, "DELETE"))}>
              Delete
            </button>
          </div>
          <p className="mb-2 text-xs text-slate-500">Sections: {s.sections.map((l: any) => l.section.name).join(", ")}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {s.bands.map((b: any) => (
              <span key={b.id} className="rounded bg-slate-100 px-2 py-1">
                {b.grade}: {b.min}-{b.max}
              </span>
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <h3 className="mb-2 font-semibold">New Grading Scheme</h3>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <MultiSelect label="Sections" options={sections} value={sectionIds} onChange={setSectionIds} />
        </div>
        <table className="mb-2 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-1">Grade</th>
              <th className="p-1">Min</th>
              <th className="p-1">Max</th>
              <th className="p-1">Point</th>
              <th className="p-1">Remark</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b, i) => (
              <tr key={i}>
                <td className="p-1">
                  <Input className="w-16" value={b.grade} onChange={(e) => updateBand(i, "grade", e.target.value)} />
                </td>
                <td className="p-1">
                  <Input type="number" className="w-16" value={b.min} onChange={(e) => updateBand(i, "min", Number(e.target.value))} />
                </td>
                <td className="p-1">
                  <Input type="number" className="w-16" value={b.max} onChange={(e) => updateBand(i, "max", Number(e.target.value))} />
                </td>
                <td className="p-1">
                  <Input type="number" className="w-16" value={b.point} onChange={(e) => updateBand(i, "point", Number(e.target.value))} />
                </td>
                <td className="p-1">
                  <Input value={b.remark} onChange={(e) => updateBand(i, "remark", e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="mb-2 text-xs text-navy underline" onClick={addBand}>
          + Add band
        </button>
        <div>
          <Btn
            onClick={() =>
              run(() => api("/api/settings/grading-schemes", "POST", { name, sectionIds, bands })).then(() => {
                setName("");
                setBands([{ grade: "A1", min: 75, max: 100, point: 1, remark: "Excellent" }]);
              })
            }
          >
            Create Scheme
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// -------------------------------------------------------------- Comments --
function CommentsTab({ templates, sections, run }: any) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("positive");
  const [sectionId, setSectionId] = useState("");

  return (
    <Card>
      <ul className="mb-4 divide-y text-sm">
        {templates.map((t: any) => (
          <li key={t.id} className="flex items-center justify-between py-2">
            <span>
              {t.text} <span className="text-xs text-slate-400">({t.category}{t.section ? `, ${t.section.name}` : ""})</span>
            </span>
            <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/comment-templates/${t.id}`, "DELETE"))}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <Input className="w-64" placeholder="Comment text" value={text} onChange={(e) => setText(e.target.value)} />
        <select className="rounded border px-2 py-1 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="improvement">Improvement</option>
        </select>
        <select className="rounded border px-2 py-1 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">All sections</option>
          {sections.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Btn onClick={() => run(() => api("/api/settings/comment-templates", "POST", { text, category, sectionId: sectionId || null })).then(() => setText(""))}>Add</Btn>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Reports --
function ReportsTab({ templates, sections, styles, run }: any) {
  const [name, setName] = useState("");
  const [style, setStyle] = useState(styles[0]);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);

  return (
    <Card>
      <table className="mb-4 w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Style</th>
            <th className="p-2">Sections</th>
            <th className="p-2">Default</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t: any) => (
            <tr key={t.id} className="border-t">
              <td className="p-2">{t.name}</td>
              <td className="p-2">{t.style}</td>
              <td className="p-2 text-xs">{t.sections.map((l: any) => l.section.name).join(", ")}</td>
              <td className="p-2">{t.isDefault ? "Yes" : ""}</td>
              <td className="p-2">
                <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/report-templates/${t.id}`, "DELETE"))}>
                  Deactivate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="mb-2 font-semibold">Add report template</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Style</span>
          <select className="rounded border px-2 py-1" value={style} onChange={(e) => setStyle(e.target.value)}>
            {styles.map((s: string) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <MultiSelect label="Sections" options={sections} value={sectionIds} onChange={setSectionIds} />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Default for these sections
        </label>
        <Btn onClick={() => run(() => api("/api/settings/report-templates", "POST", { name, style, sectionIds, isDefault })).then(() => setName(""))}>Add</Btn>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Skills --
function SkillsTab({ domains, run }: any) {
  const [name, setName] = useState("");
  const [type, setType] = useState("AFFECTIVE");

  return (
    <Card>
      <ul className="mb-4 divide-y text-sm">
        {domains.map((d: any) => (
          <li key={d.id} className="flex items-center justify-between py-2">
            {d.name} <span className="text-xs text-slate-400">({d.type})</span>
            <button className="text-xs text-red-600" onClick={() => run(() => api(`/api/settings/skill-domains/${d.id}`, "DELETE"))}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input placeholder="Domain name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="rounded border px-2 py-1 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="AFFECTIVE">Behaviour</option>
          <option value="PSYCHOMOTOR">Skill</option>
        </select>
        <Btn onClick={() => run(() => api("/api/settings/skill-domains", "POST", { name, type })).then(() => setName(""))}>Add</Btn>
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------- Users --
function UsersTab({ users, canManageUsers, run }: any) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("TEACHER");

  if (!canManageUsers) return <Card>Only Admin/Super Admin can manage users.</Card>;

  return (
    <Card>
      <table className="mb-4 w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Username</th>
            <th className="p-2">Role</th>
            <th className="p-2">Active</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.username}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{u.active ? "Yes" : "No"}</td>
              <td className="p-2">
                <button className="mr-2 text-xs text-navy underline" onClick={() => run(() => api(`/api/settings/users/${u.id}`, "PATCH", { active: !u.active }))}>
                  {u.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  className="text-xs text-navy underline"
                  onClick={() => {
                    const pw = window.prompt(`New password for ${u.name}:`);
                    if (pw) run(() => api(`/api/settings/users/${u.id}`, "PATCH", { newPassword: pw }));
                  }}
                >
                  Reset password
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="mb-2 font-semibold">Add user</h3>
      <div className="flex flex-wrap items-end gap-2">
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="rounded border px-2 py-1 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="TEACHER">Teacher</option>
          <option value="ACADEMIC_SUPERVISOR">Academic Supervisor</option>
          <option value="PRINCIPAL">Principal</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <Btn
          onClick={() =>
            run(() => api("/api/settings/users", "POST", { username, password, name, role })).then(() => {
              setUsername("");
              setPassword("");
              setName("");
            })
          }
        >
          Add
        </Btn>
      </div>
    </Card>
  );
}

// -------------------------------------------------------------- Sessions --
function SessionsTab({ sessions, run }: any) {
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      {sessions.map((s: any) => (
        <Card key={s.id}>
          <h3 className="font-semibold">{s.name}</h3>
          <p className="text-xs text-slate-500">{s.terms.map((t: any) => t.name).join(", ")}</p>
        </Card>
      ))}
      <Card>
        <h3 className="mb-2 font-semibold">New Session</h3>
        <div className="flex gap-2">
          <Input placeholder="e.g. 2027/2028" value={name} onChange={(e) => setName(e.target.value)} />
          <Btn onClick={() => run(() => api("/api/settings/sessions", "POST", { name })).then(() => setName(""))}>Create (with 3 terms)</Btn>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Backup --
function BackupTab({ run }: any) {
  return (
    <Card>
      <p className="mb-3 text-sm text-slate-600">Download a full JSON export of every table (students, scores, results, settings, audit log). No passwords are included.</p>
      <a href="/api/settings/backup" className="rounded bg-navy px-3 py-2 text-sm text-white">
        Download Backup
      </a>
      <hr className="my-4" />
      <p className="mb-3 text-sm text-slate-600">Remove all demo students and demo staff accounts (created by the seed script) — irreversible.</p>
      <button
        className="rounded border border-red-300 px-3 py-2 text-sm text-red-600"
        onClick={() => {
          if (window.confirm("Remove all demo students and demo accounts? This can't be undone.")) run(() => api("/api/settings/remove-demo", "POST"));
        }}
      >
        Remove Demo Accounts &amp; Students
      </button>
    </Card>
  );
}
