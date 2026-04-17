import { RequestCenterBoard } from "@/components/request-center-board";
import { getServerSession } from "@/lib/auth-session";
import { getRequestCenterData } from "@/lib/approval-workspace";

export default async function RequestCenterPage() {
  const session = await getServerSession();
  const data = await getRequestCenterData(session?.user?.email);

  return <RequestCenterBoard data={data} />;
}
