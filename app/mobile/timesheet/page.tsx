import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { getMobileTimesheet } from "@/lib/mobile-data";
import { MobileTimesheetClient } from "@/components/mobile/mobile-timesheet-client";

export default async function MobileTimesheetPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileTimesheet(session.user.email);
  if (!data) return null;

  return <MobileTimesheetClient data={data} />;
}

