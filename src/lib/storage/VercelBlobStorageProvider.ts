import "server-only";
import { put, del, head, get, BlobNotFoundError } from "@vercel/blob";
import type { StorageService, StoredFileHandle } from "./StorageService";

/** Keeps only a short, safe extension (letters/digits, max 10 chars) — never trusts user input beyond this. */
function sanitizeExtension(extension: string): string {
  const cleaned = extension.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  return cleaned ? `.${cleaned.toLowerCase()}` : "";
}

/**
 * Storage backend for serverless deployments (e.g. Vercel) that have no
 * persistent, shared local disk. Blobs are stored with `access: "private"`
 * so they can only be read with our BLOB_READ_WRITE_TOKEN — the client
 * never sees a direct blob URL, only our own authenticated download route.
 */
export class VercelBlobStorageProvider implements StorageService {
  async upload(data: ReadableStream | Buffer, extension: string): Promise<StoredFileHandle> {
    const storedName = `${crypto.randomUUID()}${sanitizeExtension(extension)}`;
    await put(storedName, data, { access: "private" });
    return { storedName };
  }

  async download(storedName: string): Promise<ReadableStream> {
    const result = await get(storedName, { access: "private" });
    if (!result?.stream) {
      throw new Error(`Blob "${storedName}" not found`);
    }
    return result.stream;
  }

  async delete(storedName: string): Promise<void> {
    try {
      await del(storedName);
    } catch (err) {
      if (!(err instanceof BlobNotFoundError)) throw err;
    }
  }

  async exists(storedName: string): Promise<boolean> {
    try {
      await head(storedName);
      return true;
    } catch (err) {
      if (err instanceof BlobNotFoundError) return false;
      throw err;
    }
  }

  async getMetadata(storedName: string): Promise<{ size: number } | null> {
    try {
      const result = await head(storedName);
      return { size: result.size };
    } catch (err) {
      if (err instanceof BlobNotFoundError) return null;
      throw err;
    }
  }
}

export const vercelBlobStorageProvider = new VercelBlobStorageProvider();
