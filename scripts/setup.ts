/**
 * One-time / idempotent initialization CLI.
 *
 * Run with `npm run setup` after configuring `.env.local`. Safe to re-run:
 * it only creates the super admin and default settings if they don't
 * already exist, and only migrates schema changes that haven't been
 * applied yet.
 *
 * Why a CLI instead of a `/setup` web wizard: collecting database
 * credentials through a browser form and writing them back to environment
 * config from a web request is meaningfully more attack surface (an
 * unauthenticated endpoint that can rewrite server config) for no real
 * benefit in a self-hosted, single-operator deployment. Environment
 * variables + a CLI script are simpler and safer.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import path from "node:path";
import fs from "node:fs/promises";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users, settings } from "../src/lib/db/schema";

async function main() {
  const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  console.log(`\n[1/5] Connecting to database: ${url}`);
  const client = createClient(authToken ? { url, authToken } : { url });
  await client.execute("select 1");
  console.log("      Connection OK.");

  const db = drizzle(client, { schema: { users, settings } });

  console.log("\n[2/5] Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("      Schema is up to date.");

  console.log("\n[3/5] Checking for an existing super admin...");
  const existingAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "SUPER_ADMIN"))
    .limit(1);

  if (existingAdmins.length > 0) {
    console.log("      A super admin already exists — skipping creation.");
  } else {
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error(
        "No super admin exists yet, and INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD " +
          "are not set. Add them to .env.local and re-run `npm run setup`.",
      );
    }
    if (password.length < 8) {
      throw new Error("INITIAL_ADMIN_PASSWORD must be at least 8 characters.");
    }

    const now = new Date().toISOString();
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: email.trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      role: "SUPER_ADMIN",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`      Created super admin: ${email}`);
  }

  console.log("\n[4/5] Checking default storage configuration...");
  const storageKey = "storage.path";
  const existingSetting = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, storageKey))
    .limit(1);

  const defaultStoragePath = process.env.FILE_STORAGE_PATH || "./storage/uploads";

  if (existingSetting.length > 0) {
    console.log(`      Storage path already configured: ${existingSetting[0].value}`);
  } else {
    const now = new Date().toISOString();
    await db.insert(settings).values({
      id: crypto.randomUUID(),
      key: storageKey,
      value: defaultStoragePath,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`      Set default storage path: ${defaultStoragePath}`);
  }

  console.log("\n[5/5] Verifying storage directory is writable...");
  const finalPath = existingSetting[0]?.value ?? defaultStoragePath;
  const resolved = path.isAbsolute(finalPath)
    ? finalPath
    : path.resolve(process.cwd(), finalPath);
  await fs.mkdir(resolved, { recursive: true });
  const probe = path.join(resolved, `.write-test-${Date.now()}`);
  await fs.writeFile(probe, "ok");
  await fs.unlink(probe);
  console.log(`      Storage directory OK: ${resolved}`);

  client.close();
  console.log("\nSetup complete. You can now run `npm run dev` and log in.\n");
}

main().catch((err) => {
  console.error("\nSetup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
