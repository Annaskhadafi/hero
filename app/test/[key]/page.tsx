import { getTestByAccessKey } from "@/app/actions/candidate-tests";
import { CandidateTestClientPage } from "./client-page";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Online Assessment - Hero",
};

export default async function CandidateTestPage({ params }: { params: Promise<{ key: string }> }) {
  const resolvedParams = await params;
  const data = await getTestByAccessKey(resolvedParams.key);
  
  if (!data || !data.test || !data.assignment) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <CandidateTestClientPage 
          assignment={data.assignment} 
          test={data.test} 
          questions={data.questions}
          previousAnswers={data.previousAnswers}
          scoreBreakdown={data.scoreBreakdown}
        />
      </div>
    </div>
  );
}
