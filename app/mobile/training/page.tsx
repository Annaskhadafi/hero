import { redirect } from "next/navigation";
import { Award, BookOpenCheck, CalendarClock, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getMobileHc } from "@/lib/mobile-data";

function daysUntil(value: Date) {
  return Math.ceil((value.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MobileTrainingPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileHc(session.user.email);
  if (!data) return null;

  const expiringSoon = data.trainings.filter((item) => item.expiresAt && daysUntil(item.expiresAt) <= 30).length;
  const coveredYears = new Set(data.trainings.map((item) => item.completedYear)).size;
  const groupedTrainings = data.trainings.reduce<Map<number, typeof data.trainings>>((map, item) => {
    const current = map.get(item.completedYear) ?? [];
    current.push(item);
    map.set(item.completedYear, current);
    return map;
  }, new Map());

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">HC Suite</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Training History</h1>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
          <BookOpenCheck className="size-5" />
          <p className="mt-3 text-3xl font-black">{data.trainings.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Records</p>
        </div>
        <div className="rounded-[1.2rem] bg-[#dff2ff] p-4 text-[#003461] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <Award className="size-5" />
          <p className="mt-3 text-3xl font-black">{coveredYears}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Years</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 text-[#5a2200] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <ShieldAlert className="size-5" />
          <p className="mt-3 text-3xl font-black">{expiringSoon}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a32]">Due Soon</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Passport Timeline</p>
        {Array.from(groupedTrainings.entries()).map(([year, items]) => (
          <article key={year} className="rounded-[1.35rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#486275]">Tahun selesai</p>
                <h2 className="mt-1 text-2xl font-black text-[#082033]">{year}</h2>
              </div>
              <Badge className="border-0 bg-[#eaf4fb] text-[#003f78]">{items.length} records</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {items.map((item) => {
                const expiryDays = item.expiresAt ? daysUntil(item.expiresAt) : null;

                return (
                  <div
                    key={item.id}
                    className="rounded-[1rem] bg-[#f3faff] p-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-[#082033]">{item.trainingName}</h3>
                        <p className="mt-1 text-xs font-semibold text-[#486275]">{item.provider}</p>
                      </div>
                      <Badge className="border-0 bg-white text-[#003f78]">{item.status}</Badge>
                    </div>

                    <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[#486275]">
                      <CalendarClock className="size-4" />
                      {item.expiresAt
                        ? `Expiry ${formatDate(item.expiresAt)} · ${expiryDays != null && expiryDays >= 0 ? `${expiryDays} hari lagi` : `${Math.abs(expiryDays ?? 0)} hari lewat`}`
                        : "Tanpa masa berlaku / history only"}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
        {data.trainings.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada data training untuk akun ini.
          </div>
        ) : null}
      </section>
    </div>
  );
}
