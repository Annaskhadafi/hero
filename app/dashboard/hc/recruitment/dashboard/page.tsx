import { getRecruitmentDashboardData } from "@/app/actions/recruitment";
import { RecruitmentDashboardClient } from "./client-page";

export default async function RecruitmentDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params?.year) || now.getFullYear();
  const month = params?.month && params.month !== "all" ? Number(params.month) : null;
  const data = await getRecruitmentDashboardData({ year, month });

  return <RecruitmentDashboardClient data={data} selectedYear={year} selectedMonth={month} />;
}
