import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Ladybird demo data (mirrors source/01-seed.js)…");

  const [sectionNursery, sectionPrimary, sectionJSS, sectionSS] = await Promise.all([
    prisma.section.create({ data: { name: "Nursery", order: 1 } }),
    prisma.section.create({ data: { name: "Primary", order: 2 } }),
    prisma.section.create({ data: { name: "Junior Secondary", order: 3 } }),
    prisma.section.create({ data: { name: "Senior Secondary", order: 4 } }),
  ]);

  const [deptScience, deptArts, deptCommercial] = await Promise.all([
    prisma.department.create({ data: { sectionId: sectionSS.id, name: "Science" } }),
    prisma.department.create({ data: { sectionId: sectionSS.id, name: "Arts" } }),
    prisma.department.create({ data: { sectionId: sectionSS.id, name: "Commercial" } }),
  ]);

  const classArmDefs = [
    { section: sectionNursery, name: "Nursery 1" },
    { section: sectionNursery, name: "Nursery 2" },
    { section: sectionPrimary, name: "Primary 1A" },
    { section: sectionPrimary, name: "Primary 1B" },
    { section: sectionPrimary, name: "Primary 2A" },
    { section: sectionJSS, name: "JSS1A" },
    { section: sectionJSS, name: "JSS1B" },
    { section: sectionJSS, name: "JSS2A" },
    { section: sectionSS, name: "SS1 Science A", department: deptScience },
    { section: sectionSS, name: "SS1 Arts A", department: deptArts },
    { section: sectionSS, name: "SS2 Commercial A", department: deptCommercial },
  ];
  const classArms: Record<string, Awaited<ReturnType<typeof prisma.classArm.create>>> = {};
  for (const def of classArmDefs) {
    classArms[def.name] = await prisma.classArm.create({
      data: { sectionId: def.section.id, name: def.name, departmentId: def.department?.id ?? null },
    });
  }

  const session = await prisma.academicSession.create({ data: { name: "2026/2027", active: true } });
  const term1 = await prisma.term.create({ data: { sessionId: session.id, name: "First Term", order: 1 } });
  const term2 = await prisma.term.create({ data: { sessionId: session.id, name: "Second Term", order: 2 } });
  const term3 = await prisma.term.create({ data: { sessionId: session.id, name: "Third Term", order: 3 } });

  await prisma.schoolSetting.create({
    data: {
      name: "Ladybird College",
      address: "",
      phone: "",
      email: "",
      website: "www.ladybirdcollege.example",
      motto: "Knowledge, Character, Excellence",
      currentSessionId: session.id,
      currentTermId: term1.id,
    },
  });

  const subjectDefs = [
    { name: "English Language", code: "ENG", sections: [sectionJSS, sectionSS], core: true, order: 1 },
    { name: "Mathematics", code: "MTH", sections: [sectionJSS, sectionSS], core: true, order: 2 },
    { name: "Biology", code: "BIO", sections: [sectionSS], departments: [deptScience], order: 3 },
    { name: "Physics", code: "PHY", sections: [sectionSS], departments: [deptScience], order: 4 },
    { name: "Commerce", code: "COM", sections: [sectionSS], departments: [deptCommercial], order: 5 },
    { name: "Literature-in-English", code: "LIT", sections: [sectionSS], departments: [deptArts], order: 6 },
    { name: "Islamic Studies", code: "ISL", sections: [sectionJSS, sectionSS], order: 7 },
    { name: "Basic Science", code: "BSC", sections: [sectionJSS], core: true, order: 8 },
    { name: "Number Work", code: "NUM", sections: [sectionNursery, sectionPrimary], core: true, order: 1 },
    { name: "Letter Work", code: "LET", sections: [sectionNursery, sectionPrimary], core: true, order: 2 },
  ];
  const subjects: Record<string, Awaited<ReturnType<typeof prisma.subject.create>>> = {};
  for (const def of subjectDefs) {
    const subject = await prisma.subject.create({
      data: {
        name: def.name,
        code: def.code,
        core: def.core ?? false,
        order: def.order,
        passMark: def.sections.includes(sectionNursery) || def.sections.includes(sectionPrimary) ? 0 : 40,
        sectionLinks: { create: def.sections.map((s) => ({ sectionId: s.id })) },
        departmentLinks: { create: (def.departments ?? []).map((d) => ({ departmentId: d.id })) },
      },
    });
    subjects[def.code] = subject;
  }

  const demoPassword = await bcrypt.hash("demo123", 12);
  const [superAdmin, admin, principal, supervisor, teacherA, teacherB, teacherC] = await Promise.all([
    prisma.user.create({ data: { username: "superadmin", passwordHash: demoPassword, name: "Super Admin", role: "SUPER_ADMIN", isDemo: true } }),
    prisma.user.create({ data: { username: "admin", passwordHash: demoPassword, name: "Mrs. Grace Okoro", role: "ADMIN", isDemo: true } }),
    prisma.user.create({ data: { username: "principal", passwordHash: demoPassword, name: "Dr. Musa Ibrahim", role: "PRINCIPAL", isDemo: true } }),
    prisma.user.create({ data: { username: "supervisor", passwordHash: demoPassword, name: "Mr. Femi Adewale", role: "ACADEMIC_SUPERVISOR", isDemo: true } }),
    prisma.user.create({ data: { username: "teachera", passwordHash: demoPassword, name: "Mr. Ahmad Sule", role: "TEACHER", isDemo: true } }),
    prisma.user.create({ data: { username: "teacherb", passwordHash: demoPassword, name: "Mrs. Bimpe Alade", role: "TEACHER", isDemo: true } }),
    prisma.user.create({ data: { username: "teacherc", passwordHash: demoPassword, name: "Mrs. Aisha Bello", role: "TEACHER", isDemo: true } }),
  ]);

  const jss1a = classArms["JSS1A"];
  const jss1b = classArms["JSS1B"];

  await prisma.teacherAssignment.createMany({
    data: [
      { teacherId: teacherA.id, subjectId: subjects.ENG.id, classArmId: jss1a.id, sessionId: session.id, termId: term1.id },
      { teacherId: teacherA.id, subjectId: subjects.ENG.id, classArmId: jss1b.id, sessionId: session.id, termId: term1.id },
      { teacherId: teacherB.id, subjectId: subjects.MTH.id, classArmId: jss1a.id, sessionId: session.id, termId: term1.id },
    ],
  });

  await prisma.formTeacherAssignment.create({
    data: { teacherId: teacherC.id, classArmId: jss1a.id, sessionId: session.id, active: true },
  });

  const studentDefs = [
    { name: "Ahmad Musa", gender: "Male", classArm: jss1a, section: sectionJSS, dob: "2013-04-12", guardianPhone: "0803 000 1111", address: "12 Palm Street, Kano" },
    { name: "Aisha Ali", gender: "Female", classArm: jss1a, section: sectionJSS },
    { name: "Umar Bello", gender: "Male", classArm: jss1a, section: sectionJSS, dob: "2013-01-02", guardianPhone: "0803 222 3333", address: "4 Zoo Road, Kano" },
    { name: "Chidinma Eze", gender: "Female", classArm: jss1a, section: sectionJSS, dob: "2013-06-19", guardianPhone: "0803 444 5555", address: "9 Ring Road, Kano" },
    { name: "Tunde Bakare", gender: "Male", classArm: jss1b, section: sectionJSS },
    { name: "Grace Danladi", gender: "Female", classArm: classArms["SS1 Science A"], section: sectionSS, department: deptScience },
    { name: "Peter Obi", gender: "Male", classArm: classArms["SS1 Arts A"], section: sectionSS, department: deptArts },
  ];

  for (const def of studentDefs) {
    const admissionNo = "LB/" + Math.floor(1000 + Math.random() * 9000);
    const student = await prisma.student.create({
      data: {
        admissionNo,
        name: def.name,
        gender: def.gender,
        dob: def.dob,
        guardianPhone: def.guardianPhone,
        address: def.address,
        sectionId: def.section.id,
        classArmId: def.classArm.id,
        departmentId: def.department?.id ?? null,
        isDemo: true,
      },
    });
    await prisma.studentEnrollment.create({
      data: { studentId: student.id, sessionId: session.id, classArmId: def.classArm.id, sectionId: def.section.id, departmentId: def.department?.id ?? null },
    });
  }

  // Assessment + grading schemes
  const schemeSecondary = await prisma.assessmentScheme.create({
    data: {
      name: "Secondary Standard",
      sections: { create: [{ sectionId: sectionJSS.id }, { sectionId: sectionSS.id }] },
      components: {
        create: [
          { name: "CA1", maxScore: 15, weight: 15, order: 1 },
          { name: "CA2", maxScore: 15, weight: 15, order: 2 },
          { name: "Exam", maxScore: 70, weight: 70, order: 3 },
        ],
      },
    },
  });
  await prisma.assessmentScheme.create({
    data: {
      name: "Primary Standard",
      sections: { create: [{ sectionId: sectionPrimary.id }] },
      components: {
        create: [
          { name: "Test 1", maxScore: 20, weight: 20, order: 1 },
          { name: "Test 2", maxScore: 20, weight: 20, order: 2 },
          { name: "Exam", maxScore: 60, weight: 60, order: 3 },
        ],
      },
    },
  });
  await prisma.assessmentScheme.create({
    data: {
      name: "Nursery Descriptive",
      sections: { create: [{ sectionId: sectionNursery.id }] },
      components: { create: [{ name: "Continuous Assessment", maxScore: 100, weight: 100, order: 1 }] },
    },
  });

  await prisma.gradingScheme.create({
    data: {
      name: "WAEC-Style A1-F9",
      sections: { create: [{ sectionId: sectionJSS.id }, { sectionId: sectionSS.id }, { sectionId: sectionPrimary.id }] },
      bands: {
        create: [
          { grade: "A1", min: 75, max: 100, point: 1, remark: "Excellent" },
          { grade: "B2", min: 70, max: 74, point: 2, remark: "Very Good" },
          { grade: "B3", min: 65, max: 69, point: 3, remark: "Good" },
          { grade: "C4", min: 60, max: 64, point: 4, remark: "Credit" },
          { grade: "C5", min: 55, max: 59, point: 5, remark: "Credit" },
          { grade: "C6", min: 50, max: 54, point: 6, remark: "Credit" },
          { grade: "D7", min: 45, max: 49, point: 7, remark: "Pass" },
          { grade: "E8", min: 40, max: 44, point: 8, remark: "Pass" },
          { grade: "F9", min: 0, max: 39, point: 9, remark: "Fail" },
        ],
      },
    },
  });
  await prisma.gradingScheme.create({
    data: {
      name: "Descriptive Only",
      sections: { create: [{ sectionId: sectionNursery.id }] },
      bands: {
        create: [
          { grade: "Excellent", min: 90, max: 100, point: 1, remark: "Excellent" },
          { grade: "Very Good", min: 75, max: 89, point: 2, remark: "Very Good" },
          { grade: "Good", min: 60, max: 74, point: 3, remark: "Good" },
          { grade: "Developing", min: 40, max: 59, point: 4, remark: "Developing" },
          { grade: "Needs Improvement", min: 0, max: 39, point: 5, remark: "Needs Improvement" },
        ],
      },
    },
  });

  await prisma.commentTemplate.createMany({
    data: [
      { text: "Excellent performance. Keep it up.", category: "positive" },
      { text: "Very good performance this term.", category: "positive" },
      { text: "Good effort; continue working hard.", category: "neutral" },
      { text: "Shows good potential; needs more consistency.", category: "neutral" },
      { text: "Needs more concentration in class.", category: "improvement" },
      { text: "Needs improvement in academic performance.", category: "improvement" },
      { text: "Must improve class participation.", category: "improvement" },
    ],
  });

  await prisma.signature.create({
    data: { role: "PRINCIPAL", userId: principal.id, name: "Dr. Musa Ibrahim", active: true },
  });

  await Promise.all([
    ...["Punctuality", "Neatness", "Cooperation", "Leadership", "Honesty"].map((name) =>
      prisma.skillDomain.create({ data: { type: "AFFECTIVE", name } })
    ),
    ...["Handwriting", "Sports", "Creativity"].map((name) => prisma.skillDomain.create({ data: { type: "PSYCHOMOTOR", name } })),
  ]);

  const reportTemplateDefs = [
    { name: "SS Premium Academic", section: sectionSS, style: "classic-navy", isDefault: true },
    { name: "SS Modern Executive", section: sectionSS, style: "modern-teal" },
    { name: "SS Royal Premium", section: sectionSS, style: "royal-purple" },
    { name: "JSS Premium Academic", section: sectionJSS, style: "crimson-gold", isDefault: true },
    { name: "JSS Corporate Slate", section: sectionJSS, style: "corporate-slate" },
    { name: "JSS Elegant Serif", section: sectionJSS, style: "elegant-serif" },
    { name: "Primary Child-Friendly", section: sectionPrimary, style: "sunburst-orange", isDefault: true },
    { name: "Primary Forest Green", section: sectionPrimary, style: "forest-green" },
    { name: "Nursery Early Learning", section: sectionNursery, style: "minimal-mono", isDefault: true },
    { name: "Nursery Elegant Maroon", section: sectionNursery, style: "double-frame-formal" },
  ];
  for (const t of reportTemplateDefs) {
    await prisma.reportTemplate.create({
      data: {
        name: t.name,
        style: t.style,
        isDefault: t.isDefault ?? false,
        showPhoto: true,
        showAttendance: true,
        showAffective: true,
        showFees: true,
        sections: { create: [{ sectionId: t.section.id }] },
      },
    });
  }

  console.log("Seed complete. Demo logins: superadmin / admin / principal / supervisor / teachera / teacherb / teacherc — password 'demo123' for all.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
