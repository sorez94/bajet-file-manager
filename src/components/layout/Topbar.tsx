"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { navItems } from "@/lib/navItems";
import { apiRequest } from "@/lib/api/client";
import type { CurrentUser } from "@/types";

export function Topbar({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();

  const handleLogout = () => {
    startLogout(async () => {
      await apiRequest("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <button
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <div className="hidden text-sm text-slate-500 sm:block">
          Signed in as <span className="font-medium text-slate-900">{user.email}</span>
        </div>

        <div className="flex items-center gap-3">
          <Badge tone={user.role === "SUPER_ADMIN" ? "accent" : "neutral"}>
            {user.role === "SUPER_ADMIN" ? "Super Admin" : "User"}
          </Badge>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden />
            Logout
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-slate-200 p-3 sm:hidden">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
        </nav>
      )}
    </header>
  );
}
