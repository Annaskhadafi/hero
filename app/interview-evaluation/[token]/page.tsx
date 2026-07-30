import { notFound } from "next/navigation";
import { getInterviewEvaluationByToken, getAvailableInterviewers } from "@/app/actions/interviews";
import { InterviewEvaluationForm } from "@/components/interview/interview-evaluation-form";

export const metadata = {
  title: "Form Penilaian Interview — PT Chitra Paratama",
  description: "Form Penilaian Interview Rekrutmen Berjenjang PT Chitra Paratama (F.HR.STD.010.00)",
};

export default async function InterviewEvaluationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const data = await getInterviewEvaluationByToken(resolvedParams.token);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="max-w-md text-center bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-4">
          <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold">Link Form Tidak Valid / Kedaluwarsa</h2>
          <p className="text-sm text-slate-400">
            Maaf, link penilaian interview ini tidak ditemukan atau sudah tidak berlaku. Silakan hubungi Tim Human Capital PT Chitra Paratama.
          </p>
        </div>
      </div>
    );
  }

  const availableInterviewers = await getAvailableInterviewers();

  return (
    <InterviewEvaluationForm
      token={resolvedParams.token}
      interview={data.interview}
      candidate={data.candidate}
      existingEvaluations={data.existingEvaluations}
      availableInterviewers={availableInterviewers}
    />
  );
}
