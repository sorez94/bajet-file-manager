import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { files, users, type FileRecord } from "@/lib/db/schema";
import { getStorageProvider } from "@/lib/storage";
import { sanitizeOriginalName, getExtension } from "@/lib/utils/filename";
import { ALLOWED_MIME_TYPES } from "@/lib/validation/schemas";

export type FileWithUploader = FileRecord & { uploaderEmail: string | null };

export async function listFiles(): Promise<FileWithUploader[]> {
  const rows = await db
    .select({
      id: files.id,
      originalName: files.originalName,
      storedName: files.storedName,
      mimeType: files.mimeType,
      size: files.size,
      storagePath: files.storagePath,
      uploadedBy: files.uploadedBy,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
      uploaderEmail: users.email,
    })
    .from(files)
    .leftJoin(users, eq(files.uploadedBy, users.id))
    .orderBy(desc(files.createdAt));

  return rows;
}

export async function getFileById(id: string): Promise<FileRecord | null> {
  const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return rows[0] ?? null;
}

export class UploadValidationError extends Error {}

const DEFAULT_MAX_SIZE_MB = 100;

export function getMaxUploadBytes(): number {
  const configured = Number(process.env.MAX_FILE_SIZE_MB);
  const mb = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_SIZE_MB;
  return mb * 1024 * 1024;
}

export async function uploadFile(
  file: File,
  uploadedBy: string,
): Promise<FileRecord> {
  const maxBytes = getMaxUploadBytes();
  if (file.size > maxBytes) {
    throw new UploadValidationError(
      `File exceeds the maximum allowed size of ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    );
  }
  if (file.size <= 0) {
    throw new UploadValidationError("File is empty.");
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new UploadValidationError(`File type "${mimeType}" is not allowed.`);
  }

  const originalName = sanitizeOriginalName(file.name);
  const extension = getExtension(originalName);
  const storage = getStorageProvider();

  const handle = await storage.upload(file.stream(), extension);

  const record: FileRecord = {
    id: crypto.randomUUID(),
    originalName,
    storedName: handle.storedName,
    mimeType,
    size: file.size,
    storagePath: handle.storedName,
    uploadedBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.insert(files).values(record);
  } catch (err) {
    // Keep storage and database consistent if the metadata write fails.
    await storage.delete(handle.storedName);
    throw err;
  }

  return record;
}

export async function deleteFileRecord(id: string): Promise<void> {
  const record = await getFileById(id);
  if (!record) throw new Error("File not found.");

  await getStorageProvider().delete(record.storagePath);
  await db.delete(files).where(eq(files.id, id));
}

/** Removes only the database row, for when the physical file is already gone (orphan cleanup). */
export async function deleteOrphanRecord(id: string): Promise<void> {
  await db.delete(files).where(eq(files.id, id));
}
