import { getOnlineTests } from "@/app/actions/recruitment-tests";
import { RecruitmentTestsClientPage } from "./client-page";

export const metadata = {
  title: "Online Tests - Recruitment",
};

import { db } from "@/db";
import { hcOnlineTestGroups } from "@/db/schema/hero";

export default async function RecruitmentTestsPage() {
  const tests = await getOnlineTests();
  const testGroups = await db.select().from(hcOnlineTestGroups);

  return <RecruitmentTestsClientPage initialTests={tests} testGroups={testGroups} />;
}
