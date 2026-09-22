import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { uploadMedia, type MediaKind } from "@/lib/media";

const VALID_KINDS: MediaKind[] = ["student-photo", "school-logo", "school-stamp", "signature"];

// multipart/form-data: file, kind, referenceId?
// For "student-photo": also patches Student.photoUrl if referenceId is given.
// For "school-logo"/"school-stamp": also patches SchoolSetting.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") as MediaKind | null;
  const referenceId = (form?.get("referenceId") as string | null) ?? undefined;

  if (!(file instanceof File) || !kind || !VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "A file and a valid kind are required." }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Object storage isn't configured — set BLOB_READ_WRITE_TOKEN (see .env.example) or swap lib/media.ts for your own storage client." },
      { status: 501 }
    );
  }

  let media;
  try {
    media = await uploadMedia(file, kind, referenceId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
  }

  if (kind === "student-photo" && referenceId) {
    await prisma.student.update({ where: { id: referenceId }, data: { photoUrl: media.url } });
  } else if (kind === "school-logo") {
    const school = await prisma.schoolSetting.findFirst();
    if (school) await prisma.schoolSetting.update({ where: { id: school.id }, data: { logoUrl: media.url } });
  } else if (kind === "school-stamp") {
    const school = await prisma.schoolSetting.findFirst();
    if (school) await prisma.schoolSetting.update({ where: { id: school.id }, data: { stampUrl: media.url } });
  } else if (kind === "signature" && referenceId) {
    await prisma.user.update({ where: { id: referenceId }, data: { signatureUrl: media.url } });
  }

  return NextResponse.json({ url: media.url });
}
