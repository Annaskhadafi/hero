import { getRecruitments, getCandidatesPaginated, getRecruitmentStats, getRecruitmentFormOptions } from "@/app/actions/recruitment";
import { RecruitmentClientPage } from "./client-page";

export const metadata = {
  title: "Recruitment - HC",
};

export default async function RecruitmentPage() {
  const [recruitments, candidatesPaginated, stats, formOptions] = await Promise.all([
    getRecruitments(),
    getCandidatesPaginated({ page: 1, pageSize: 25 }),
    getRecruitmentStats(),
    getRecruitmentFormOptions(),
  ]);

  return (
    <RecruitmentClientPage
      recruitments={recruitments}
      initialCandidates={candidatesPaginated}
      stats={stats}
      formOptions={formOptions}
    />
  );
}
