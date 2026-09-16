import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { uploadFile, UploadValidationError } from "@/server/services/fileService";
import { handleApiError, jsonError } from "@/lib/api/response";
import { toClientFile } from "@/lib/api/serialize";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonError("Invalid request origin.", 403);
    }
    const user = await requireApiUser();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("No file provided.", 400);
    }

    const record = await uploadFile(file, user.id);
    return NextResponse.json(
      { file: toClientFile({ ...record, uploaderEmail: user.email }) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return jsonError(err.message, 400);
    }
    return handleApiError(err, "files/upload");
  }
}
