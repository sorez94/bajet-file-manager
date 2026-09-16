import { requireSuperAdmin } from "@/lib/auth/guards";
import { listUsers } from "@/server/services/userService";
import { UsersManager } from "@/components/users/UsersManager";

export default async function UsersPage() {
  const currentUser = await requireSuperAdmin();
  const users = await listUsers();

  return <UsersManager initialUsers={users} currentUserId={currentUser.id} />;
}
