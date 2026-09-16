import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

declare global {
  var __dbClient: ReturnType<typeof createClient> | undefined;
}

/**
 * TURSO_DATABASE_URL defaults to a local file so the app runs with zero
 * external setup. Pointing it at a real libsql:// / https:// Turso URL
 * (with TURSO_AUTH_TOKEN) is a config-only change — no code changes needed.
 */
const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client =
  global.__dbClient ??
  createClient(
    authToken ? { url, authToken } : { url },
  );

if (process.env.NODE_ENV !== "production") {
  global.__dbClient = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
