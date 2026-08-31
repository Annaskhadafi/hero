import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SopWinRequestDashboardRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/sop-win/request/${resolvedParams.token}`);
}
