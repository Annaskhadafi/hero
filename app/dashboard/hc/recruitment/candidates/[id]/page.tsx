import { getCandidateById, getCandidateEmailLogs } from "@/app/actions/recruitment";
import { getCandidateInterviews } from "@/app/actions/interviews";
import { getCandidateMcu } from "@/app/actions/mcu";
import { getCandidateTestResults } from "@/app/actions/candidate-tests";
import { CandidateDetailClientPage } from "./client-page";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Candidate Details - HC",
};

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const candidateId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(candidateId)) {
    notFound();
  }

  const [candidate, interviews, mcuRecords, emailLogs, testResults] = await Promise.all([
    getCandidateById(candidateId),
    getCandidateInterviews(candidateId),
    getCandidateMcu(candidateId),
    getCandidateEmailLogs(candidateId),
    getCandidateTestResults(candidateId),
  ]);

  if (!candidate) {
    notFound();
  }

  return (
    <CandidateDetailClientPage
      candidate={candidate as any}
      interviews={interviews}
      mcuRecords={mcuRecords}
      emailLogs={emailLogs}
      testResults={testResults}
    />
  );
}
