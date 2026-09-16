import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { getConfiguredStoragePath } from "./config";
import type { StorageService, StoredFileHandle } from "./StorageService";

/** Keeps only a short, safe extension (letters/digits, max 10 chars) — never trusts user input beyond this. */
function sanitizeExtension(extension: string): string {
  const cleaned = extension.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  return cleaned ? `.${cleaned.toLowerCase()}` : "";
}

/** Defense in depth: guarantees the resolved path can never escape the storage root. */
function resolveWithinRoot(root: string, storedName: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, storedName);
  if (
    resolvedPath !== resolvedRoot &&
    !resolvedPath.startsWith(resolvedRoot + path.sep)
  ) {
    throw new Error("Resolved storage path escapes the storage root");
  }
  return resolvedPath;
}

export class LocalStorageProvider implements StorageService {
  async upload(
    data: ReadableStream | Buffer,
    extension: string,
  ): Promise<StoredFileHandle> {
    const root = await getConfiguredStoragePath();
    await fs.mkdir(root, { recursive: true });

    const storedName = `${crypto.randomUUID()}${sanitizeExtension(extension)}`;
    const fullPath = resolveWithinRoot(root, storedName);

    if (Buffer.isBuffer(data)) {
      await fs.writeFile(fullPath, data);
    } else {
      const nodeStream = Readable.fromWeb(data as NodeWebReadableStream);
      const fileHandle = await fs.open(fullPath, "w");
      try {
        const writeStream = fileHandle.createWriteStream();
        for await (const chunk of nodeStream) {
          if (!writeStream.write(chunk)) {
            await new Promise<void>((resolve) =>
              writeStream.once("drain", () => resolve()),
            );
          }
        }
        await new Promise<void>((resolve, reject) => {
          writeStream.end((err: Error | null | undefined) =>
            err ? reject(err) : resolve(),
          );
        });
      } finally {
        await fileHandle.close();
      }
    }

    return { storedName };
  }

  async download(storedName: string): Promise<ReadableStream> {
    const root = await getConfiguredStoragePath();
    const fullPath = resolveWithinRoot(root, storedName);
    await fs.access(fullPath);
    return Readable.toWeb(
      createReadStream(fullPath),
    ) as unknown as ReadableStream;
  }

  async delete(storedName: string): Promise<void> {
    const root = await getConfiguredStoragePath();
    const fullPath = resolveWithinRoot(root, storedName);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async exists(storedName: string): Promise<boolean> {
    const root = await getConfiguredStoragePath();
    const fullPath = resolveWithinRoot(root, storedName);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(storedName: string): Promise<{ size: number } | null> {
    const root = await getConfiguredStoragePath();
    const fullPath = resolveWithinRoot(root, storedName);
    try {
      const stat = await fs.stat(fullPath);
      return { size: stat.size };
    } catch {
      return null;
    }
  }
}

/**
 * Validates a candidate storage directory for the settings page: checks it
 * exists (optionally creating it) and that the process can read/write it.
 */
export async function validateStorageDirectory(
  targetPath: string,
  { createIfMissing = false }: { createIfMissing?: boolean } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resolved = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), targetPath);

  try {
    const stat = await fs.stat(resolved).catch(() => null);
    if (!stat) {
      if (!createIfMissing) {
        return { ok: false, error: "Directory does not exist." };
      }
      await fs.mkdir(resolved, { recursive: true });
    } else if (!stat.isDirectory()) {
      return { ok: false, error: "Path exists but is not a directory." };
    }

    const probeFile = path.join(resolved, `.write-test-${Date.now()}`);
    await fs.writeFile(probeFile, "ok");
    await fs.unlink(probeFile);

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Directory is not accessible: ${message}` };
  }
}

export const localStorageProvider = new LocalStorageProvider();
