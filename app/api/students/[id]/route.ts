import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isWholeSchoolRole } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: { classArm: true, section: true, department: true, enrollments: { orderBy: { createdAt: "asc" } } },
  });
  if (!student) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!isWholeSchoolRole(session.role)) {
    const isFormTeacher = await prisma.formTeacherAssignment.findFirst({
      where: { teacherId: session.id, classArmId: student.classArmId, active: true },
    });
    if (!isFormTeacher) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ student });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  gender: z.string().min(1).optional(),
  dob: z.string().optional(),
  photoUrl: z.string().nullable().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Graduated", "Withdrawn", "Transferred"]).optional(),
  departmentId: z.string().nullable().optional(),
  customFields: z.record(z.any()).optional(),
  // Moving a student: pass all three together to also append an enrollment record.
  move: z
    .object({ sessionId: z.string(), classArmId: z.string(), sectionId: z.string(), departmentId: z.string().nullable().optional() })
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const existing = await prisma.student.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!isWholeSchoolRole(session.role)) {
    const isFormTeacher = await prisma.formTeacherAssignment.findFirst({
      where: { teacherId: session.id, classArmId: existing.classArmId, active: true },
    });
    if (!isFormTeacher) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { move, ...fields } = parsed.data;

  const student = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
      where: { id: params.id },
      data: {
        ...fields,
        // A move changes the student's "current" pointers AND appends history —
        // never overwrites past enrollment rows (see StudentEnrollment model).
        ...(move ? { classArmId: move.classArmId, sectionId: move.sectionId, departmentId: move.departmentId ?? null } : {}),
      },
    });
    if (move) {
      await tx.studentEnrollment.create({
        data: {
          studentId: params.id,
          sessionId: move.sessionId,
          classArmId: move.classArmId,
          sectionId: move.sectionId,
          departmentId: move.departmentId ?? null,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: session.id,
        userName: session.name,
        role: session.role,
        action: "UPDATE_STUDENT",
        details: updated.name + (move ? " (moved class)" : ""),
      },
    });
    return updated;
  });

  return NextResponse.json({ student });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const existing = await prisma.student.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Real deletion, Form Teacher/Admin only — matches the original app.
  const isAdmin = isWholeSchoolRole(session.role);
  if (!isAdmin) {
    const isFormTeacher = await prisma.formTeacherAssignment.findFirst({
      where: { teacherId: session.id, classArmId: existing.classArmId, active: true },
    });
    if (!isFormTeacher) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.student.delete({ where: { id: params.id } }), // cascades scores/enrollments/comments via FK onDelete
    prisma.auditLog.create({
      data: { userId: session.id, userName: session.name, role: session.role, action: "DELETE_STUDENT", details: existing.name },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
