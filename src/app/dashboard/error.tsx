"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <AlertTriangle className="size-8 text-red-500" aria-hidden />
      <p className="text-sm font-medium text-slate-900">Something went wrong.</p>
      <p className="max-w-sm text-sm text-slate-500">
        An unexpected error occurred while loading this page. You can try again.
      </p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
