/**
 * Reset a user's password directly in the database.
 *
 * Usage: npm run reset-password -- <email> <newPassword>
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users } from "../src/lib/db/schema";

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error("Usage: npm run reset-password -- <email> <newPassword>");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient(authToken ? { url, authToken } : { url });
  const db = drizzle(client, { schema: { users } });

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`No user found with email: ${normalizedEmail}`);
  }

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(newPassword, 12),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.email, normalizedEmail));

  console.log(`Password updated for: ${normalizedEmail}`);
  client.close();
}

main().catch((err) => {
  console.error("Reset failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
