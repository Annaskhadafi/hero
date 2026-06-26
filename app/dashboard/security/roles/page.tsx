import { SecurityRoleManagementClient } from "@/components/security-role-management-client";
import { getSecurityRolesData } from "@/lib/hero-admin";

export default async function SecurityRolesPage() {
  const { roles, menuItems, menuPermissions, users } = await getSecurityRolesData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role & Permission</h1>
        <p className="text-sm text-muted-foreground">
          Kelola RBAC per menu: buat role baru, duplikat, hapus, dan checklist aksi tiap menu.
        </p>
      </div>

      <SecurityRoleManagementClient
        roles={roles}
        menuItems={menuItems}
        menuPermissions={menuPermissions}
        users={users}
      />
    </div>
  );
}
