import { headers } from "next/headers";

export type HcAction = "canView" | "canEdit" | "canDelete" | "canSelectAll";
export type HcAccess = Record<HcAction, boolean>;

export const HC_FULL_ACCESS: HcAccess = {
  canView: true,
  canEdit: true,
  canDelete: true,
  canSelectAll: true,
};

export const HC_VIEW_ONLY_ACCESS: HcAccess = {
  canView: true,
  canEdit: false,
  canDelete: false,
  canSelectAll: false,
};

/**
 * Central guard point for HC server actions.
 *
 * Current HERO pages historically relied on sidebar RBAC only. This helper is
 * intentionally conservative but non-breaking: it provides a single call-site
 * that all new HC modules can use now, and can later be wired to Better Auth +
 * roleMenuPermissions without touching every action again.
 */
export async function getHcAccess(_resource: string): Promise<HcAccess> {
  // Touch headers so this remains a request-scoped server utility when called
  // from Server Components or Server Actions.
  await headers();
  return HC_FULL_ACCESS;
}

export async function requireHcPermission(resource: string, action: HcAction) {
  const access = await getHcAccess(resource);
  if (!access[action]) {
    throw new Error(`Tidak memiliki izin ${action} untuk resource ${resource}.`);
  }
  return access;
}
