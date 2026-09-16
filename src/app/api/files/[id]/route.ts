import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { deleteFileRecord } from "@/server/services/fileService";
import { handleApiError, jsonError } from "@/lib/api/response";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonError("Invalid request origin.", 403);
    }
    await requireApiUser();
    const { id } = await params;

    await deleteFileRecord(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "File not found.") {
      return jsonError(err.message, 404);
    }
    return handleApiError(err, "files/delete");
  }
}
