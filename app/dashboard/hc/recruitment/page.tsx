import { getRecruitments, getCandidates, getRecruitmentStats, getRecruitmentFormOptions } from "@/app/actions/recruitment";
import { RecruitmentClientPage } from "./client-page";

export const metadata = {
  title: "Recruitment - HC",
};

export default async function RecruitmentPage() {
  const [recruitments, candidates, stats, formOptions] = await Promise.all([
    getRecruitments(),
    getCandidates(),
    getRecruitmentStats(),
    getRecruitmentFormOptions(),
  ]);

  return (
    <RecruitmentClientPage
      recruitments={recruitments}
      candidates={candidates}
      stats={stats}
      formOptions={formOptions}
    />
  );
}
