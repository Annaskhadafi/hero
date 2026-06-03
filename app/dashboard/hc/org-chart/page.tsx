import { getOrgChartData, getOrgChartStats } from "@/app/actions/org-chart";
import { OrgChartClientPage } from "./client-page";

export const metadata = {
  title: "Org Chart - HC",
};

export default async function OrgChartPage() {
  const [nodes, stats] = await Promise.all([getOrgChartData(), getOrgChartStats()]);
  return <OrgChartClientPage nodes={nodes} stats={stats} />;
}
