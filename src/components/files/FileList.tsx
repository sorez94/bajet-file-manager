"use client";

import { Download, Trash2, FileX2 } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { formatBytes, formatDate } from "@/lib/utils/format";
import type { ClientFile } from "@/types";

interface FileListProps {
  files: ClientFile[];
  onDelete: (file: ClientFile) => void;
  deletingId: string | null;
}

export function FileList({ files, onDelete, deletingId }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <FileX2 className="size-10 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-700">No files yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Upload your first file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Uploaded By</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileIcon mimeType={file.mimeType} originalName={file.originalName} />
                    <span className="max-w-[220px] truncate font-medium text-slate-900" title={file.originalName}>
                      {file.originalName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{file.mimeType}</td>
                <td className="px-4 py-3 text-slate-600">{formatBytes(file.size)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {file.uploaderEmail ?? "Unknown"}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(file.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={`/api/files/${file.id}/download`}
                      className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                      aria-label={`Download ${file.originalName}`}
                    >
                      <Download className="size-4" />
                    </a>
                    <button
                      onClick={() => onDelete(file)}
                      disabled={deletingId === file.id}
                      className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      aria-label={`Delete ${file.originalName}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
