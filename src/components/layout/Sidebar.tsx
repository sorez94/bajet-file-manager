"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban } from "lucide-react";
import type { Role } from "@/types";
import { navItems } from "@/lib/navItems";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <FolderKanban className="size-5 text-slate-900" />
        <span className="text-sm font-semibold text-slate-900">File Manager</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
