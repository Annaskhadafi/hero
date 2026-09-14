import { redirect } from "next/navigation";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { fetchApdMonthlyReport } from "@/lib/apd-reports-data";
import { ApdMonthlyReportView } from "@/components/apd-monthly-report-view";

export default async function MaterialToolsMonthlyReportPage(props: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    siteId?: string;
  }>;
}) {
  const apdAccess = await getCurrentMenuPermission("apd-request");
  const inventoryAccess = await getCurrentMenuPermission("hse_inventaris");

  if (!apdAccess.canView && !inventoryAccess.canView) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const now = new Date();
  const currentYear = searchParams.year ? Number(searchParams.year) : now.getFullYear();
  const currentMonth = searchParams.month ? Number(searchParams.month) : now.getMonth() + 1;
  const currentSiteId = searchParams.siteId ? Number(searchParams.siteId) : undefined;

  const data = await fetchApdMonthlyReport({
    category: "MATERIAL_TOOLS",
    year: currentYear,
    month: currentMonth > 0 ? currentMonth : undefined,
    siteId: currentSiteId,
  });

  return (
    <ApdMonthlyReportView
      category="MATERIAL_TOOLS"
      data={data}
      currentYear={currentYear}
      currentMonth={currentMonth}
      currentSiteId={currentSiteId}
    />
  );
}
