// ============================================================================
// PERMISSIONS — ported from the original source/03-auth.js, but now the
// authoritative check (the original comment on that file was explicit that
// its checks were UI-only and could be bypassed from devtools; every one of
// these is now re-run inside API routes / Server Actions against data
// fetched from the database, not against anything the client sent).
//
// This file is server-only (it touches Prisma) — the pure, no-DB role
// checks (isWholeSchoolRole, canPublish, etc.) live in lib/roles.ts instead,
// specifically so Client Components can import those without pulling this
// whole file — and "server-only" — into the client bundle. Re-exported
// below so existing server-side imports of these from "./permissions"
// keep working unchanged.
// ============================================================================
import "server-only";
import { prisma } from "./prisma";
import { ForbiddenError, type SessionUser } from "./auth";

export { isWholeSchoolRole, canManageUsers, canPublish, canReopen, canChangeSettings } from "./roles";
import { isWholeSchoolRole } from "./roles";

// A subject teacher may only enter scores for a subject/class/session/term
// they are actually assigned to. Whole-school roles (Admin/Principal/
// Supervisor/Super Admin) can enter for any subject/class as an override,
// matching the original app's behavior.
export async function canEnterScores(
  user: SessionUser,
  subjectId: string,
  classArmId: string,
  sessionId: string,
  termId: string
) {
  if (isWholeSchoolRole(user.role)) return true;
  if (user.role !== "TEACHER") return false;
  const assignment = await prisma.teacherAssignment.findFirst({
    where: { teacherId: user.id, subjectId, classArmId, sessionId, termId, active: true },
    select: { id: true },
  });
  return !!assignment;
}

// A Form Teacher may only review/comment/approve the specific class-arm(s)
// they are the active form teacher of. Whole-school roles bypass this.
export async function isFormTeacherOf(user: SessionUser, classArmId: string, sessionId: string) {
  if (isWholeSchoolRole(user.role)) return true;
  if (user.role !== "TEACHER") return false;
  const assignment = await prisma.formTeacherAssignment.findFirst({
    where: { teacherId: user.id, classArmId, sessionId, active: true },
    select: { id: true },
  });
  return !!assignment;
}

// Throws (→ the API route returns 403) instead of returning a boolean, for
// call sites that should hard-stop rather than branch.
export async function assertCanEnterScores(
  user: SessionUser,
  subjectId: string,
  classArmId: string,
  sessionId: string,
  termId: string
) {
  const ok = await canEnterScores(user, subjectId, classArmId, sessionId, termId);
  if (!ok) throw new ForbiddenError("You are not assigned to this subject/class.");
}

export async function assertIsFormTeacherOf(user: SessionUser, classArmId: string, sessionId: string) {
  const ok = await isFormTeacherOf(user, classArmId, sessionId);
  if (!ok) throw new ForbiddenError("You are not the Form Teacher of this class.");
}

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new ForbiddenError(message);
}
