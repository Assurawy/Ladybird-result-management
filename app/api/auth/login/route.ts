import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, active: true },
  });
  if (!user) {
    return NextResponse.json({ error: "No account found with that username." }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await createSession({ id: user.id, username: user.username, name: user.name, role: user.role });

  await prisma.auditLog.create({
    data: { userId: user.id, userName: user.name, role: user.role, action: "LOGIN", details: "" },
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
}
