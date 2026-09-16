import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/guards";
import { logEvent } from "@/lib/logger";

/**
 * Maps any thrown error to a safe HTTP response. Never leaks stack traces,
 * internal paths, or raw error messages for unexpected failures — those are
 * logged server-side (console + the `logs` table) instead.
 */
export async function handleApiError(
  err: unknown,
  context: string,
): Promise<NextResponse> {
  if (err instanceof UnauthorizedError) {
    await logEvent("warn", "Unauthorized request", { route: context });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    await logEvent("warn", "Forbidden request", { route: context });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", issues: err.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  await logEvent("error", `Unhandled error in ${context}`, { route: context, error: message });
  return NextResponse.json(
    { error: "An unexpected error occurred." },
    { status: 500 },
  );
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
