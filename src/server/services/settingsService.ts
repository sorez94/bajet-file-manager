import "server-only";
import {
  getConfiguredStoragePath,
  setConfiguredStoragePath,
} from "@/lib/storage/config";
import { validateStorageDirectory } from "@/lib/storage/LocalStorageProvider";
import { getStorageDriver, type StorageDriver } from "@/lib/storage";

export async function getStorageSettings(): Promise<{
  driver: StorageDriver;
  path: string | null;
}> {
  const driver = getStorageDriver();
  if (driver === "vercel-blob") return { driver, path: null };
  return { driver, path: await getConfiguredStoragePath() };
}

export async function updateStorageSettings(
  newPath: string,
  createIfMissing: boolean,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (getStorageDriver() === "vercel-blob") {
    return {
      ok: false,
      error:
        "Storage is backed by Vercel Blob in this deployment — the local directory setting doesn't apply.",
    };
  }

  const result = await validateStorageDirectory(newPath, { createIfMissing });
  if (!result.ok) return result;

  await setConfiguredStoragePath(newPath);
  return { ok: true, path: newPath };
}
