import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  core: z.boolean().optional(),
  includeInAverage: z.boolean().optional(),
  includeInRanking: z.boolean().optional(),
  passMark: z.number().int().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
  sectionIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sectionIds, departmentIds, ...rest } = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    if (sectionIds) {
      await tx.subjectSection.deleteMany({ where: { subjectId: params.id } });
      await tx.subjectSection.createMany({ data: sectionIds.map((sectionId) => ({ subjectId: params.id, sectionId })) });
    }
    if (departmentIds) {
      await tx.subjectDepartment.deleteMany({ where: { subjectId: params.id } });
      await tx.subjectDepartment.createMany({ data: departmentIds.map((departmentId) => ({ subjectId: params.id, departmentId })) });
    }
    return tx.subject.update({ where: { id: params.id }, data: rest });
  });

  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  // Soft-delete (deactivate) rather than hard delete — scores/assignments reference this subject historically.
  await prisma.subject.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
