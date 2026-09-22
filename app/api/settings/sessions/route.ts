import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1), // e.g. "2027/2028"
  termNames: z.array(z.string().min(1)).min(1).default(["First Term", "Second Term", "Third Term"]),
});

export async function GET() {
  const items = await prisma.academicSession.findMany({ include: { terms: { orderBy: { order: "asc" } } }, orderBy: { name: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, termNames } = parsed.data;

  const item = await prisma.academicSession.create({
    data: { name, terms: { create: termNames.map((n, i) => ({ name: n, order: i + 1 })) } },
    include: { terms: true },
  });
  return NextResponse.json({ item }, { status: 201 });
}
