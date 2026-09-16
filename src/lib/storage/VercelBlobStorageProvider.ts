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
 * persistent, shared local disk.
 *
 * Blobs are stored with `access: "public"` because Vercel Blob stores
 * created through the standard dashboard/CLI flow only accept "public"
 * puts (this store's own configuration rejects "private" — see
 * `docs/vercel-blob-access.md`-equivalent note in the README). This does
 * NOT make files publicly browsable in practice: the object pathname is a
 * `crypto.randomUUID()`, never guessable, and — critically — this app
 * never sends the resulting blob URL to the client. Every download still
 * goes through our own authenticated `/api/files/:id/download` route,
 * which fetches the blob server-side and streams the bytes back; the
 * direct blob URL is never exposed. The residual risk versus true private
 * storage is someone obtaining the exact random URL through some other
 * channel (e.g. the Vercel dashboard's own blob browser, which already
 * requires access to the account) — there is no listing/enumeration
 * endpoint that leaks it.
 */
export class VercelBlobStorageProvider implements StorageService {
  async upload(data: ReadableStream | Buffer, extension: string): Promise<StoredFileHandle> {
    const storedName = `${crypto.randomUUID()}${sanitizeExtension(extension)}`;
    await put(storedName, data, { access: "public" });
    return { storedName };
  }

  async download(storedName: string): Promise<ReadableStream> {
    const result = await get(storedName, { access: "public" });
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
