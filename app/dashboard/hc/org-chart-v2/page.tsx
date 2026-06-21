import { getOrgChartV2Data, getOrgChartV2Stats, getOrgChartV2ReferenceData, getOrgChartV2AllEmployees } from "@/app/actions/org-chart-v2";
import { OrgChartV2ClientPage } from "./client-page";

export const metadata = {
  title: "Org Structure V2 - HC",
};

export default async function OrgChartV2Page() {
  const [nodes, stats, referenceData, allEmployees] = await Promise.all([
    getOrgChartV2Data(),
    getOrgChartV2Stats(),
    getOrgChartV2ReferenceData(),
    getOrgChartV2AllEmployees(),
  ]);
  return <OrgChartV2ClientPage nodes={nodes} stats={stats} referenceData={referenceData} allEmployees={allEmployees} />;
}
