"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/format";
import type { LogLevel } from "@/lib/db/schema";

export interface ClientLogEntry {
  id: string;
  level: LogLevel;
  message: string;
  context: string | null;
  createdAt: string;
}

const toneByLevel: Record<LogLevel, "neutral" | "warning" | "danger"> = {
  info: "neutral",
  warn: "warning",
  error: "danger",
};

function formatContext(context: string | null): string | null {
  if (!context) return null;
  try {
    return JSON.stringify(JSON.parse(context));
  } catch {
    return context;
  }
}

export function LogsTable({ logs }: { logs: ClientLogEntry[] }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => startRefresh(() => router.refresh());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Logs</h1>
          <p className="text-sm text-slate-500">
            {logs.length} recent event{logs.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="secondary" onClick={refresh} isLoading={isRefreshing}>
          <RefreshCw className="size-4" aria-hidden />
          Refresh
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <ScrollText className="size-10 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-700">No log entries yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Authentication failures, upload/deletion errors, and configuration
            problems will show up here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const context = formatContext(log.context);
                  const expanded = expandedId === log.id;
                  return (
                    <tr
                      key={log.id}
                      className={context ? "cursor-pointer hover:bg-slate-50" : undefined}
                      onClick={() => context && setExpandedId(expanded ? null : log.id)}
                    >
                      <td className="px-4 py-3 align-top">
                        <Badge tone={toneByLevel[log.level]}>{log.level}</Badge>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-slate-900">{log.message}</p>
                        {context && (
                          <p
                            className={`mt-1 font-mono text-xs text-slate-500 ${expanded ? "" : "truncate"}`}
                          >
                            {context}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
