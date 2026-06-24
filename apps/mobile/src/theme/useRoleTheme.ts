import { roleThemes } from "@mytution/config";
import type { Role } from "@mytution/shared";

export function useRoleTheme(role: Role) {
  return roleThemes[role];
}
