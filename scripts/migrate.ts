import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

async function main() {
  const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  console.log(`Running migrations against: ${url}`);
  const client = createClient(authToken ? { url, authToken } : { url });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
  client.close();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
