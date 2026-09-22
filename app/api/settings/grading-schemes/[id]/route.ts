import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).optional(),
  sectionIds: z.array(z.string()).optional(),
  bands: z.array(z.object({ grade: z.string().min(1), min: z.number().int(), max: z.number().int(), point: z.number().int(), remark: z.string() })).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sectionIds, bands, name } = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    if (sectionIds) {
      await tx.gradingSchemeSection.deleteMany({ where: { schemeId: params.id } });
      await tx.gradingSchemeSection.createMany({ data: sectionIds.map((sectionId) => ({ schemeId: params.id, sectionId })) });
    }
    if (bands) {
      await tx.gradingBand.deleteMany({ where: { schemeId: params.id } });
      await tx.gradingBand.createMany({ data: bands.map((b) => ({ ...b, schemeId: params.id })) });
    }
    return tx.gradingScheme.update({ where: { id: params.id }, data: name ? { name } : {} });
  });

  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  await prisma.gradingScheme.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
