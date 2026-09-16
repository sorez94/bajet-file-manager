import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { resetDb, insertUser, loginAs, clearSession, jsonRequest } from "./helpers";
import { POST as createUserRoute } from "@/app/api/users/route";
import { PATCH as patchUserRoute, DELETE as deleteUserRoute } from "@/app/api/users/[id]/route";

describe("user management", () => {
  let adminId: string;

  beforeEach(async () => {
    await resetDb();
    clearSession();
    adminId = await insertUser({
      email: "admin@test.local",
      password: "password123",
      role: "SUPER_ADMIN",
    });
  });

  it("lets a super admin create a user, and stores only a hash of the password", async () => {
    await loginAs("admin@test.local", "password123");

    const res = await createUserRoute(
      jsonRequest("http://localhost/api/users", {
        method: "POST",
        body: { email: "newuser@test.local", password: "brand-new-pass", role: "USER" },
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe("newuser@test.local");
    expect(body.user.passwordHash).toBeUndefined();

    const [row] = await db.select().from(users).where(eq(users.email, "newuser@test.local"));
    expect(row.passwordHash).not.toBe("brand-new-pass");
    expect(row.passwordHash.length).toBeGreaterThan(20);
  });

  it("forbids a regular user from creating a user", async () => {
    await insertUser({ email: "regular@test.local", password: "password123", role: "USER" });
    await loginAs("regular@test.local", "password123");

    const res = await createUserRoute(
      jsonRequest("http://localhost/api/users", {
        method: "POST",
        body: { email: "hacker@test.local", password: "whatever123", role: "SUPER_ADMIN" },
      }),
    );

    expect(res.status).toBe(403);
    const [row] = await db.select().from(users).where(eq(users.email, "hacker@test.local"));
    expect(row).toBeUndefined();
  });

  it("rejects creating a user with a duplicate email", async () => {
    await loginAs("admin@test.local", "password123");

    const res = await createUserRoute(
      jsonRequest("http://localhost/api/users", {
        method: "POST",
        body: { email: "admin@test.local", password: "password123", role: "USER" },
      }),
    );

    expect(res.status).toBe(409);
  });

  it("prevents demoting the last active super admin", async () => {
    await loginAs("admin@test.local", "password123");

    const res = await patchUserRoute(
      jsonRequest(`http://localhost/api/users/${adminId}`, {
        method: "PATCH",
        body: { role: "USER" },
      }),
      { params: Promise.resolve({ id: adminId }) },
    );

    expect(res.status).toBe(409);
  });

  it("blocks a super admin from deleting their own account via the API", async () => {
    await loginAs("admin@test.local", "password123");

    const res = await deleteUserRoute(
      jsonRequest(`http://localhost/api/users/${adminId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: adminId }) },
    );

    expect(res.status).toBe(400);
  });

  it("prevents deleting the last active super admin at the service layer", async () => {
    // The API additionally blocks self-delete (tested above); this exercises
    // the underlying business rule directly, as would apply to e.g. one
    // super admin deleting another when they're the only one left active.
    const { deleteUser } = await import("@/server/services/userService");
    await expect(deleteUser(adminId)).rejects.toThrow(/last active super admin/i);
  });

  it("deactivating a user destroys their sessions (forces re-login)", async () => {
    const userId = await insertUser({
      email: "todeactivate@test.local",
      password: "password123",
      role: "USER",
    });

    await loginAs("todeactivate@test.local", "password123");
    await loginAs("admin@test.local", "password123");

    const res = await patchUserRoute(
      jsonRequest(`http://localhost/api/users/${userId}`, {
        method: "PATCH",
        body: { isActive: false },
      }),
      { params: Promise.resolve({ id: userId }) },
    );
    expect(res.status).toBe(200);

    const loginAgain = await loginAs("todeactivate@test.local", "password123");
    expect(loginAgain.status).toBe(403);
  });
});
