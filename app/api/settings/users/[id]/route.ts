import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "ACADEMIC_SUPERVISOR", "TEACHER"]).optional(),
  active: z.boolean().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canManageUsers(session.role)) return NextResponse.json({ error: "Only Admin/Super Admin can manage users." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { newPassword, ...rest } = parsed.data;

  const item = await prisma.user.update({
    where: { id: params.id },
    data: { ...rest, ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}) },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      userName: session.name,
      role: session.role,
      action: newPassword ? "RESET_PASSWORD" : "UPDATE_USER",
      details: item.name,
    },
  });

  return NextResponse.json({ item: { id: item.id, username: item.username, name: item.name, role: item.role, active: item.active } });
}
