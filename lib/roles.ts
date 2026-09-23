// ============================================================================
// Pure role checks — no DB access, no server-only dependency, safe to import
// from Client Components (e.g. components/AppShell.tsx for nav visibility).
// Everything that actually needs the database (canEnterScores,
// isFormTeacherOf, etc.) stays in lib/permissions.ts, which stays
// server-only. If you add a new check here, keep it that way: pure
// function of a Role, nothing async, no prisma import.
// ============================================================================
import type { Role } from "@prisma/client";

export function isWholeSchoolRole(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "PRINCIPAL" || role === "ACADEMIC_SUPERVISOR";
}

export function canManageUsers(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canPublish(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "PRINCIPAL";
}

export function canReopen(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canChangeSettings(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
