import "server-only";
import type { StorageService, StorageDriver } from "./StorageService";
import { localStorageProvider } from "./LocalStorageProvider";
import { vercelBlobStorageProvider } from "./VercelBlobStorageProvider";

export type { StorageDriver };

/**
 * Picks the storage backend for this deployment. Vercel's serverless
 * functions have no persistent, shared local disk, so local-disk storage
 * cannot work there — Vercel automatically provides BLOB_READ_WRITE_TOKEN
 * once a Blob store is linked to the project, and we use its presence as
 * the signal to switch backends. Set STORAGE_DRIVER explicitly to override.
 */
export function getStorageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "local" || explicit === "vercel-blob") return explicit;
  return process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local";
}

export function getStorageProvider(): StorageService {
  return getStorageDriver() === "vercel-blob"
    ? vercelBlobStorageProvider
    : localStorageProvider;
}
