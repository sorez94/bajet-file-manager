import { requireApiUser } from "@/lib/auth/guards";
import { getFileById } from "@/server/services/fileService";
import { getStorageProvider } from "@/lib/storage";
import { handleApiError, jsonError } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiUser();
    const { id } = await params;

    const record = await getFileById(id);
    if (!record) return jsonError("File not found.", 404);

    const storage = getStorageProvider();
    const exists = await storage.exists(record.storagePath);
    if (!exists) {
      return jsonError(
        "The file is missing from storage. It may need to be removed.",
        404,
      );
    }

    const stream = await storage.download(record.storagePath);
    const encodedName = encodeURIComponent(record.originalName);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType || "application/octet-stream",
        "Content-Length": String(record.size),
        "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleApiError(err, "files/download");
  }
}
