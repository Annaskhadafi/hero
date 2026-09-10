import { GroupLabelStyleManager } from "@/components/group-label-style-manager";
import { NavbarMenuManager } from "@/components/navbar-menu-manager";
import { NavbarSettingsPanel } from "@/components/navbar-settings-panel";
import { getGroupLabelStyles, getNavbarSettingsData } from "@/lib/hero-admin";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { redirect } from "next/navigation";

export default async function NavbarSettingsPage() {
  const permission = await getCurrentMenuPermission("settings_navbar");
  if (!permission.canView) redirect("/dashboard");
  const { theme, menuItems } = await getNavbarSettingsData();
  const groupLabelColor = await getGroupLabelStyles();

  return (
    <div className="space-y-6">
      <div>
        <p className="industrial-label">Navigasi Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal">Pengaturan Navigasi</h1>
        <p className="text-sm text-muted-foreground">
          Atur warna header, grup section, dan daftar menu admin HERO. Drag & drop untuk mengurutkan.
        </p>
      </div>

      <NavbarSettingsPanel theme={theme as any} menuItems={menuItems} />

      <GroupLabelStyleManager color={groupLabelColor} />

      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Menu Manager</h2>
          <p className="text-sm text-muted-foreground">
            Kelola menu sidebar: tambah, edit, hapus, ubah urutan, dan atur visibilitas.
          </p>
        </div>
        <NavbarMenuManager menuItems={menuItems} />
      </div>
    </div>
  );
}
