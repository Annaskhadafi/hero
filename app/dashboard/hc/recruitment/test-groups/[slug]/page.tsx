import { getTestGroupEntries } from "@/app/actions/test-group";
import { notFound } from "next/navigation";
import { TestGroupResultsClientPage } from "./client-page";

export const metadata = {
  title: "Test Group Results - Recruitment",
};

export default async function TestGroupResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const data = await getTestGroupEntries(resolvedParams.slug);

  if (!data || !data.group) {
    notFound();
  }

  return <TestGroupResultsClientPage group={data.group} testHeaders={data.testHeaders} entries={data.entries} />;
}
