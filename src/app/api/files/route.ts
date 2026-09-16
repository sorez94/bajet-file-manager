import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { listFiles } from "@/server/services/fileService";
import { handleApiError } from "@/lib/api/response";
import { toClientFile } from "@/lib/api/serialize";

export async function GET() {
  try {
    await requireApiUser();
    const files = await listFiles();
    return NextResponse.json({ files: files.map(toClientFile) });
  } catch (err) {
    return handleApiError(err, "files/list");
  }
}
