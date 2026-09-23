import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public (pre-login) — branding only, nothing sensitive. Used by the login
// screen so it shows the real school name/motto/logo instead of a hardcoded
// placeholder.
export async function GET() {
  const school = await prisma.schoolSetting.findFirst();
  return NextResponse.json({
    name: school?.name || "Ladybird Whole-School System",
    motto: school?.motto || "",
    logoUrl: school?.logoUrl || null,
  });
}
