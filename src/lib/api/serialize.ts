import type { FileWithUploader } from "@/server/services/fileService";
import type { FileRecord } from "@/lib/db/schema";
import type { ClientFile } from "@/types";

/** Never sends storedName/storagePath to the client — those are internal filesystem details. */
export function toClientFile(file: FileWithUploader | FileRecord): ClientFile {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    uploadedBy: file.uploadedBy,
    uploaderEmail: "uploaderEmail" in file ? file.uploaderEmail : null,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}
