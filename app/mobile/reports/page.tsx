import { redirect } from "next/navigation";
import { FileCheck2, HardHat, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getMobileReports } from "@/lib/mobile-data";

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MobileReportsPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileReports(session.user.email);
  if (!data) return null;

  const latest = data.reports[0];
  const readiness = latest ? Math.round((latest.readySections / Math.max(1, latest.totalSections)) * 100) : 0;

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Daily Report</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Site Summary</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">{data.context.site.customerName}</p>
      </section>

      <section className="rounded-[1.35rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b9dff6]">Latest Readiness</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-5xl font-black leading-none">{readiness}%</p>
          <Badge className="border-0 bg-white/14 text-white">{latest?.status ?? "No Report"}</Badge>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#0a5798]">
          <div className="h-full rounded-full bg-[#f4a78d]" style={{ width: `${readiness}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <HardHat className="size-5 text-[#003f78]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{latest?.jobsCompleted ?? 0}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5d7485]">Jobs Done</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <UsersRound className="size-5 text-[#5a2200]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{latest?.manpowerPresent ?? 0}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5d7485]">Manpower</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Report History</p>
        {data.reports.map((report) => (
          <article key={report.id} className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#082033]">{formatDate(report.reportDate)}</h2>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {report.readySections}/{report.totalSections} sections · {report.jobsCompleted} jobs
                </p>
              </div>
              <FileCheck2 className="size-5 text-[#003f78]" />
            </div>
            <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#5d7485]">{report.hseSummary}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
