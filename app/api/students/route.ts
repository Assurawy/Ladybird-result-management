import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isWholeSchoolRole } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classArmId = searchParams.get("classArmId") ?? undefined;
  const sectionId = searchParams.get("sectionId") ?? undefined;

  // Teachers only ever see students in classes they're the Form Teacher of;
  // whole-school roles see everyone. (Subject teachers reach students only
  // through the score-entry endpoint, scoped to their own subject/class.)
  let allowedClassArmIds: string[] | null = null;
  if (!isWholeSchoolRole(session.role)) {
    const ftas = await prisma.formTeacherAssignment.findMany({
      where: { teacherId: session.id, active: true },
      select: { classArmId: true },
    });
    allowedClassArmIds = ftas.map((a) => a.classArmId);
    if (allowedClassArmIds.length === 0) {
      return NextResponse.json({ students: [] });
    }
  }

  let classArmFilter: string | { in: string[] } | undefined;
  if (classArmId) {
    if (allowedClassArmIds && !allowedClassArmIds.includes(classArmId)) {
      return NextResponse.json({ students: [] });
    }
    classArmFilter = classArmId;
  } else if (allowedClassArmIds) {
    classArmFilter = { in: allowedClassArmIds };
  }

  const students = await prisma.student.findMany({
    where: {
      classArmId: classArmFilter,
      sectionId,
    },
    orderBy: { name: "asc" },
    include: { classArm: true, section: true, department: true },
  });

  return NextResponse.json({ students });
}

const createSchema = z.object({
  admissionNo: z.string().min(1),
  name: z.string().min(1),
  gender: z.string().min(1),
  sectionId: z.string().min(1),
  classArmId: z.string().min(1),
  departmentId: z.string().nullable().optional(),
  dob: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  sessionId: z.string().min(1), // for the initial enrollment record
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!isWholeSchoolRole(session.role)) {
    return NextResponse.json({ error: "Only Admin/Principal/Supervisor can add students." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({
      data: {
        admissionNo: data.admissionNo,
        name: data.name,
        gender: data.gender,
        sectionId: data.sectionId,
        classArmId: data.classArmId,
        departmentId: data.departmentId ?? null,
        dob: data.dob,
        guardianPhone: data.guardianPhone,
        address: data.address,
        customFields: data.customFields ?? {},
      },
    });
    await tx.studentEnrollment.create({
      data: {
        studentId: created.id,
        sessionId: data.sessionId,
        classArmId: data.classArmId,
        sectionId: data.sectionId,
        departmentId: data.departmentId ?? null,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: session.id,
        userName: session.name,
        role: session.role,
        action: "CREATE_STUDENT",
        details: `${created.name} (${created.admissionNo})`,
      },
    });
    return created;
  });

  return NextResponse.json({ student }, { status: 201 });
}
