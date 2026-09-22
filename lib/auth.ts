import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

const COOKIE_NAME = "ladybird_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches the original "stay logged in" behavior

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — generate one with `openssl rand -base64 48`");
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  cookies().delete(COOKIE_NAME);
}

// Reads + verifies the session cookie. Does NOT hit the database — for
// performance the role/name are trusted from the signed token. If you need
// to react instantly to an admin deactivating a user mid-session, add a
// `active` re-check here (one extra query per request) or shorten the TTL.
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      id: payload.id as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

// Use in Server Components / Route Handlers that require a signed-in user.
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Not signed in.");
  }
  return session;
}

export class AuthError extends Error {}
export class ForbiddenError extends Error {}
