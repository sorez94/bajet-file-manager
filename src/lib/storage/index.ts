import "server-only";
import type { StorageService, StorageDriver } from "./StorageService";
import { localStorageProvider } from "./LocalStorageProvider";
import { vercelBlobStorageProvider } from "./VercelBlobStorageProvider";

export type { StorageDriver };

/**
 * Picks the storage backend for this deployment. Vercel's serverless
 * functions have no persistent, shared local disk, so local-disk storage
 * cannot work there. Once a Blob store is connected to the project, Vercel
 * injects credentials one of two ways depending on how the store was
 * connected: either a static BLOB_READ_WRITE_TOKEN, or (the newer flow)
 * BLOB_STORE_ID paired with a runtime-injected VERCEL_OIDC_TOKEN — the
 * @vercel/blob SDK picks whichever is present automatically. We treat
 * either one as the signal to switch backends. Set STORAGE_DRIVER
 * explicitly to override.
 */
export function getStorageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "local" || explicit === "vercel-blob") return explicit;
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
    ? "vercel-blob"
    : "local";
}

export function getStorageProvider(): StorageService {
  return getStorageDriver() === "vercel-blob"
    ? vercelBlobStorageProvider
    : localStorageProvider;
}
