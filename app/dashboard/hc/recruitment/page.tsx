import { getRecruitments } from "@/app/actions/recruitment";
import { RecruitmentClientPage } from "./client-page";

export const metadata = {
  title: "Recruitment - HC",
};

export default async function RecruitmentPage() {
  const recruitments = await getRecruitments();
  return <RecruitmentClientPage recruitments={recruitments} />;
}
