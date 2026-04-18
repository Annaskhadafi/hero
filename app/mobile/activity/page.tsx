import { redirect } from "next/navigation";
import Link from "next/link";
import { Camera, CheckCircle2, ClipboardList, Clock3, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";

function formatTime(value?: Date | null) {
  if (!value) return "--:--";

  return value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function MobileActivityPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getDailyActivityEmployeeData(session.user.email);

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Field Action</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Daily Activity</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">
          Assignment dan aktivitas harian dibuat ringkas untuk input lapangan via HP.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/mobile/activity/input" className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-[1.2rem] bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)] active:scale-[0.98]">
          <ClipboardList className="size-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.14em]">Check-In Work</span>
        </Link>
        <Link href="/mobile/hse" className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-[1.2rem] bg-white text-[#5a2200] shadow-[0_14px_30px_rgba(8,32,51,0.08)] ring-1 ring-[#ead8ce] active:scale-[0.98]">
          <ShieldCheck className="size-5" />
          <span className="text-[10px] font-black uppercase tracking-[0.14em]">HSE Report</span>
        </Link>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Assignment Queue</p>
        {data.assignments.length > 0 ? (
          data.assignments.map((assignment) => (
            <article
              key={assignment.id}
              className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black leading-tight text-[#082033]">
                    {assignment.customJobName || assignment.activityName || "Assignment Lapangan"}
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-[#486275]">
                    {assignment.assignedByName} · {assignment.durationLabel}
                  </p>
                </div>
                <Badge className="border-0 bg-[#eaf4fb] text-[9px] font-black uppercase tracking-[0.14em] text-[#003f78]">
                  {assignment.statusLabel}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#d8e8f3] pt-3 text-xs font-bold text-[#486275]">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  ETA {formatTime(assignment.deadline)}
                </span>
                <span>{assignment.priority}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.25rem] bg-white p-5 text-center text-sm font-semibold text-[#5d7485] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada assignment hari ini.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Activity Log</p>
        {data.activities.slice(0, 4).map((activity) => (
          <article key={activity.id} className="rounded-[1.25rem] bg-[#e9f6fd] p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#003f78]">
                {activity.photoCount > 0 ? <Camera className="size-4" /> : <CheckCircle2 className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black text-[#082033]">{activity.title}</h3>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {activity.statusLabel} · {activity.pointsNet} pts
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
