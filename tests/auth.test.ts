import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, insertUser, loginAs, clearSession, jsonRequest } from "./helpers";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as listFilesRoute } from "@/app/api/files/route";

describe("authentication", () => {
  beforeEach(async () => {
    await resetDb();
    clearSession();
  });

  it("logs in with valid credentials", async () => {
    await insertUser({ email: "valid@example.com", password: "correct-password" });

    const res = await loginAs("valid@example.com", "correct-password");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("valid@example.com");
  });

  it("rejects an invalid password", async () => {
    await insertUser({ email: "wrongpass@example.com", password: "correct-password" });

    const res = await loginAs("wrongpass@example.com", "totally-wrong");

    expect(res.status).toBe(401);
  });

  it("rejects a login for an email that doesn't exist", async () => {
    const res = await loginAs("nobody@example.com", "whatever123");
    expect(res.status).toBe(401);
  });

  it("refuses login for an inactive (deactivated) user", async () => {
    await insertUser({
      email: "inactive@example.com",
      password: "correct-password",
      isActive: false,
    });

    const res = await loginAs("inactive@example.com", "correct-password");

    expect(res.status).toBe(403);
  });

  it("logs out and invalidates the session so protected routes 401 afterward", async () => {
    await insertUser({ email: "logout@example.com", password: "correct-password" });
    await loginAs("logout@example.com", "correct-password");

    // Session is valid before logout.
    const beforeLogout = await listFilesRoute();
    expect(beforeLogout.status).toBe(200);

    const logoutRes = await logoutRoute(
      jsonRequest("http://localhost/api/auth/logout", { method: "POST" }),
    );
    expect(logoutRes.status).toBe(200);

    const afterLogout = await listFilesRoute();
    expect(afterLogout.status).toBe(401);
  });
});
