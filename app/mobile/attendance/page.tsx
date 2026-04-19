import type { Metadata } from "next";

import { getAttendancePageData } from "@/app/actions/attendance";

import { MobileAttendanceClient } from "./mobile-attendance-client";

export const metadata: Metadata = {
  title: "Mobile Attendance | HERO",
  description: "Mobile biometric attendance check-in for HERO field operations.",
};

export default async function MobileAttendancePage() {
  const data = await getAttendancePageData();

  return <MobileAttendanceClient data={data} />;
}
