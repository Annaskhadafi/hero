import { and, eq, or } from "drizzle-orm";

import { db } from "@/db";
import { user as authUser } from "@/db/schema/auth";
import { employees, navbarMenuItems, roleMenuPermissions, securityRoles } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";

export type HeroMenuPermission = {
  roleName: string | null;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSelectAll: boolean;
};

export async function getEmployeeAccessRoleByEmail(email: string) {
  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .where(or(eq(employees.email, email), eq(authUser.email, email)))
    .limit(1);

  return employee?.accessRole ?? null;
}

export async function getCurrentEmployeeAccessRole() {
  const session = await getServerSession();

  if (!session?.user?.id && !session?.user?.email) {
    return null;
  }

  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(
      or(
        session.user.id ? eq(employees.authUserId, session.user.id) : undefined,
        session.user.email ? eq(employees.email, session.user.email) : undefined,
      ),
    )
    .limit(1);

  return employee?.accessRole ?? null;
}

export async function getMenuPermissionForRole(roleName: string | null, resource: string): Promise<HeroMenuPermission> {
  if (!roleName) {
    return {
      roleName: null,
      canView: false,
      canEdit: false,
      canDelete: false,
      canSelectAll: false,
    };
  }

  const [permission] = await db
    .select({
      canView: roleMenuPermissions.canView,
      canEdit: roleMenuPermissions.canEdit,
      canDelete: roleMenuPermissions.canDelete,
      canSelectAll: roleMenuPermissions.canSelectAll,
    })
    .from(roleMenuPermissions)
    .innerJoin(securityRoles, eq(roleMenuPermissions.roleId, securityRoles.id))
    .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
    .where(and(eq(securityRoles.name, roleName), eq(navbarMenuItems.resource, resource)))
    .limit(1);

  return {
    roleName,
    canView: permission?.canView ?? false,
    canEdit: permission?.canEdit ?? false,
    canDelete: permission?.canDelete ?? false,
    canSelectAll: permission?.canSelectAll ?? false,
  };
}

export async function getCurrentMenuPermission(resource: string) {
  const roleName = await getCurrentEmployeeAccessRole();
  return getMenuPermissionForRole(roleName, resource);
}
