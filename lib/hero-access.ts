import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
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
  const normalizedEmail = email.trim().toLowerCase();
  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
    .limit(1);

  return employee?.accessRole ?? null;
}

export async function getCurrentEmployeeAccessRole() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return null;
  }

  if (session.user.id) {
    const [employee] = await db
      .select({ accessRole: employees.accessRole })
      .from(employees)
      .where(eq(employees.authUserId, session.user.id))
      .limit(1);

    if (employee?.accessRole) {
      return employee.accessRole;
    }
  }

  return getEmployeeAccessRoleByEmail(session.user.email);
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
