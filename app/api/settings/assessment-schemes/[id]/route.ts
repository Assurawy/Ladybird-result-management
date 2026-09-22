import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).optional(),
  sectionIds: z.array(z.string()).optional(),
  components: z
    .array(z.object({ id: z.string().optional(), name: z.string().min(1), maxScore: z.number().int().positive(), weight: z.number().int().positive(), order: z.number().int() }))
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sectionIds, components, name } = parsed.data;

  if (components) {
    const total = components.reduce((a, c) => a + c.weight, 0);
    if (total !== 100) return NextResponse.json({ error: "Component weights must add up to 100." }, { status: 400 });
  }

  const item = await prisma.$transaction(async (tx) => {
    if (sectionIds) {
      await tx.assessmentSchemeSection.deleteMany({ where: { schemeId: params.id } });
      await tx.assessmentSchemeSection.createMany({ data: sectionIds.map((sectionId) => ({ schemeId: params.id, sectionId })) });
    }
    if (components) {
      // Full replace is simplest and safest here — existing Score.components
      // JSON keeps its old componentIds even if you remove a component, so
      // historical entries stay intact; only the *current* entry form changes.
      await tx.assessmentComponent.deleteMany({ where: { schemeId: params.id } });
      await tx.assessmentComponent.createMany({
        data: components.map((c) => ({ schemeId: params.id, name: c.name, maxScore: c.maxScore, weight: c.weight, order: c.order, active: true })),
      });
    }
    return tx.assessmentScheme.update({ where: { id: params.id }, data: name ? { name } : {} });
  });

  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  await prisma.assessmentScheme.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
