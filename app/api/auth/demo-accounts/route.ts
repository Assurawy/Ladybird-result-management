import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public (pre-login) — only ever returns isDemo accounts, and only
// username/name/role, never a password or id. Once an Admin runs
// "Remove Demo Accounts" in Settings, this list is simply empty and the
// login page hides the autofill panel entirely.
export async function GET() {
  const accounts = await prisma.user.findMany({
    where: { isDemo: true, active: true },
    select: { username: true, name: true, role: true },
    orderBy: { role: "asc" },
  });
  return NextResponse.json({ accounts });
}
