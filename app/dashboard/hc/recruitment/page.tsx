import {
  getRecruitments,
  getCandidates,
  getRecruitmentStats,
} from "@/app/actions/recruitment";
import { RecruitmentClientPage } from "./client-page";

export const metadata = {
  title: "Recruitment - HC",
};

export default async function RecruitmentPage() {
  const [recruitments, candidates, stats] = await Promise.all([
    getRecruitments(),
    getCandidates(),
    getRecruitmentStats(),
  ]);

  return (
    <RecruitmentClientPage
      recruitments={recruitments}
      candidates={candidates}
      stats={stats}
    />
  );
}
