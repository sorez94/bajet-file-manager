import "server-only";
import {
  getConfiguredStoragePath,
  setConfiguredStoragePath,
} from "@/lib/storage/config";
import { validateStorageDirectory } from "@/lib/storage/LocalStorageProvider";

export async function getStorageSettings() {
  const path = await getConfiguredStoragePath();
  return { path };
}

export async function updateStorageSettings(
  newPath: string,
  createIfMissing: boolean,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const result = await validateStorageDirectory(newPath, { createIfMissing });
  if (!result.ok) return result;

  await setConfiguredStoragePath(newPath);
  return { ok: true, path: newPath };
}
