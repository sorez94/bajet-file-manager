import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/auth/guards";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { updateUserSchema } from "@/lib/validation/schemas";
import { updateUser, deleteUser } from "@/server/services/userService";
import { handleApiError, jsonError } from "@/lib/api/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonError("Invalid request origin.", 403);
    }
    await requireApiSuperAdmin();
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const user = await updateUser(id, parsed.data);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof Error && err.message === "User not found.") {
      return jsonError(err.message, 404);
    }
    if (
      err instanceof Error &&
      (err.message.includes("last active super admin") ||
        err.message.includes("already exists"))
    ) {
      return jsonError(err.message, 409);
    }
    return handleApiError(err, "users/update");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonError("Invalid request origin.", 403);
    }
    const actor = await requireApiSuperAdmin();
    const { id } = await params;

    if (actor.id === id) {
      return jsonError("You cannot delete your own account.", 400);
    }

    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "User not found.") {
      return jsonError(err.message, 404);
    }
    if (err instanceof Error && err.message.includes("last active super admin")) {
      return jsonError(err.message, 409);
    }
    if (
      err instanceof Error &&
      /FOREIGN KEY|constraint/i.test(err.message)
    ) {
      return jsonError(
        "This user uploaded files and cannot be deleted. Deactivate the account instead.",
        409,
      );
    }
    return handleApiError(err, "users/delete");
  }
}
