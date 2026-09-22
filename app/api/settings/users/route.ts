import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "ACADEMIC_SUPERVISOR", "TEACHER"]),
});

export async function GET() {
  const items = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, active: true, isDemo: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canManageUsers(session.role)) return NextResponse.json({ error: "Only Admin/Super Admin can manage users." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { password, ...rest } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username: rest.username } });
  if (existing) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });

  const item = await prisma.user.create({ data: { ...rest, passwordHash: await hashPassword(password) } });
  await prisma.auditLog.create({
    data: { userId: session.id, userName: session.name, role: session.role, action: "CREATE_USER", details: `${item.name} (${item.username}, ${item.role})` },
  });
  return NextResponse.json({ item: { id: item.id, username: item.username, name: item.name, role: item.role, active: item.active } }, { status: 201 });
}
