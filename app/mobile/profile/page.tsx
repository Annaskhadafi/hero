import { redirect } from "next/navigation";
import { BriefcaseBusiness, MapPin, ShieldCheck, Trophy, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";

export default async function MobileProfilePage() {
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
      <section className="rounded-[1.5rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <div className="flex items-start gap-4">
          <span className="flex size-16 items-center justify-center rounded-[1.4rem] bg-white/14">
            <UserRound className="size-8" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b9dff6]">Employee Profile</p>
            <h1 className="mt-1 truncate text-2xl font-black tracking-tight">{data.employee.name}</h1>
            <p className="mt-1 text-xs font-semibold text-[#d9effc]">{data.employee.email}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <Trophy className="size-5 text-[#003f78]" />
          <p className="mt-3 text-xl font-black text-[#082033]">{data.employee.totalPoints.toLocaleString("id-ID")}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5d7485]">Total Points</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <ShieldCheck className="size-5 text-[#5a2200]" />
          <p className="mt-3 text-xl font-black text-[#082033]">{data.employee.levelName}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5d7485]">Level</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Work Identity</p>
        <div className="space-y-3 rounded-[1.3rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <div className="flex items-center gap-3">
            <BriefcaseBusiness className="size-4 text-[#003f78]" />
            <div>
              <p className="text-xs font-bold text-[#5d7485]">Role</p>
              <p className="text-sm font-black text-[#082033]">{data.employee.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="size-4 text-[#003f78]" />
            <div>
              <p className="text-xs font-bold text-[#5d7485]">Site</p>
              <p className="text-sm font-black text-[#082033]">{data.site?.name ?? data.employee.workLocation}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge className="border-0 bg-[#e9f6fd] text-[#003f78]">{data.employee.department}</Badge>
            <Badge className="border-0 bg-[#f9eee8] text-[#5a2200]">{data.employee.employeeStatusType}</Badge>
          </div>
        </div>
      </section>
    </div>
  );
}
