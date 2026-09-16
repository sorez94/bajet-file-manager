import "server-only";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users, type User } from "@/lib/db/schema";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({ id, userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export type SessionUser = Pick<
  User,
  "id" | "email" | "role" | "isActive"
>;

/**
 * Reads the session cookie, validates it against the database, and returns
 * the associated active user. Returns null for any invalid/expired/missing
 * session — callers must treat null as "unauthenticated".
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = hashToken(token);
  const result = await db
    .select({
      sessionExpiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);

  const row = result[0];
  if (!row) return null;
  if (row.sessionExpiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (!row.isActive) return null;

  return {
    id: row.userId,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Invalidates every session belonging to a user (e.g. on deactivation/password reset). */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
