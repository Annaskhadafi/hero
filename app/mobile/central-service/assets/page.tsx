import { Suspense } from "react";
import { getAssets, getMasterSectionOptions } from "@/app/dashboard/central-service/assets/actions";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { redirect } from "next/navigation";
import { MobileAssetsClientPage } from "./client-page";

export const revalidate = 0;

export const metadata = {
  title: "CS Asset Management | HERO Mobile",
  description: "Mobile Asset Management Tools & Equipment Central Service",
};

export default async function MobileCentralServiceAssetsPage() {
  const access = await getCurrentMenuPermission("central-service-assets");

  if (!access.canView) {
    redirect("/dashboard");
  }

  let assets: any[] = [];
  let masterSections: any[] = [];

  try {
    const [assetsResult, masterSectionsData] = await Promise.all([
      getAssets().catch((err) => {
        console.error("[MobileCentralServiceAssetsPage] getAssets error:", err);
        return { success: false, data: [] };
      }),
      getMasterSectionOptions().catch((err) => {
        console.error("[MobileCentralServiceAssetsPage] getMasterSectionOptions error:", err);
        return [];
      }),
    ]);

    if (assetsResult && assetsResult.success && Array.isArray(assetsResult.data)) {
      assets = assetsResult.data;
    }
    masterSections = masterSectionsData || [];
  } catch (err) {
    console.error("[MobileCentralServiceAssetsPage] Data fetch error:", err);
  }

  return (
    <Suspense
      fallback={
        <div className="p-6 text-slate-400 text-center text-sm font-semibold">
          Memuat Asset Management...
        </div>
      }
    >
      <MobileAssetsClientPage
        initialAssets={assets}
        masterSections={masterSections}
        permissions={{
          canView: access.canView,
          canCreate: (access as any).canCreate ?? access.canEdit,
          canEdit: access.canEdit,
          canDelete: access.canDelete,
        }}
      />
    </Suspense>
  );
}
