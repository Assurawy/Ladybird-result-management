import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";
import { REPORT_STYLES } from "@/lib/report-styles";

const schema = z.object({
  name: z.string().min(1),
  style: z.enum(REPORT_STYLES),
  sectionIds: z.array(z.string()).min(1),
  showPhoto: z.boolean().default(true),
  showAttendance: z.boolean().default(true),
  showAffective: z.boolean().default(true),
  showFees: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  const items = await prisma.reportTemplate.findMany({ where: { active: true }, include: { sections: { include: { section: true } } } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sectionIds, ...rest } = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    if (rest.isDefault) {
      await tx.reportTemplate.updateMany({ where: { sections: { some: { sectionId: { in: sectionIds } } } }, data: { isDefault: false } });
    }
    return tx.reportTemplate.create({ data: { ...rest, sections: { create: sectionIds.map((sectionId) => ({ sectionId })) } } });
  });
  return NextResponse.json({ item }, { status: 201 });
}
