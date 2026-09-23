import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";
import { REPORT_STYLES } from "../route";

const schema = z.object({
  name: z.string().min(1).optional(),
  style: z.enum(REPORT_STYLES).optional(),
  sectionIds: z.array(z.string()).optional(),
  showPhoto: z.boolean().optional(),
  showAttendance: z.boolean().optional(),
  showAffective: z.boolean().optional(),
  showFees: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sectionIds, ...rest } = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    if (sectionIds) {
      await tx.reportTemplateSection.deleteMany({ where: { templateId: params.id } });
      await tx.reportTemplateSection.createMany({ data: sectionIds.map((sectionId) => ({ templateId: params.id, sectionId })) });
    }
    if (rest.isDefault && sectionIds) {
      await tx.reportTemplate.updateMany({ where: { sections: { some: { sectionId: { in: sectionIds } } }, id: { not: params.id } }, data: { isDefault: false } });
    }
    return tx.reportTemplate.update({ where: { id: params.id }, data: rest });
  });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  await prisma.reportTemplate.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
