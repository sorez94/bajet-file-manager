import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, insertUser, loginAs, clearSession, jsonRequest } from "./helpers";
import { GET as listUsersRoute } from "@/app/api/users/route";
import {
  GET as getStorageSettingsRoute,
  PUT as putStorageSettingsRoute,
} from "@/app/api/settings/storage/route";
import { GET as listFilesRoute } from "@/app/api/files/route";

describe("authorization", () => {
  beforeEach(async () => {
    await resetDb();
    clearSession();
    await insertUser({ email: "admin@test.local", password: "password123", role: "SUPER_ADMIN" });
    await insertUser({ email: "user@test.local", password: "password123", role: "USER" });
  });

  it("blocks an unauthenticated request to a protected endpoint", async () => {
    const res = await listFilesRoute();
    expect(res.status).toBe(401);
  });

  it("forbids a regular user from listing users", async () => {
    await loginAs("user@test.local", "password123");
    const res = await listUsersRoute();
    expect(res.status).toBe(403);
  });

  it("forbids a regular user from reading storage settings", async () => {
    await loginAs("user@test.local", "password123");
    const res = await getStorageSettingsRoute();
    expect(res.status).toBe(403);
  });

  it("forbids a regular user from writing storage settings", async () => {
    await loginAs("user@test.local", "password123");
    const res = await putStorageSettingsRoute(
      jsonRequest("http://localhost/api/settings/storage", {
        method: "PUT",
        body: { path: "./anywhere" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("allows a super admin to list users", async () => {
    await loginAs("admin@test.local", "password123");
    const res = await listUsersRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users.length).toBe(2);
  });

  it("allows a super admin to read storage settings", async () => {
    await loginAs("admin@test.local", "password123");
    const res = await getStorageSettingsRoute();
    expect(res.status).toBe(200);
  });

  it("allows a regular user to list files (not an admin-only resource)", async () => {
    await loginAs("user@test.local", "password123");
    const res = await listFilesRoute();
    expect(res.status).toBe(200);
  });
});
