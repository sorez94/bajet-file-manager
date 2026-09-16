import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-slate-400">
      <Loader2 className="size-6 animate-spin" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
