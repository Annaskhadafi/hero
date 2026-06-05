import { getOnlineTests } from "@/app/actions/recruitment-tests";
import { RecruitmentTestsClientPage } from "./client-page";

export const metadata = {
  title: "Online Tests - Recruitment",
};

export default async function RecruitmentTestsPage() {
  const tests = await getOnlineTests();

  return <RecruitmentTestsClientPage initialTests={tests} />;
}
