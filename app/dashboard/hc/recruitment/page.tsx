import { getRecruitments, getCandidatesPaginated, getRecruitmentStats, getRecruitmentFormOptions, getRecruitmentSectionTemplates } from "@/app/actions/recruitment";
import { getActiveMcuClinics } from "@/app/actions/hc-mcu-clinics";
import { RecruitmentClientPage } from "./client-page";

export const metadata = {
  title: "Recruitment - HC",
};

export default async function RecruitmentPage() {
  const [recruitments, candidatesPaginated, stats, formOptions, clinics, sectionTemplates] = await Promise.all([
    getRecruitments(),
    getCandidatesPaginated({ page: 1, pageSize: 25 }),
    getRecruitmentStats(),
    getRecruitmentFormOptions(),
    getActiveMcuClinics(),
    getRecruitmentSectionTemplates(),
  ]);

  return (
    <RecruitmentClientPage
      recruitments={recruitments}
      initialCandidates={candidatesPaginated}
      stats={stats}
      formOptions={formOptions}
      clinics={clinics}
      sectionTemplates={sectionTemplates}
    />
  );
}
