import { redirect } from "next/navigation";
import { MobileReportsOverview } from "@/components/mobile/mobile-reports-overview";
import { getServerSession } from "@/lib/auth-session";
import { getMobileReports } from "@/lib/mobile-data";

export default async function MobileReportsPage() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getMobileReports(session.user.email);
  if (!data) {
    return null;
  }

  return (
    <MobileReportsOverview
      initialData={{
        ...data,
        reports: data.reports.map((report) => ({
          ...report,
          reportDate: report.reportDate.toISOString(),
        })),
      }}
    />
  );
}
