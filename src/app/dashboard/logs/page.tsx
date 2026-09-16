import { requireSuperAdmin } from "@/lib/auth/guards";
import { listLogs } from "@/server/services/logService";
import { LogsTable } from "@/components/logs/LogsTable";

export default async function LogsPage() {
  await requireSuperAdmin();
  const logs = await listLogs();

  return <LogsTable logs={logs} />;
}
