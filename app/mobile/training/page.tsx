import { redirect } from "next/navigation";
import { BookOpenCheck, CalendarClock, ShieldAlert } from "lucide-react";

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

  const expiringSoon = data.trainings.filter((item) => daysUntil(item.expiresAt) <= 30).length;

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">HC Suite</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Training Passport</h1>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
          <BookOpenCheck className="size-5" />
          <p className="mt-3 text-3xl font-black">{data.trainings.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Records</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 text-[#5a2200] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <ShieldAlert className="size-5" />
          <p className="mt-3 text-3xl font-black">{expiringSoon}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a32]">Due Soon</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Certification List</p>
        {data.trainings.map((item) => (
          <article key={item.id} className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#082033]">{item.trainingName}</h2>
                <p className="mt-1 text-xs font-semibold text-[#486275]">{item.provider}</p>
              </div>
              <Badge className="border-0 bg-[#eaf4fb] text-[#003f78]">{item.status}</Badge>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[#5d7485]">
              <CalendarClock className="size-4" />
              Expired {formatDate(item.expiresAt)} · {daysUntil(item.expiresAt)} days
            </p>
          </article>
        ))}
        {data.trainings.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#5d7485] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada data training untuk akun ini.
          </div>
        ) : null}
      </section>
    </div>
  );
}
