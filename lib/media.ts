import "server-only";
import { put } from "@vercel/blob";
import { prisma } from "./prisma";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — client should resize/compress before upload, same as the original app

export type MediaKind = "student-photo" | "school-logo" | "school-stamp" | "signature";

// Uploads a File (from a multipart FormData request) to Vercel Blob and
// records a Media row pointing at it. Swap the `put()` call for your S3/
// Cloudinary client of choice if you're not deploying on Vercel — the rest
// of the app only ever reads `Media.url` / the *Url columns it's copied
// into, so nothing else needs to change.
export async function uploadMedia(file: File, kind: MediaKind, referenceId?: string) {
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (max 5MB) — resize/compress before uploading.");
  }
  const blob = await put(`${kind}/${crypto.randomUUID()}-${file.name}`, file, { access: "public" });
  const media = await prisma.media.create({ data: { url: blob.url, kind, referenceId } });
  return media;
}
