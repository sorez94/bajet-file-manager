import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/auth/guards";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { createUserSchema } from "@/lib/validation/schemas";
import { listUsers, createUser } from "@/server/services/userService";
import { handleApiError, jsonError } from "@/lib/api/response";

export async function GET() {
  try {
    await requireApiSuperAdmin();
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err, "users/list");
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonError("Invalid request origin.", 403);
    }
    await requireApiSuperAdmin();

    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const user = await createUser(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      return jsonError(err.message, 409);
    }
    return handleApiError(err, "users/create");
  }
}
