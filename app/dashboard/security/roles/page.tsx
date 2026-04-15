import { SecurityRoleManagement } from "@/components/security-role-management";
import { getSecurityRolesData } from "@/lib/hero-admin";

export default async function SecurityRolesPage() {
  const { roles, menuItems, menuPermissions } = await getSecurityRolesData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role & Permission</h1>
        <p className="text-sm text-muted-foreground">
          Kelola RBAC per menu: buat role baru, duplikat, hapus, dan checklist aksi tiap menu.
        </p>
      </div>

      <SecurityRoleManagement
        roles={roles}
        menuItems={menuItems}
        menuPermissions={menuPermissions}
      />
    </div>
  );
}
