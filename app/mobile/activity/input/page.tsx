import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, UserRound } from "lucide-react";

import { MobileDailyActivityForm } from "@/components/mobile/mobile-daily-activity-form";
import { getActivityPagePurpose } from "@/lib/activity-navigation";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";

function dateTimeLocalValue(reference: Date) {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function MobileActivityInputPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getDailyActivityEmployeeData(session.user.email, { ensureSeed: false });
  if (!data) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }

  const now = new Date();
  const defaultDateTime = dateTimeLocalValue(now);
  const pagePurpose = getActivityPagePurpose("input");

  return (
    <div className="space-y-4 pb-6">
      {/* Back link */}
      <Link prefetch={false} href="/mobile/activity"
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
        <ArrowLeft className="size-4" /> Kembali ke aktivitas harian
      </Link>

      {/* Header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Aktivitas Harian</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900">{pagePurpose.title}</h1>
        <p className="mt-1.5 text-sm text-gray-500">{pagePurpose.description}</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <Clock3 className="size-5 text-blue-600" />
          <p className="mt-3 text-lg font-bold text-gray-900">{data.summary.shift}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Shift aktif</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <UserRound className="size-5 text-blue-600" />
          <p className="mt-3 text-lg font-bold text-gray-900">{data.employee.id}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Employee ID</p>
        </div>
      </div>

      {/* Current Context */}
      <section className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Current Context</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{data.employee.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              {data.site?.name ?? "Site"}
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {data.assignments.length} assignment
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          Save bisa gagal kalau: pilih activity library belum diisi, assignment belum dipilih saat mode `Assigned`,
          waktu selesai lebih kecil dari waktu mulai, atau waktu bentrok dengan activity lain.
        </div>
      </section>

      {/* Daily Route */}
      {data.routeChecklist ? (
        <section className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Matched Daily Route</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{data.routeChecklist.routeName}</p>
              <p className="mt-2 text-xs text-gray-500">
                {data.routeChecklist.groupCount} group &bull; {data.routeChecklist.itemCount} item &bull; {data.routeChecklist.shiftCode}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{data.routeChecklist.routeCode}</span>
              {data.routeChecklist.activeSpl ? (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{data.routeChecklist.activeSpl.splNumber}</span>
              ) : null}
              {data.routeChecklist.positionName ? (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{data.routeChecklist.positionName}</span>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* SPL Checklist */}
      {data.standaloneOvertimeChecklist ? (
        <section className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Checklist SPL Aktif</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{data.standaloneOvertimeChecklist.title}</p>
              <p className="mt-2 text-xs text-gray-500">
                {data.standaloneOvertimeChecklist.splNumber} &bull; {data.standaloneOvertimeChecklist.lineCount} line
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{data.standaloneOvertimeChecklist.progressPercent}% progress</span>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{data.standaloneOvertimeChecklist.plannedPointsTotal} pts</span>
            </div>
          </div>
        </section>
      ) : null}

      <MobileDailyActivityForm
        employeeId={data.employee.id}
        assignments={data.assignments}
        availableLibrary={data.availableLibrary}
        defaultStartTime={defaultDateTime}
        defaultEndTime={defaultDateTime}
        routeChecklist={data.routeChecklist}
        standaloneOvertimeChecklist={data.standaloneOvertimeChecklist}
        site={data.site}
      />
    </div>
  );
}
