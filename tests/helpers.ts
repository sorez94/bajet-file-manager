import { db } from "@/lib/db/client";
import { users, sessions, files, settings } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import type { Role } from "@/lib/db/schema";
import { __resetCookies } from "./mocks/next-headers";
import { POST as loginRoute } from "@/app/api/auth/login/route";

export async function resetDb() {
  await db.delete(sessions);
  await db.delete(files);
  await db.delete(users);
  await db.delete(settings);
}

export async function insertUser(options: {
  email: string;
  password: string;
  role?: Role;
  isActive?: boolean;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(users).values({
    id,
    email: options.email,
    passwordHash: await hashPassword(options.password),
    role: options.role ?? "USER",
    isActive: options.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export function jsonRequest(
  url: string,
  init: { method: string; body?: unknown },
): Request {
  return new Request(url, {
    method: init.method,
    headers: { "Content-Type": "application/json" },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

/**
 * Clears the fake cookie jar (see mocks/next-headers.ts) and logs in as the
 * given user through the real login route handler, leaving the jar
 * populated with a valid session — mirroring one continuous browser tab.
 */
export async function loginAs(email: string, password: string): Promise<Response> {
  __resetCookies();
  return loginRoute(jsonRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: { email, password },
  }));
}

export function clearSession() {
  __resetCookies();
}
