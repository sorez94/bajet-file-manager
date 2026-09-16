import "server-only";
import { db } from "@/lib/db/client";
import { logs, type LogLevel } from "@/lib/db/schema";

/**
 * Logs an event to the console (so it shows up in platform logs, e.g.
 * Vercel's function logs) and persists it to the `logs` table so it's
 * visible in-app at /dashboard/logs.
 *
 * Callers should `await` this — on serverless platforms, an un-awaited
 * write can be cut off when the response finishes and the function
 * instance freezes/exits before the insert completes. It never throws
 * itself, though: a logging failure must never break the request it's
 * describing.
 */
export async function logEvent(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const line = `[${level.toUpperCase()}] ${message}`;
  if (level === "error") console.error(line, context ?? "");
  else if (level === "warn") console.warn(line, context ?? "");
  else console.log(line, context ?? "");

  try {
    await db.insert(logs).values({
      id: crypto.randomUUID(),
      level,
      message,
      context: context ? JSON.stringify(context) : null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[logger] failed to persist log entry", err);
  }
}
