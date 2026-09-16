"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ClientFile } from "@/types";

interface UploadButtonProps {
  onUploaded: (file: ClientFile) => void;
  onError: (message: string) => void;
}

function uploadWithProgress(
  file: globalThis.File,
  onProgress: (percent: number) => void,
): Promise<ClientFile> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.file as ClientFile);
        } else {
          reject(new Error(data?.error ?? "Upload failed."));
        }
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));

    xhr.send(formData);
  });
}

export function UploadButton({ onUploaded, onError }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadWithProgress(file, setProgress);
      onUploaded(uploaded);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={() => inputRef.current?.click()}
        isLoading={isUploading}
        disabled={isUploading}
      >
        <Upload className="size-4" aria-hidden />
        Upload File
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {isUploading && (
        <div className="flex w-32 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{progress}%</span>
        </div>
      )}
    </div>
  );
}
