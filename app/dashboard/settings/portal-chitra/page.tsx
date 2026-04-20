import { redirect } from "next/navigation";

import { PortalChitraSettingsPanel } from "@/components/portal-chitra-settings-panel";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { getPortalChitraSettingsData } from "@/lib/portal-chitra";

export default async function PortalChitraSettingsPage() {
  const permission = await getCurrentMenuPermission("portal_chitra");

  if (!permission.canEdit) {
    redirect("/dashboard/portal-chitra");
  }

  const { apps, roles } = await getPortalChitraSettingsData();

  return (
    <div className="space-y-6">
      <div>
        <p className="industrial-label">Portal Workspace</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal">Portal Chitra Settings</h1>
        <p className="text-sm text-muted-foreground">
          Atur katalog app Portal Chitra untuk desktop dan slider mobile.
        </p>
      </div>

      <PortalChitraSettingsPanel apps={apps} roles={roles} />
    </div>
  );
}
