import { requireUser } from "@/lib/auth/guards";
import { listFiles } from "@/server/services/fileService";
import { toClientFile } from "@/lib/api/serialize";
import { FileManager } from "@/components/files/FileManager";

export default async function DashboardFilesPage() {
  await requireUser();
  const files = await listFiles();

  return <FileManager initialFiles={files.map(toClientFile)} />;
}
