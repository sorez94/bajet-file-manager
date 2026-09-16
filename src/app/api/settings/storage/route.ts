import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/auth/guards";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { storageSettingsSchema } from "@/lib/validation/schemas";
import {
  getStorageSettings,
  updateStorageSettings,
} from "@/server/services/settingsService";
import { handleApiError, jsonError } from "@/lib/api/response";

export async function GET() {
  try {
    await requireApiSuperAdmin();
    const settings = await getStorageSettings();
    return NextResponse.json(settings);
  } catch (err) {
    return handleApiError(err, "settings/storage/get");
  }
}

export async function PUT(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonError("Invalid request origin.", 403);
    }
    await requireApiSuperAdmin();

    const body = await request.json().catch(() => null);
    const parsed = storageSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const result = await updateStorageSettings(
      parsed.data.path,
      parsed.data.createIfMissing,
    );
    if (!result.ok) {
      return jsonError(result.error, 400);
    }

    return NextResponse.json({ path: result.path });
  } catch (err) {
    return handleApiError(err, "settings/storage/update");
  }
}
