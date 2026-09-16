import { Files, Users, Settings, ScrollText, type LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly Role[];
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Files", icon: Files, roles: ["SUPER_ADMIN", "USER"] },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: ["SUPER_ADMIN"] },
  {
    href: "/dashboard/settings/storage",
    label: "Storage Settings",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
  },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText, roles: ["SUPER_ADMIN"] },
];
