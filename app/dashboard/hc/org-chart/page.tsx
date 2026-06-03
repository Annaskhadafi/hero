import { getOrgChartData, getOrgChartStats, getOrgNodeReferenceData } from "@/app/actions/org-chart";
import { OrgChartClientPage } from "./client-page";

export const metadata = {
  title: "Org Chart - HC",
};

export default async function OrgChartPage() {
  const [nodes, stats, referenceData] = await Promise.all([getOrgChartData(), getOrgChartStats(), getOrgNodeReferenceData()]);
  return <OrgChartClientPage nodes={nodes} stats={stats} referenceData={referenceData} />;
}

