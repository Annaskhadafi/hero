import { redirect } from "next/navigation";

import { MobileApprovalCenter } from "@/components/mobile/mobile-approval-center";
import { getServerSession } from "@/lib/auth-session";
import { getApprovalCenterData } from "@/lib/approval-workspace";

export default async function MobileApprovalPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getApprovalCenterData(session.user.email);

  return <MobileApprovalCenter data={data} />;
}
