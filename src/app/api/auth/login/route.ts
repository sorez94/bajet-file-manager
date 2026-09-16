import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/schemas";
import {
  login,
  InvalidCredentialsError,
  AccountInactiveError,
  TooManyAttemptsError,
} from "@/server/services/authService";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { jsonError } from "@/lib/api/response";

function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError("Invalid request origin.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid email or password.", 400);
  }

  try {
    const user = await login(
      parsed.data.email,
      parsed.data.password,
      getClientKey(request),
    );
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof TooManyAttemptsError) {
      return jsonError(err.message, 429);
    }
    if (err instanceof InvalidCredentialsError) {
      return jsonError(err.message, 401);
    }
    if (err instanceof AccountInactiveError) {
      return jsonError(err.message, 403);
    }
    console.error("[auth/login]", err);
    return jsonError("An unexpected error occurred.", 500);
  }
}
