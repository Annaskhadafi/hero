import { getMasterDataPageData } from "@/lib/master-data";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { MasterDataManagement } from "@/components/master-data-management";
import { redirect } from "next/navigation";

export default async function MasterDataPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const [data, permission] = await Promise.all([
    getMasterDataPageData(),
    getCurrentMenuPermission("master_data"),
  ]);

  if (!permission.canView) {
    redirect("/dashboard");
  }

  const tab = (await searchParams)?.tab;

  return (
    <div className="flex flex-1 flex-col bg-background">
      <MasterDataManagement
        sections={data.sections}
        jobTitles={data.jobTitles}
        departments={data.departments}
        sites={data.sites}
        positions={data.positions}
        attendanceShifts={data.attendanceShifts}
        categoryOptions={data.categoryOptions}
        orgStructures={data.orgStructures}
        approvalMatrices={data.approvalMatrices}
        employees={data.employees}
        levelStaff={data.levelStaff}
        defaultTab={tab}
        canEdit={permission.canEdit}
        canDelete={permission.canDelete}
      />
    </div>
  );
}

