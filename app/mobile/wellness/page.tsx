import { redirect } from "next/navigation";
import { Activity, HeartPulse, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getMobileHc } from "@/lib/mobile-data";

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default async function MobileWellnessPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileHc(session.user.email);
  if (!data) return null;

  const latest = data.wellness[0];

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Wellness</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Health Tracking</h1>
      </section>

      <section className="rounded-[1.35rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b9dff6]">Fit Status</p>
            <p className="mt-2 text-4xl font-black leading-none">{data.context.employee.fitStatus.toUpperCase()}</p>
          </div>
          <HeartPulse className="size-9 text-[#f4a78d]" />
        </div>
        <p className="mt-5 text-sm font-semibold text-[#d9effc]">
          Latest metric: {latest ? `${latest.metricType} · ${latest.metricValue}` : "Belum ada record"}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <Activity className="size-5 text-[#003f78]" />
          <p className="mt-3 text-3xl font-black text-[#082033]">{data.reliability}%</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Reliability</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <ShieldCheck className="size-5 text-[#5a2200]" />
          <p className="mt-3 text-3xl font-black text-[#082033]">{data.wellness.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Checks</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Wellness Log</p>
        {data.wellness.map((item) => (
          <article key={item.id} className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#082033]">{item.metricType}</h2>
                <p className="mt-1 text-xs font-semibold text-[#486275]">{item.metricValue}</p>
              </div>
              <Badge className="border-0 bg-[#eaf4fb] text-[#003f78]">{item.status}</Badge>
            </div>
            <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">{item.notes}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
              {formatDate(item.recordedAt)}
            </p>
          </article>
        ))}
        {data.wellness.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada data wellness untuk akun ini.
          </div>
        ) : null}
      </section>
    </div>
  );
}
