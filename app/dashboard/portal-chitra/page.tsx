import { redirect } from "next/navigation";

import { AdminPageShell } from "@/components/admin-page-shell";
import { PortalChitraDashboard } from "@/components/portal-chitra-dashboard";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { getVisiblePortalChitraAppsForCurrentUser } from "@/lib/portal-chitra";

export default async function PortalChitraPage() {
  const permission = await getCurrentMenuPermission("portal_chitra");

  if (!permission.canView) {
    redirect("/dashboard");
  }

  const apps = await getVisiblePortalChitraAppsForCurrentUser();

  return (
    <AdminPageShell
      eyebrow="M9 • Business Apps"
      title="Portal Chitra"
      description="Portal lintas sistem untuk membuka aplikasi bisnis Chitra sesuai role user yang sedang login."
      badge={`${apps.length} visible`}
    >
      <PortalChitraDashboard apps={apps} />
    </AdminPageShell>
  );
}
