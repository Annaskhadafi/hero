import { redirect } from "next/navigation";

import { submitDailyActivityAction } from "@/app/dashboard/activity-hub/actions";
import { DailyActivitySubmitForm } from "@/components/daily-activity-submit-form";
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

      <DailyActivitySubmitForm
        action={submitDailyActivityAction}
        employeeId={data.employee.id}
        assignments={data.assignments}
        availableLibrary={data.availableLibrary}
        defaultStartTime={dateTimeLocalValue(defaultStart)}
        defaultEndTime={dateTimeLocalValue(now)}
        defaultSourceMode="self_input"
        variant="mobile"
        className="rounded-[1.35rem] bg-white p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]"
      />
    </div>
  );
}
