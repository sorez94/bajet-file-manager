import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { logs, type LogEntry } from "@/lib/db/schema";

const DEFAULT_LIMIT = 200;

export async function listLogs(limit: number = DEFAULT_LIMIT): Promise<LogEntry[]> {
  return db.select().from(logs).orderBy(desc(logs.createdAt)).limit(limit);
}
