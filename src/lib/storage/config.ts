import "server-only";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";

export const STORAGE_PATH_KEY = "storage.path";
const DEFAULT_STORAGE_PATH = "./storage/uploads";

/**
 * Resolves the configured storage directory as an absolute path.
 *
 * Precedence: database setting (persisted via the settings UI) wins if
 * present; otherwise FILE_STORAGE_PATH from the environment; otherwise the
 * built-in default. Once a super admin saves a path through the settings
 * page, the database value takes over on every subsequent boot, even if the
 * environment variable still points elsewhere.
 */
export async function getConfiguredStoragePath(): Promise<string> {
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, STORAGE_PATH_KEY))
    .limit(1);

  const configured =
    row[0]?.value || process.env.FILE_STORAGE_PATH || DEFAULT_STORAGE_PATH;

  return path.isAbsolute(configured)
    ? configured
    : // The storage directory is a runtime setting, not a project asset —
      // it must not be statically traced/bundled by the build.
      path.resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

export async function setConfiguredStoragePath(newPath: string): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db
    .select({ id: settings.id })
    .from(settings)
    .where(eq(settings.key, STORAGE_PATH_KEY))
    .limit(1);

  if (existing[0]) {
    await db
      .update(settings)
      .set({ value: newPath, updatedAt: now })
      .where(eq(settings.key, STORAGE_PATH_KEY));
  } else {
    await db.insert(settings).values({
      id: crypto.randomUUID(),
      key: STORAGE_PATH_KEY,
      value: newPath,
      createdAt: now,
      updatedAt: now,
    });
  }
}
