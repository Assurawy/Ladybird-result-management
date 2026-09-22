import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";

// Deletes every demo student and demo user (cascades their scores/comments/
// enrollments/assignments via the FK onDelete rules in schema.prisma).
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canManageUsers(session.role)) return NextResponse.json({ error: "Only Admin/Super Admin can do this." }, { status: 403 });

  const [students, users] = await prisma.$transaction([
    prisma.student.deleteMany({ where: { isDemo: true } }),
    prisma.user.deleteMany({ where: { isDemo: true, id: { not: session.id } } }),
  ]);

  await prisma.auditLog.create({
    data: { userId: session.id, userName: session.name, role: session.role, action: "REMOVE_DEMO_DATA", details: `${students.count} student(s), ${users.count} user(s)` },
  });

  return NextResponse.json({ ok: true, removedStudents: students.count, removedUsers: users.count });
}
