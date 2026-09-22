import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isFormTeacherOf } from "@/lib/permissions";

const schema = z.object({
  studentId: z.string(),
  classArmId: z.string(),
  sessionId: z.string(),
  termId: z.string(),
  ratings: z.record(z.string()), // { [domainId]: ratingLabel }
});

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const ok = await isFormTeacherOf(session, d.classArmId, d.sessionId);
  if (!ok) return NextResponse.json({ error: "You are not the Form Teacher of this class." }, { status: 403 });

  await prisma.$transaction(
    Object.entries(d.ratings).map(([domainId, rating]) =>
      prisma.domainScore.upsert({
        where: { studentId_sessionId_termId_domainId: { studentId: d.studentId, sessionId: d.sessionId, termId: d.termId, domainId } },
        create: { studentId: d.studentId, sessionId: d.sessionId, termId: d.termId, domainId, rating },
        update: { rating },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
