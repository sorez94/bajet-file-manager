"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { UploadButton } from "./UploadButton";
import { FileList } from "./FileList";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { ClientFile } from "@/types";

export function FileManager({ initialFiles }: { initialFiles: ClientFile[] }) {
  const { show } = useToast();
  const [files, setFiles] = useState<ClientFile[]>(initialFiles);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await apiRequest<{ files: ClientFile[] }>("/api/files");
      setFiles(data.files);
    } catch (err) {
      show("error", err instanceof ApiError ? err.message : "Failed to refresh files.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUploaded = (file: ClientFile) => {
    setFiles((prev) => [file, ...prev]);
    show("success", `"${file.originalName}" uploaded successfully.`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/api/files/${deleteTarget.id}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      show("success", `"${deleteTarget.originalName}" deleted.`);
    } catch (err) {
      show("error", err instanceof ApiError ? err.message : "Failed to delete file.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Files</h1>
          <p className="text-sm text-slate-500">{files.length} file(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={refresh} isLoading={isRefreshing}>
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
          <UploadButton
            onUploaded={handleUploaded}
            onError={(message) => show("error", message)}
          />
        </div>
      </div>

      <FileList
        files={files}
        onDelete={setDeleteTarget}
        deletingId={isDeleting ? deleteTarget?.id ?? null : null}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete file"
        description={`Are you sure you want to delete "${deleteTarget?.originalName}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
