"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ClientUser, Role } from "@/types";

export interface UserFormValues {
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
}

interface UserFormModalProps {
  mode: "create" | "edit";
  user?: ClientUser;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (values: UserFormValues) => void;
  onClose: () => void;
}

export function UserFormModal({
  mode,
  user,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: UserFormModalProps) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(user?.role ?? "USER");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ email, password, role, isActive });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 id="user-form-title" className="text-base font-semibold text-slate-900">
          {mode === "create" ? "Create User" : `Edit ${user?.email}`}
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          {error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label={mode === "create" ? "Password" : "New Password (optional)"}
            type="password"
            placeholder={mode === "edit" ? "Leave blank to keep current password" : undefined}
            required={mode === "create"}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={isSubmitting}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              <option value="USER">User</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
              className="size-4 rounded border-slate-300"
            />
            Active
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {mode === "create" ? "Create" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
