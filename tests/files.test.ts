import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, insertUser, loginAs, clearSession } from "./helpers";
import { GET as listFilesRoute } from "@/app/api/files/route";
import { POST as uploadRoute } from "@/app/api/files/upload/route";
import { GET as downloadRoute } from "@/app/api/files/[id]/download/route";
import { DELETE as deleteFileRoute } from "@/app/api/files/[id]/route";
import { localStorageProvider } from "@/lib/storage/LocalStorageProvider";

function uploadRequest(fileName: string, content: string, type = "text/plain") {
  const formData = new FormData();
  formData.append("file", new File([content], fileName, { type }));
  return new Request("http://localhost/api/files/upload", {
    method: "POST",
    body: formData,
  });
}

describe("files", () => {
  beforeEach(async () => {
    await resetDb();
    clearSession();
    await insertUser({ email: "uploader@test.local", password: "password123" });
  });

  it("rejects unauthenticated upload/list/download/delete", async () => {
    expect((await listFilesRoute()).status).toBe(401);
    expect((await uploadRoute(uploadRequest("a.txt", "hi"))).status).toBe(401);
    expect(
      (await downloadRoute(new Request("http://localhost/x"), {
        params: Promise.resolve({ id: "does-not-matter" }),
      })).status,
    ).toBe(401);
    expect(
      (await deleteFileRoute(new Request("http://localhost/x", { method: "DELETE" }), {
        params: Promise.resolve({ id: "does-not-matter" }),
      })).status,
    ).toBe(401);
  });

  it("uploads a file, lists it, downloads it, then deletes it", async () => {
    await loginAs("uploader@test.local", "password123");

    const uploadRes = await uploadRoute(uploadRequest("hello.txt", "Hello, world!"));
    expect(uploadRes.status).toBe(201);
    const uploaded = (await uploadRes.json()).file;
    expect(uploaded.originalName).toBe("hello.txt");
    expect(uploaded.storedName).toBeUndefined(); // internal detail must not leak to client

    const listRes = await listFilesRoute();
    const { files } = await listRes.json();
    expect(files).toHaveLength(1);
    expect(files[0].id).toBe(uploaded.id);

    const downloadRes = await downloadRoute(
      new Request(`http://localhost/api/files/${uploaded.id}/download`),
      { params: Promise.resolve({ id: uploaded.id }) },
    );
    expect(downloadRes.status).toBe(200);
    expect(await downloadRes.text()).toBe("Hello, world!");
    expect(downloadRes.headers.get("content-disposition")).toContain("hello.txt");

    const deleteRes = await deleteFileRoute(
      new Request(`http://localhost/api/files/${uploaded.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: uploaded.id }) },
    );
    expect(deleteRes.status).toBe(200);

    const listAfterDelete = await listFilesRoute();
    expect((await listAfterDelete.json()).files).toHaveLength(0);
  });

  it("returns 404 when downloading a file id that doesn't exist", async () => {
    await loginAs("uploader@test.local", "password123");

    const res = await downloadRoute(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: crypto.randomUUID() }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects a file that exceeds the configured max size", async () => {
    await loginAs("uploader@test.local", "password123");

    // MAX_FILE_SIZE_MB=1 in the test environment (see globalSetup.ts).
    const big = "x".repeat(2 * 1024 * 1024);
    const res = await uploadRoute(uploadRequest("big.txt", big));
    expect(res.status).toBe(400);
  });

  it("rejects a disallowed MIME type", async () => {
    await loginAs("uploader@test.local", "password123");

    const res = await uploadRoute(uploadRequest("script.exe", "MZ", "application/x-msdownload"));
    expect(res.status).toBe(400);
  });

  it("prevents path traversal at the storage layer", async () => {
    await expect(localStorageProvider.download("../../etc/passwd")).rejects.toThrow();
    await expect(localStorageProvider.download("..\\..\\windows\\system32")).rejects.toThrow();
  });
});
