import { redirect } from "next/navigation";
import { Activity, AlertTriangle, BarChart3, UsersRound } from "lucide-react";

import { getServerSession } from "@/lib/auth-session";
import { getMobileExecutive } from "@/lib/mobile-data";

export default async function MobileExecutivePage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/sign-in");

  const data = await getMobileExecutive();

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Executive</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Mobile Control Tower</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">
          {data.overview.site?.name ?? "All Sites"} · {data.overview.site?.customerName ?? "Operations"}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {data.overview.metrics.slice(0, 4).map((metric, index) => {
          const icons = [Activity, AlertTriangle, BarChart3, UsersRound];
          const Icon = icons[index] ?? Activity;
          const dark = index === 0;

          return (
            <article
              key={metric.label}
              className={dark ? "rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]" : "rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"}
            >
              <Icon className="size-5" />
              <p className="mt-3 text-2xl font-black">{metric.value}</p>
              <p className={dark ? "text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]" : "text-[10px] font-black uppercase tracking-[0.16em] text-[#5d7485]"}>
                {metric.label}
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-[1.35rem] bg-white p-5 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#486275]">Top Performer</p>
        <h2 className="mt-2 text-2xl font-black text-[#003461]">
          {data.highlights.topPerformer?.name ?? "Belum ada data"}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#486275]">
          {data.highlights.topPerformer
            ? `${data.highlights.topPerformer.role} · ${data.highlights.topPerformer.totalPoints} pts`
            : "Data performer akan muncul setelah employee memiliki point."}
        </p>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Activity Status</p>
        {data.activityTrend.map((item) => (
          <article key={item.status} className="flex items-center justify-between rounded-[1.2rem] bg-[#e9f6fd] p-4">
            <span className="text-sm font-black text-[#082033]">{item.status}</span>
            <span className="text-lg font-black text-[#003f78]">{item.count}</span>
          </article>
        ))}
      </section>
    </div>
  );
}
