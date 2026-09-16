"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { UsersTable } from "./UsersTable";
import { UserFormModal, type UserFormValues } from "./UserFormModal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { ClientUser } from "@/types";

export function UsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: ClientUser[];
  currentUserId: string;
}) {
  const { show } = useToast();
  const [users, setUsers] = useState<ClientUser[]>(initialUsers);
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; user: ClientUser } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeModal = () => {
    setModal(null);
    setFormError(null);
  };

  const handleSubmit = async (values: UserFormValues) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (modal?.mode === "create") {
        const data = await apiRequest<{ user: ClientUser }>("/api/users", {
          method: "POST",
          body: JSON.stringify(values),
        });
        setUsers((prev) => [...prev, data.user]);
        show("success", `User "${data.user.email}" created.`);
      } else if (modal?.mode === "edit") {
        const payload: Partial<UserFormValues> = {
          email: values.email,
          role: values.role,
          isActive: values.isActive,
        };
        if (values.password) payload.password = values.password;

        const data = await apiRequest<{ user: ClientUser }>(
          `/api/users/${modal.user.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
        show("success", `User "${data.user.email}" updated.`);
      }
      closeModal();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      show("success", `User "${deleteTarget.email}" deleted.`);
    } catch (err) {
      show("error", err instanceof ApiError ? err.message : "Failed to delete user.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">{users.length} user(s)</p>
        </div>
        <Button onClick={() => setModal({ mode: "create" })}>
          <UserPlus className="size-4" aria-hidden />
          Create User
        </Button>
      </div>

      <UsersTable
        users={users}
        currentUserId={currentUserId}
        onEdit={(user) => setModal({ mode: "edit", user })}
        onDelete={setDeleteTarget}
      />

      {modal && (
        <UserFormModal
          mode={modal.mode}
          user={modal.mode === "edit" ? modal.user : undefined}
          isSubmitting={isSubmitting}
          error={formError}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user"
        description={`Are you sure you want to delete "${deleteTarget?.email}"? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
