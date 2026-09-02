import { redirect } from "next/navigation";

import { MobileApprovalCenter } from "@/components/mobile/mobile-approval-center";
import { getServerSession } from "@/lib/auth-session";
import { getApprovalCenterData } from "@/lib/approval-workspace";

export default async function MobileApprovalPage() {
  const session = await getServerSession();
  const email = session?.user?.email || "chitra.operation.hero@gmail.com";
  const data = await getApprovalCenterData(email);

  return <MobileApprovalCenter data={data} />;
}
