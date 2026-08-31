import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSopWinDocumentRequestDetailAction } from "@/app/dashboard/sop-win/actions";
import { SopWinRequestAccessView } from "@/components/sop-win/sop-win-request-access-view";

export const metadata: Metadata = {
  title: "Portal Akses Dokumen SOP / WIN | HERO Platform",
  description: "Portal Resmi Akses Pratinjau Dokumen SOP, WIN, POL PT Chitra Paratama",
};

export const dynamic = "force-dynamic";

export default async function StandaloneSopWinRequestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const { token } = resolvedParams;

  const res = await getSopWinDocumentRequestDetailAction(token);
  if (!res.success || !res.request) {
    notFound();
  }

  const { request, approvals, documentItems, isExpired } = res;

  return (
    <SopWinRequestAccessView
      request={request}
      approvals={approvals || []}
      documentItems={documentItems || []}
      isExpired={isExpired}
    />
  );
}
