import { getMasterDataPageData } from "@/lib/master-data";
import { MasterDataManagement } from "@/components/master-data-management";

export default async function MasterDataPage() {
  const data = await getMasterDataPageData();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <MasterDataManagement
        sections={data.sections}
        departments={data.departments}
        sites={data.sites}
        positions={data.positions}
        attendanceShifts={data.attendanceShifts}
        orgStructures={data.orgStructures}
        approvalMatrices={data.approvalMatrices}
        employees={data.employees}
      />
    </div>
  );
}
