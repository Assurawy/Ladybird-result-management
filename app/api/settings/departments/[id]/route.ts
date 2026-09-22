import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canChangeSettings } from "@/lib/permissions";
import { simpleCrud } from "@/lib/crud-helpers";

const crud = simpleCrud("department");

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ item: await crud.update(params.id, body) });
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canChangeSettings(session.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  await crud.remove(params.id);
  return NextResponse.json({ ok: true });
}
