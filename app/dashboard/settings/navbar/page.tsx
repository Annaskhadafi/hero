import { NavbarSettingsPanel } from "@/components/navbar-settings-panel";
import { getNavbarSettingsData } from "@/lib/hero-admin";

export default async function NavbarSettingsPage() {
  const { theme, menuItems } = await getNavbarSettingsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Navbar Setting</h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi visual dan struktur menu sidebar admin HERO.
        </p>
      </div>

      <NavbarSettingsPanel theme={theme} menuItems={menuItems} />
    </div>
  );
}
