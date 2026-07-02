import { getAssets, getMasterSectionOptions } from "./actions";
import { AssetsTable } from "./components/assets-table";

export const metadata = {
  title: "Asset Management - Central Service | HERO",
  description: "Manajemen aset tools dan peralatan Central Service",
};

export default async function CentralServiceAssetsPage() {
  const [assetsResult, masterSections] = await Promise.all([
    getAssets(),
    getMasterSectionOptions(),
  ]);

  const assets = assetsResult.success && assetsResult.data ? assetsResult.data : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Asset Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manajemen inventaris tools dan peralatan Central Service
          </p>
        </div>
        <AssetsTable data={assets} masterSections={masterSections} />
      </div>
    </div>
  );
}
