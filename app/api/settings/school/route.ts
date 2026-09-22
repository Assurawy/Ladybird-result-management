import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  motto: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  stampUrl: z.string().nullable().optional(),
  currentSessionId: z.string().optional(),
  currentTermId: z.string().optional(),
  rankingBasis: z.string().optional(),
  rankingScope: z.string().optional(),
  rankingTieMethod: z.enum(["competition", "dense", "ordinal"]).optional(),
  requireCompleteResults: z.boolean().optional(),
  ratingLevels: z.array(z.string()).min(2).optional(),
});

export async function GET() {
  const item = (await prisma.schoolSetting.findFirst()) ?? (await prisma.schoolSetting.create({ data: {} }));
  return NextResponse.json({ item });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = (await prisma.schoolSetting.findFirst()) ?? (await prisma.schoolSetting.create({ data: {} }));
  const item = await prisma.schoolSetting.update({ where: { id: existing.id }, data: parsed.data });

  await prisma.auditLog.create({
    data: { userId: session.id, userName: session.name, role: session.role, action: "CHANGE_SETTINGS", details: Object.keys(parsed.data).join(", ") },
  });

  return NextResponse.json({ item });
}
