import { getAllTestGroupsAdmin } from "@/app/actions/test-group";
import { getOnlineTests } from "@/app/actions/recruitment-tests";
import { TestGroupsClientPage } from "./client-page";

export const metadata = { title: "Test Groups - HC" };

export default async function TestGroupsPage() {
  const groups = await getAllTestGroupsAdmin();
  const allTests = await getOnlineTests();
  return <TestGroupsClientPage initialGroups={groups} allTests={allTests.filter((t: any) => t.isActive && !t.isApplicationForm)} />;
}
