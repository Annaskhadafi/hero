import { getTestWithQuestions, getTestEntries } from "@/app/actions/recruitment-tests";
import { RecruitmentTestDetailsClientPage } from "./client-page";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Test Details - Recruitment",
};

export default async function TestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await getTestWithQuestions(parseInt(resolvedParams.id));
  
  if (!data || !data.test) {
    return notFound();
  }

  const entries = await getTestEntries(data.test.id);

  return <RecruitmentTestDetailsClientPage initialTest={data.test} initialQuestions={data.questions} initialEntries={entries} />;
}
