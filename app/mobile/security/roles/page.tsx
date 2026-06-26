import { MobileSecurityRoleManagementClient } from "@/components/mobile-security-role-management-client";
import { getSecurityRolesData } from "@/lib/hero-admin";

export default async function MobileSecurityRolesPage() {
  try {
    const data = await getSecurityRolesData();

    if (!data.roles || data.roles.length === 0) {
      return (
        <div className="min-h-screen bg-surface">
          <div className="sticky top-0 z-40 border-b border-outline-ghost bg-surface-container-lowest px-4 py-3">
            <h1 className="text-lg font-bold tracking-tight">Kelola Role</h1>
            <p className="text-xs text-muted-foreground">Atur akses menu per role</p>
          </div>
          <div className="p-4">
            <div className="rounded-lg bg-amber-50 p-4 text-amber-700">
              <p className="font-semibold">Belum ada role</p>
              <p className="text-sm">Buat role terlebih dahulu di dashboard desktop</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-surface pb-20">
        <div className="sticky top-0 z-40 border-b border-outline-ghost bg-surface-container-lowest px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">Kelola Role</h1>
          <p className="text-xs text-muted-foreground">Atur akses menu per role</p>
        </div>

        <MobileSecurityRoleManagementClient
          roles={data.roles}
          menuItems={data.menuItems}
          menuPermissions={data.menuPermissions}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading mobile roles:", error);
    return (
      <div className="min-h-screen bg-surface">
        <div className="sticky top-0 z-40 border-b border-outline-ghost bg-surface-container-lowest px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">Kelola Role</h1>
          <p className="text-xs text-muted-foreground">Atur akses menu per role</p>
        </div>
        <div className="p-4">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Error loading data</p>
            <p className="text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
          </div>
        </div>
      </div>
    );
  }
}
