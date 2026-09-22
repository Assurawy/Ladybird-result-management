import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  core: z.boolean().default(false),
  includeInAverage: z.boolean().default(true),
  includeInRanking: z.boolean().default(true),
  passMark: z.number().int().default(40),
  order: z.number().int().default(1),
  sectionIds: z.array(z.string()).min(1),
  departmentIds: z.array(z.string()).default([]),
});

export async function GET() {
  const items = await prisma.subject.findMany({
    where: { active: true },
    include: { sectionLinks: { include: { section: true } }, departmentLinks: { include: { department: true } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sectionIds, departmentIds, ...rest } = parsed.data;

  const item = await prisma.subject.create({
    data: {
      ...rest,
      sectionLinks: { create: sectionIds.map((sectionId) => ({ sectionId })) },
      departmentLinks: { create: departmentIds.map((departmentId) => ({ departmentId })) },
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}
