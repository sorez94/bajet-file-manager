import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
