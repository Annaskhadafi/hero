import { redirect } from "next/navigation";
import { Activity, FileText, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getMobileHc } from "@/lib/mobile-data";
import { MCU_CATEGORY_LABELS, MCU_METRIC_CATEGORIES, MCU_METRIC_KEYS, MCU_METRIC_LABELS } from "@/lib/mcu-wellness-ai";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MobileWellnessPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileHc(session.user.email);
  if (!data) return null;

  const latest = data.wellness[0];
  const latestMcu = data.mcuHistory[0];

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

      {/* MCU Annual Section */}
      {latestMcu && (
        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">MCU Tahunan Terbaru</p>
          <article className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="size-4 text-[#003f78]" />
                  <h2 className="text-sm font-black text-[#082033]">MCU {formatDate(latestMcu.mcuDate)}</h2>
                </div>
                <p className="mt-1 text-xs font-semibold text-[#486275]">{latestMcu.clinicName || "Klinik"}</p>
              </div>
              <Badge
                className={
                  latestMcu.status === "fit"
                    ? "border-0 bg-emerald-50 text-emerald-700"
                    : latestMcu.status === "unfit"
                    ? "border-0 bg-rose-50 text-rose-700"
                    : "border-0 bg-amber-50 text-amber-700"
                }
              >
                {latestMcu.aiKategori || latestMcu.status}
              </Badge>
            </div>

            {latestMcu.aiKesimpulan && (
              <p className="mt-3 text-xs font-semibold leading-5 text-[#082033]">
                <span className="text-[#486275]">Kesimpulan: </span>
                {latestMcu.aiKesimpulan}
              </p>
            )}
            {latestMcu.aiSaran && (
              <p className="mt-2 text-xs font-semibold leading-5 text-[#486275]">
                <span className="text-[#082033]">Saran: </span>
                {latestMcu.aiSaran}
              </p>
            )}

            {/* 6 kategori metrics */}
            {latestMcu.metrics.length > 0 && (
              <div className="mt-3 space-y-2">
                {MCU_METRIC_CATEGORIES.map((cat) => {
                  const catMetrics = latestMcu.metrics.filter((m) => m.category === cat);
                  if (catMetrics.length === 0) return null;
                  return (
                    <div key={cat} className="rounded-lg bg-[#f5f7fb] p-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#486275]">
                        {MCU_CATEGORY_LABELS[cat]}
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        {MCU_METRIC_KEYS[cat].map((key) => {
                          const m = catMetrics.find((x) => x.metricKey === key);
                          if (!m || !m.metricValue) return null;
                          return (
                            <div key={key} className="flex items-baseline justify-between gap-1">
                              <span className="text-[10px] font-semibold text-[#486275]">
                                {MCU_METRIC_LABELS[key] ?? key}
                              </span>
                              <span className="text-[11px] font-black text-[#082033]">
                                {m.metricValue}{m.metricUnit ? ` ${m.metricUnit}` : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {latestMcu.resultFileUrl && (
              <a
                href={latestMcu.resultFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#eaf4fb] px-2.5 py-1.5 text-xs font-bold text-[#003f78]"
              >
                <FileText className="size-3.5" /> Lihat Dokumen MCU
              </a>
            )}

            {latestMcu.nextMcuDue && (
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
                MCU berikutnya: {formatDate(latestMcu.nextMcuDue)}
              </p>
            )}
          </article>
        </section>
      )}

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
