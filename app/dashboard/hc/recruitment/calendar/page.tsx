import { getAllScheduledInterviews } from "@/app/actions/interviews";
import { getAllScheduledMcus } from "@/app/actions/mcu";
import { RecruitmentCalendarClientPage } from "./client-page";

export const metadata = {
  title: "Recruitment Calendar - HC",
};

export default async function RecruitmentCalendarPage() {
  const [interviews, mcus] = await Promise.all([
    getAllScheduledInterviews(),
    getAllScheduledMcus(),
  ]);

  return (
    <RecruitmentCalendarClientPage
      interviews={interviews}
      mcus={mcus}
    />
  );
}
