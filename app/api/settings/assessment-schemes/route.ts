import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1),
  sectionIds: z.array(z.string()).min(1),
  components: z
    .array(z.object({ name: z.string().min(1), maxScore: z.number().int().positive(), weight: z.number().int().positive(), order: z.number().int() }))
    .min(1)
    .refine((c) => c.reduce((a, x) => a + x.weight, 0) === 100, { message: "Component weights must add up to 100." }),
});

export async function GET() {
  const items = await prisma.assessmentScheme.findMany({
    include: { sections: { include: { section: true } }, components: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sectionIds, components, name } = parsed.data;

  const item = await prisma.assessmentScheme.create({
    data: {
      name,
      sections: { create: sectionIds.map((sectionId) => ({ sectionId })) },
      components: { create: components.map((c) => ({ ...c, active: true })) },
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}
