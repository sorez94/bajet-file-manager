import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const TEST_DB_FILE = path.resolve(__dirname, "../.tmp-test.sqlite");
const TEST_STORAGE_DIR = path.resolve(__dirname, "../.tmp-test-storage");

export default async function setup() {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(TEST_DB_FILE + suffix, { force: true });
  }
  fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });

  process.env.TURSO_DATABASE_URL = `file:${TEST_DB_FILE}`;
  process.env.TURSO_AUTH_TOKEN = "";
  process.env.FILE_STORAGE_PATH = TEST_STORAGE_DIR;
  process.env.MAX_FILE_SIZE_MB = "1";

  const client = createClient({ url: `file:${TEST_DB_FILE}` });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../drizzle") });
  client.close();

  return async () => {
    // Best-effort cleanup — on Windows the worker process's sqlite handle
    // can still be closing when teardown runs, so unlink may transiently
    // fail with EBUSY. That doesn't affect test correctness, so ignore it.
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.rmSync(TEST_DB_FILE + suffix, { force: true });
      } catch {
        // ignore
      }
    }
    try {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  };
}
