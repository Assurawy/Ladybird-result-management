import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";
import { simpleCrud } from "@/lib/crud-helpers";

const crud = simpleCrud("department", { name: "asc" });
const schema = z.object({ name: z.string().min(1), sectionId: z.string().min(1), active: z.boolean().default(true) });

export async function GET() {
  return NextResponse.json({ items: await crud.list() });
}
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ item: await crud.create(parsed.data) }, { status: 201 });
}
