import { getCandidateById } from "@/app/actions/recruitment";
import { getCandidateInterviews } from "@/app/actions/interviews";
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

  const [candidate, interviews] = await Promise.all([
    getCandidateById(candidateId),
    getCandidateInterviews(candidateId),
  ]);

  if (!candidate) {
    notFound();
  }

  return (
    <CandidateDetailClientPage
      candidate={candidate as any}
      interviews={interviews}
    />
  );
}
