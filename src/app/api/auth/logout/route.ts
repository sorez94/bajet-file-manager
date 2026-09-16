import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { jsonError } from "@/lib/api/response";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError("Invalid request origin.", 403);
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
