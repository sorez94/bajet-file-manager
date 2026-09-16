import { requireSuperAdmin } from "@/lib/auth/guards";
import { getStorageSettings } from "@/server/services/settingsService";
import { StorageSettingsForm } from "@/components/settings/StorageSettingsForm";

export default async function StorageSettingsPage() {
  await requireSuperAdmin();
  const { driver, path } = await getStorageSettings();

  return <StorageSettingsForm driver={driver} initialPath={path} />;
}
