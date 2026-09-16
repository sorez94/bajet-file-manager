import "server-only";
import { and, eq, ne, count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, type Role, type User } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessionsForUser } from "@/lib/auth/session";

export type PublicUser = Omit<User, "passwordHash">;

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await db.select().from(users).orderBy(users.createdAt);
  return rows.map(toPublicUser);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  role: Role;
  isActive?: boolean;
}): Promise<PublicUser> {
  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(users).values(user);
  return toPublicUser(user);
}

async function countActiveSuperAdmins(excludingUserId?: string): Promise<number> {
  const conditions = [
    eq(users.role, "SUPER_ADMIN"),
    eq(users.isActive, true),
    ...(excludingUserId ? [ne(users.id, excludingUserId)] : []),
  ];
  const rows = await db
    .select({ value: count() })
    .from(users)
    .where(and(...conditions));
  return rows[0]?.value ?? 0;
}

export async function updateUser(
  id: string,
  input: Partial<{
    email: string;
    password: string;
    role: Role;
    isActive: boolean;
  }>,
): Promise<PublicUser> {
  const existing = await getUserById(id);
  if (!existing) throw new Error("User not found.");

  const willDemote = input.role === "USER" && existing.role === "SUPER_ADMIN";
  const willDeactivate = input.isActive === false && existing.isActive;
  if (
    existing.role === "SUPER_ADMIN" &&
    (willDemote || willDeactivate) &&
    (await countActiveSuperAdmins(existing.id)) === 0
  ) {
    throw new Error("Cannot remove the last active super admin.");
  }

  if (input.email && input.email !== existing.email) {
    const conflict = await getUserByEmail(input.email);
    if (conflict) throw new Error("A user with this email already exists.");
  }

  const patch: Partial<User> & { updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (input.email) patch.email = input.email;
  if (input.role) patch.role = input.role;
  if (typeof input.isActive === "boolean") patch.isActive = input.isActive;
  if (input.password) patch.passwordHash = await hashPassword(input.password);

  await db.update(users).set(patch).where(eq(users.id, id));

  if (input.password || input.isActive === false) {
    await destroyAllSessionsForUser(id);
  }

  const updated = await getUserById(id);
  return toPublicUser(updated!);
}

export async function deleteUser(id: string): Promise<void> {
  const existing = await getUserById(id);
  if (!existing) throw new Error("User not found.");

  if (
    existing.role === "SUPER_ADMIN" &&
    (await countActiveSuperAdmins(existing.id)) === 0
  ) {
    throw new Error("Cannot delete the last active super admin.");
  }

  await destroyAllSessionsForUser(id);
  await db.delete(users).where(eq(users.id, id));
}
