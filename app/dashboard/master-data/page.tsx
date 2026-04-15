import { getMasterDataPageData } from "@/lib/master-data";
import { MasterDataManagement } from "@/components/master-data-management";

export default async function MasterDataPage() {
  const data = await getMasterDataPageData();

  return (
    <div className="flex flex-1 flex-col bg-[#F5F7F9]">
      <MasterDataManagement
        sections={data.sections}
        departments={data.departments}
        positions={data.positions}
        orgStructures={data.orgStructures}
      />
    </div>
  );
}
