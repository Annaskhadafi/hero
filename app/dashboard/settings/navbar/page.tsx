import { NavbarSettingsPanel } from "@/components/navbar-settings-panel";
import { getNavbarSettingsData } from "@/lib/hero-admin";

export default async function NavbarSettingsPage() {
  const { theme, menuItems } = await getNavbarSettingsData();

  return (
    <div className="space-y-6">
      <div>
        <p className="industrial-label">Navigasi Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal">Pengaturan Navigasi</h1>
        <p className="text-sm text-muted-foreground">
          Atur warna header dan daftar menu admin HERO.
        </p>
      </div>

      <NavbarSettingsPanel theme={theme} menuItems={menuItems} />
    </div>
  );
}
