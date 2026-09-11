import { RequestCenterBoard } from "@/components/request-center-board";
import { getServerSession } from "@/lib/auth-session";
import { getRequestCenterData } from "@/lib/approval-workspace";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { redirect } from "next/navigation";

export default async function RequestCenterPage() {
  const access = await getCurrentMenuPermission("request_center");
  if (!access.canView) {
    redirect("/dashboard");
  }

  const session = await getServerSession();
  const data = await getRequestCenterData(session?.user?.email);

  return <RequestCenterBoard data={data} />;
}
