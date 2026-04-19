import { redirect } from "next/navigation";
import { Banknote, Clock3, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getMobileTimesheet } from "@/lib/mobile-data";

function money(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function MobileTimesheetPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileTimesheet(session.user.email);
  if (!data) return null;

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Timesheet</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Work Hours</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">{data.context.employee.name}</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
          <Clock3 className="size-5" />
          <p className="mt-3 text-3xl font-black">{data.totals.regularHours}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Regular Hrs</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 text-[#5a2200] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <TimerReset className="size-5" />
          <p className="mt-3 text-3xl font-black">{data.totals.overtimeHours}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a32]">Overtime Hrs</p>
        </div>
      </section>

      <section className="rounded-[1.25rem] bg-[#e9f6fd] p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#003f78]">
            <Banknote className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Overtime Amount</p>
            <p className="text-xl font-black text-[#082033]">{money(data.totals.overtimeAmount)}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Timesheet Entries</p>
        {data.rows.map((row) => (
          <article key={row.id} className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#082033]">{row.periodLabel}</h2>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  Regular {row.regularHours}h · Overtime {row.overtimeHours}h
                </p>
              </div>
              <Badge className="border-0 bg-[#eaf4fb] text-[#003f78]">{row.status}</Badge>
            </div>
          </article>
        ))}
        {data.rows.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada timesheet untuk akun ini.
          </div>
        ) : null}
      </section>
    </div>
  );
}
