import { redirect } from "next/navigation";
import { Camera, Clock3, MapPin, SendHorizontal } from "lucide-react";

import { submitDailyActivityAction } from "@/app/dashboard/activity-hub/actions";
import { Button } from "@/components/ui/button";
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
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Activity Input</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Submit Work Log</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#486275]">
          Form ini terhubung ke workflow activity, approval, point event, dan penalty real di database.
        </p>
      </section>

      <form action={submitDailyActivityAction} className="space-y-4 rounded-[1.35rem] bg-white p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        <input type="hidden" name="employeeId" value={data.employee.id} />

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Source Mode</span>
          <select name="sourceMode" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-bold text-[#082033]">
            <option value="self_input">Self Input</option>
            <option value="assigned">Assigned Activity</option>
            <option value="custom">Custom Activity</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Assignment</span>
          <select name="assignmentId" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-bold text-[#082033]">
            <option value="">Tanpa assignment</option>
            {data.assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.customJobName || assignment.activityName || `Assignment #${assignment.id}`}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Library Activity</span>
          <select name="libraryActivityId" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-bold text-[#082033]">
            <option value="">Pilih aktivitas</option>
            {data.availableLibrary.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.activityCode} · {activity.activityName} ({activity.basePoints} pts)
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Custom Activity Name</span>
          <input name="customActivityName" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-bold text-[#082033]" placeholder="Isi jika memilih custom" />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Custom Description</span>
          <textarea name="customActivityDescription" rows={4} className="w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-bold text-[#082033]" placeholder="Minimal 80 karakter untuk custom activity" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
              <Clock3 className="size-3" />
              Start
            </span>
            <input type="datetime-local" name="startTime" defaultValue={dateTimeLocalValue(defaultStart)} className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-3 text-xs font-bold text-[#082033]" required />
          </label>
          <label className="block space-y-2">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
              <Clock3 className="size-3" />
              End
            </span>
            <input type="datetime-local" name="endTime" defaultValue={dateTimeLocalValue(now)} className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-3 text-xs font-bold text-[#082033]" required />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Equipment / Unit No.</span>
          <input name="equipmentNo" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-bold text-[#082033]" placeholder="DT-451 / BAY-03" />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Material Used</span>
          <input name="materialUsed" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-bold text-[#082033]" placeholder="Patch kit, grease, torque wrench" />
        </label>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Notes</span>
          <textarea name="notes" rows={4} className="w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-bold text-[#082033]" placeholder="Catatan pekerjaan lapangan" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
              <MapPin className="size-3" />
              GPS Lat
            </span>
            <input name="gpsLat" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-3 text-xs font-bold text-[#082033]" placeholder="-0.9123" />
          </label>
          <label className="block space-y-2">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
              <MapPin className="size-3" />
              GPS Lng
            </span>
            <input name="gpsLng" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-3 text-xs font-bold text-[#082033]" placeholder="119.8761" />
          </label>
        </div>

        <input type="hidden" name="gpsValid" value="false" />

        <label className="block space-y-2">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
            <Camera className="size-3" />
            Photo URL
          </span>
          <input name="photoUrl" className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-bold text-[#082033]" placeholder="https://..." />
        </label>

        <Button className="h-14 w-full rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)]">
          <SendHorizontal className="size-4" />
          Submit Activity
        </Button>
      </form>
    </div>
  );
}
