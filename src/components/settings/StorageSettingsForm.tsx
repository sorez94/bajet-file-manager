"use client";

import { useState, type FormEvent } from "react";
import { FolderCog, Cloud } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { StorageDriver } from "@/lib/storage/StorageService";

interface StorageSettingsFormProps {
  driver: StorageDriver;
  initialPath: string | null;
}

export function StorageSettingsForm({ driver, initialPath }: StorageSettingsFormProps) {
  if (driver === "vercel-blob") {
    return (
      <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Cloud className="size-5 text-slate-700" aria-hidden />
          <h1 className="text-lg font-semibold text-slate-900">Storage Configuration</h1>
        </div>
        <p className="text-sm text-slate-500">
          This deployment stores uploaded files in{" "}
          <span className="font-medium text-slate-700">Vercel Blob</span>.
          There is no local directory to configure — Vercel manages storage
          for this backend. Blobs are stored as private and are only
          reachable through this app&apos;s authenticated download endpoint.
        </p>
      </div>
    );
  }

  return <LocalStorageSettingsForm initialPath={initialPath ?? "./storage/uploads"} />;
}

function LocalStorageSettingsForm({ initialPath }: { initialPath: string }) {
  const { show } = useToast();
  const [path, setPath] = useState(initialPath);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [offerCreate, setOfferCreate] = useState(false);

  const submit = async (createIfMissing: boolean) => {
    setIsSaving(true);
    setError(null);
    setOfferCreate(false);
    try {
      const data = await apiRequest<{ path: string }>("/api/settings/storage", {
        method: "PUT",
        body: JSON.stringify({ path, createIfMissing }),
      });
      setCurrentPath(data.path);
      show("success", "Storage directory updated.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update storage settings.";
      setError(message);
      if (message.includes("does not exist")) setOfferCreate(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(false);
  };

  return (
    <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <FolderCog className="size-5 text-slate-700" aria-hidden />
        <h1 className="text-lg font-semibold text-slate-900">Storage Configuration</h1>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Currently storing uploaded files in{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{currentPath}</code>.
        Changing this only affects newly uploaded files — existing files are not moved.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
            {offerCreate && (
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                onClick={() => submit(true)}
                isLoading={isSaving}
              >
                Create directory and save
              </Button>
            )}
          </div>
        )}
        <Input
          label="Storage Directory"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="./storage/uploads"
          disabled={isSaving}
          required
        />
        <div>
          <Button type="submit" isLoading={isSaving}>
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
