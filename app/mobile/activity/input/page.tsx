import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, MapPinned, UserRound } from "lucide-react";

import { submitDailyActivityWithStateAction } from "@/app/dashboard/activity-hub/actions";
import { DailyActivitySubmitForm } from "@/components/daily-activity-submit-form";
import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";

function dateTimeLocalValue(reference: Date) {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function MobileActivityInputPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityEmployeeData(session.user.email);
  if (!data) {
    return null;
  }

  const now = new Date();
  const defaultStart = new Date(now.getTime() - 60 * 60 * 1000);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <Link
          href="/mobile/activity"
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#486275]"
        >
          <ArrowLeft className="size-4" />
          Back to activity list
        </Link>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Recording Activity</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Add Activity</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">
            Submit work log langsung ke Daily Activity System. Data masuk ke workflow approval, points, dan log
            produktivitas.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-[#e9f6fd] p-4 shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
          <Clock3 className="size-5 text-[#003f78]" />
          <p className="mt-3 text-lg font-black text-[#082033]">{data.summary.shift}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5d7485]">Shift aktif</p>
        </div>
        <div className="rounded-[1.2rem] bg-[#e9f6fd] p-4 shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
          <UserRound className="size-5 text-[#003f78]" />
          <p className="mt-3 text-lg font-black text-[#082033]">{data.employee.id}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5d7485]">Employee ID</p>
        </div>
      </section>

      <section className="rounded-[1.3rem] bg-white p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Current Context</p>
            <p className="mt-1 text-base font-black text-[#082033]">{data.employee.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-0 bg-[#eaf4fb] text-[9px] font-black uppercase tracking-[0.14em] text-[#003f78]">
              {data.site?.name ?? "Site"}
            </Badge>
            <Badge className="border-0 bg-[#fff1cf] text-[9px] font-black uppercase tracking-[0.14em] text-[#8a5a00]">
              {data.assignments.length} assignment
            </Badge>
          </div>
        </div>

        <div className="mt-4 rounded-[1rem] bg-[#f6fbff] px-4 py-3 text-xs font-semibold leading-5 text-[#486275]">
          <div className="flex items-center gap-2">
            <MapPinned className="size-3.5 text-[#003f78]" />
            GPS validasi masih default `false`. Kalau nanti ada capture koordinat, workflow approval akan langsung ikut pakai.
          </div>
        </div>

        <div className="mt-3 rounded-[1rem] bg-[#fff8e8] px-4 py-3 text-xs font-semibold leading-5 text-[#8a5a00] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)]">
          Save bisa gagal kalau:
          pilih activity library belum diisi, assignment belum dipilih saat mode `Assigned`, waktu selesai lebih kecil dari waktu mulai,
          atau waktu bentrok dengan activity lain.
        </div>
      </section>

      <DailyActivitySubmitForm
        action={submitDailyActivityWithStateAction}
        employeeId={data.employee.id}
        assignments={data.assignments}
        availableLibrary={data.availableLibrary}
        defaultStartTime={dateTimeLocalValue(defaultStart)}
        defaultEndTime={dateTimeLocalValue(now)}
        defaultSourceMode="self_input"
        variant="mobile"
      />
    </div>
  );
}
