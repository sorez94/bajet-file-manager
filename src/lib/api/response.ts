import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/guards";

/**
 * Maps any thrown error to a safe HTTP response. Never leaks stack traces,
 * internal paths, or raw error messages for unexpected failures — those are
 * logged server-side instead.
 */
export function handleApiError(err: unknown, context: string): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", issues: err.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  console.error(`[${context}]`, err);
  return NextResponse.json(
    { error: "An unexpected error occurred." },
    { status: 500 },
  );
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
