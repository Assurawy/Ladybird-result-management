import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isFormTeacherOf, isWholeSchoolRole } from "@/lib/permissions";

const schema = z.object({
  studentId: z.string(),
  classArmId: z.string(),
  sessionId: z.string(),
  termId: z.string(),
  formTeacherComment: z.string().optional(),
  principalComment: z.string().optional(),
  nextFees: z.string().optional(),
  examFee: z.string().optional(),
});

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  // Principal comments can only be set by Principal/Admin/Super Admin, same as the original.
  if (d.principalComment !== undefined && !isWholeSchoolRole(session.role)) {
    return NextResponse.json({ error: "Only Principal/Admin can set the Principal's comment." }, { status: 403 });
  }
  if (d.formTeacherComment !== undefined || d.nextFees !== undefined || d.examFee !== undefined) {
    const ok = await isFormTeacherOf(session, d.classArmId, d.sessionId);
    if (!ok) return NextResponse.json({ error: "You are not the Form Teacher of this class." }, { status: 403 });
  }

  const { classArmId, ...rest } = d;
  const comment = await prisma.studentComment.upsert({
    where: { studentId_sessionId_termId: { studentId: d.studentId, sessionId: d.sessionId, termId: d.termId } },
    create: rest,
    update: rest,
  });

  return NextResponse.json({ comment });
}
