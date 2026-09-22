import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1),
  sectionIds: z.array(z.string()).min(1),
  bands: z.array(z.object({ grade: z.string().min(1), min: z.number().int(), max: z.number().int(), point: z.number().int(), remark: z.string() })).min(1),
});

export async function GET() {
  const items = await prisma.gradingScheme.findMany({
    include: { sections: { include: { section: true } }, bands: { orderBy: { min: "desc" } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sectionIds, bands, name } = parsed.data;

  const item = await prisma.gradingScheme.create({
    data: { name, sections: { create: sectionIds.map((sectionId) => ({ sectionId })) }, bands: { create: bands } },
  });
  return NextResponse.json({ item }, { status: 201 });
}
