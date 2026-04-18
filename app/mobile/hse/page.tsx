import { redirect } from "next/navigation";
import { AlertTriangle, MapPin, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getMobileHse } from "@/lib/mobile-data";

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default async function MobileHsePage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileHse(session.user.email);
  if (!data) return null;

  const openObservations = data.observations.filter((item) => item.status.toLowerCase() === "open").length;

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">HSE Report</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Safety Command</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">{data.context.site.name}</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
          <ShieldCheck className="size-5" />
          <p className="mt-3 text-3xl font-black">{data.observations.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Observations</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 text-[#5a2200] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <AlertTriangle className="size-5" />
          <p className="mt-3 text-3xl font-black">{openObservations}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a32]">Open Items</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Observation Feed</p>
        {data.observations.map((item) => (
          <article key={item.id} className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[#082033]">{item.title}</h2>
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#486275]">
                  <MapPin className="size-3.5" />
                  {item.location}
                </p>
              </div>
              <Badge className="border-0 bg-[#f9eee8] text-[#5a2200]">{item.severity}</Badge>
            </div>
            <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#5d7485]">{item.notes}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#5d7485]">
              {item.category} · {item.status} · {formatDate(item.observedAt)}
            </p>
          </article>
        ))}
        {data.observations.length === 0 ? (
          <div className="rounded-[1.25rem] bg-white p-5 text-center text-sm font-semibold text-[#5d7485] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada observasi HSE pada site ini.
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Incident Register</p>
        {data.incidents.map((incident) => (
          <article key={incident.id} className="rounded-[1.2rem] bg-[#e9f6fd] p-4">
            <h3 className="text-sm font-black text-[#082033]">{incident.title}</h3>
            <p className="mt-1 text-xs font-semibold text-[#486275]">
              {incident.type} · {incident.unitNumber} · {incident.status}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
