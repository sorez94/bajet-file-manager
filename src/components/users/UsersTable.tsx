"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/format";
import type { ClientUser } from "@/types";

interface UsersTableProps {
  users: ClientUser[];
  currentUserId: string;
  onEdit: (user: ClientUser) => void;
  onDelete: (user: ClientUser) => void;
}

export function UsersTable({ users, currentUserId, onEdit, onDelete }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {user.email}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={user.role === "SUPER_ADMIN" ? "accent" : "neutral"}>
                    {user.role === "SUPER_ADMIN" ? "Super Admin" : "User"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={user.isActive ? "success" : "warning"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(user)}
                      className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                      aria-label={`Edit ${user.email}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => onDelete(user)}
                      disabled={user.id === currentUserId}
                      className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
                      aria-label={`Delete ${user.email}`}
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
